import "dotenv/config"; // must be first
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 25) {
  throw new Error(
    `Unsupported Node.js runtime ${process.versions.node}. Use Node 20 or 22 LTS for this project.`,
  );
}

if (nodeMajor >= 24) {
  console.warn(
    `[db] Node.js ${process.versions.node} is newer than the supported LTS range for this stack. ` +
      "Use Node 20 or 22 LTS if Neon WebSocket connections behave unexpectedly.",
  );
}

neonConfig.webSocketConstructor = ws;
const isDevelopment = process.env.NODE_ENV !== "production";
const isVercelRuntime = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const isUsableConnectionString = (value: string | undefined) =>
  Boolean(
    value?.trim() &&
      /^postgres(?:ql)?:\/\//i.test(value.trim()) &&
      !/(placeholder|changeme|change-me|example|your_)/i.test(value),
  );

const databaseUrlCandidates: Array<[string, string | undefined]> = [
  ...(isDevelopment
    ? [
        ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED] as [string, string | undefined],
        ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING] as [string, string | undefined],
        ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL] as [string, string | undefined],
      ]
    : []),
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["POSTGRES_URL", process.env.POSTGRES_URL],
  ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
  ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
  ["POSTGRES_URL_NO_SSL", process.env.POSTGRES_URL_NO_SSL],
];

const [connectionStringSource, connectionString] =
  databaseUrlCandidates.find(([, value]) => isUsableConnectionString(value)) || [];

if (!connectionString) {
  throw new Error("DATABASE_URL or a compatible POSTGRES_URL is required to start the server.");
}

export const databaseConnectionSource = connectionStringSource;
const poolMaxConnections = isDevelopment ? 5 : isVercelRuntime ? 1 : 10;

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: poolMaxConnections,
});

pool.on("error", (error: unknown) => {
  const code = String(getNestedErrorValue(error, "code") || "unknown");
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[db] Recovered idle database connection error (${code}): ${message}`);
});

export const db = drizzle({ client: pool, schema });

const getNestedErrorValue = (error: unknown, key: string) => {
  const direct = error && typeof error === "object" && key in error ? (error as Record<string, unknown>)[key] : undefined;
  if (direct) return direct;

  const cause =
    error && typeof error === "object" && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  return cause && typeof cause === "object" && key in cause
    ? (cause as Record<string, unknown>)[key]
    : undefined;
};

const classifyDatabaseError = (error: unknown) => {
  const code = String(getNestedErrorValue(error, "code") || "");
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const causeMessage = String(getNestedErrorValue(error, "message") || "").toLowerCase();
  const combined = `${message} ${causeMessage}`;

  if (code === "42P01" || combined.includes("does not exist")) return "schema_missing";
  if (code === "28P01" || combined.includes("password authentication failed")) return "authentication_failed";
  if (code === "3D000" || combined.includes("database") && combined.includes("does not exist")) return "database_missing";
  if (combined.includes("timeout") || combined.includes("fetch failed")) return "connectivity_failed";
  return code || "query_failed";
};

export const getDatabaseDiagnostics = async () => {
  try {
    await pool.query("select 1");
    return {
      ready: true,
      source: databaseConnectionSource,
      error: null,
    };
  } catch (error) {
    return {
      ready: false,
      source: databaseConnectionSource,
      error: {
        code: String(getNestedErrorValue(error, "code") || ""),
        type: classifyDatabaseError(error),
      },
    };
  }
};
