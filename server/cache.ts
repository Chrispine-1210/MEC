import { env } from "./env";

type MemoryCacheEntry = {
  value: string;
  expiresAt: number | null;
};

type RedisClientLike = {
  connect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<unknown>;
  del: (key: string) => Promise<number>;
  quit: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

const memoryStore = new Map<string, MemoryCacheEntry>();

let redisClient: RedisClientLike | null = null;
let cacheMode: "memory" | "redis" = "memory";
const REDIS_CONNECT_TIMEOUT_MS = 2000;
let redisRuntimeErrorLogged = false;

const getErrorField = (error: unknown, field: string) => {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return undefined;
  }
  const value = (error as Record<string, unknown>)[field];
  return value === undefined || value === null ? undefined : String(value);
};

const summarizeRedisError = (error: unknown) => {
  const errors =
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
      ? (error as { errors: unknown[] }).errors
      : [error];

  const codes = new Set<string>();
  const targets = new Set<string>();

  for (const item of errors) {
    const code = getErrorField(item, "code");
    const address = getErrorField(item, "address");
    const port = getErrorField(item, "port");
    if (code) codes.add(code);
    if (address && port) targets.add(`${address}:${port}`);
  }

  const summary = [
    codes.size ? Array.from(codes).join(", ") : undefined,
    targets.size ? `at ${Array.from(targets).join(", ")}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return summary || (error instanceof Error ? error.message : String(error));
};

const readFromMemory = (key: string) => {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const writeToMemory = (key: string, value: string, ttlSeconds?: number) => {
  const expiresAt =
    typeof ttlSeconds === "number" && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value, expiresAt });
};

export const initializeCache = async () => {
  if (!env.REDIS_URL) {
    cacheMode = "memory";
    return;
  }

  let pendingClient: RedisClientLike | null = null;

  try {
    const redisModuleName = "redis";
    const redisModule = (await import(redisModuleName)) as {
      createClient: (options: {
        url: string;
        socket?: {
          connectTimeout?: number;
          reconnectStrategy?: false | ((retries: number) => false | number);
        };
      }) => RedisClientLike;
    };
    const client = redisModule.createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: false,
      },
    });
    pendingClient = client;

    let isInitialConnection = true;
    client.on("error", (error) => {
      if (isInitialConnection) {
        return;
      }

      if (!redisRuntimeErrorLogged) {
        redisRuntimeErrorLogged = true;
        console.warn(
          `Redis cache error (${summarizeRedisError(error)}). Continuing with in-memory cache fallback.`,
        );
      }
      cacheMode = "memory";
    });

    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out")), REDIS_CONNECT_TIMEOUT_MS),
      ),
    ]);
    isInitialConnection = false;
    redisClient = client;
    cacheMode = "redis";
  } catch (error) {
    if (pendingClient) {
      try {
        await pendingClient.quit();
      } catch {
        // Ignore cleanup errors after a failed Redis startup attempt.
      }
    }
    cacheMode = "memory";
    console.warn(
      `Redis was configured but unavailable (${summarizeRedisError(error)}). Falling back to in-memory cache.`,
    );
  }
};

export const closeCache = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    // Ignore shutdown errors in graceful termination.
  } finally {
    redisClient = null;
    cacheMode = "memory";
  }
};

export const getCacheMode = () => cacheMode;

export const cacheGet = async (key: string) => {
  if (cacheMode === "redis" && redisClient) {
    try {
      return await redisClient.get(key);
    } catch {
      return null;
    }
  }
  return readFromMemory(key);
};

export const cacheSet = async (key: string, value: string, ttlSeconds?: number) => {
  if (cacheMode === "redis" && redisClient) {
    try {
      if (typeof ttlSeconds === "number" && ttlSeconds > 0) {
        await redisClient.set(key, value, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
      return;
    } catch {
      // Fallback to memory when Redis write fails.
    }
  }
  writeToMemory(key, value, ttlSeconds);
};

export const cacheDelete = async (key: string) => {
  if (cacheMode === "redis" && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch {
      // Continue to memory delete fallback.
    }
  }
  memoryStore.delete(key);
};

export const cacheGetJson = async <T>(key: string): Promise<T | null> => {
  const value = await cacheGet(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const cacheSetJson = async <T>(key: string, value: T, ttlSeconds?: number) => {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
};
