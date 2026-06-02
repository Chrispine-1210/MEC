const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;
const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
};

const isLocalHostname = (hostname: string) =>
  localHostnames.has(hostname) || hostname.endsWith(".localhost");

const truthyEnvValues = new Set(["1", "true", "yes", "on"]);

const isTruthyEnvValue = (value?: string) => truthyEnvValues.has(value?.trim().toLowerCase() ?? "");

const shouldUseViteProxy = (configuredOrigin: string) => {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  if (!isLocalHostname(window.location.hostname)) return false;

  try {
    return !isLocalHostname(new URL(configuredOrigin).hostname);
  } catch {
    return false;
  }
};

export function getApiOrigin() {
  const configuredOrigin = import.meta.env.VITE_API_URL?.trim();
  if (!configuredOrigin) return "";

  const normalizedOrigin = normalizeOrigin(configuredOrigin);
  return shouldUseViteProxy(normalizedOrigin) ? "" : normalizedOrigin;
}

export function isRealtimeEnabled() {
  const configuredValue = import.meta.env.VITE_REALTIME_ENABLED?.trim();
  if (configuredValue) return isTruthyEnvValue(configuredValue);
  return import.meta.env.MODE !== "production";
}

export function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") return input;
  if (!input.startsWith("/") || absoluteUrlPattern.test(input)) return input;

  const apiOrigin = getApiOrigin();
  if (apiOrigin) return `${apiOrigin}${input}`;

  return input;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const resolvedInput = resolveApiUrl(input);

  try {
    return await fetch(resolvedInput, init);
  } catch (error) {
    if (
      typeof input === "string" &&
      input.startsWith("/") &&
      resolvedInput !== input &&
      !absoluteUrlPattern.test(input)
    ) {
      return fetch(input, init);
    }

    throw error;
  }
}

export function resolveWebSocketUrl(path = "/ws", token?: string | null) {
  const apiOrigin = getApiOrigin();
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const baseOrigin = apiOrigin || browserOrigin;

  if (!baseOrigin) {
    throw new Error("Unable to resolve WebSocket origin");
  }

  const url = new URL(path, baseOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
}
