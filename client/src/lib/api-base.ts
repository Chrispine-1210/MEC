const absoluteUrlPattern = /^[a-z][a-z\d+\-.]*:/i;

export function getApiOrigin() {
  const configuredOrigin = import.meta.env.VITE_API_URL?.trim();
  if (!configuredOrigin) return "";

  try {
    return new URL(configuredOrigin).origin;
  } catch {
    return configuredOrigin.replace(/\/+$/, "");
  }
}

export function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") return input;
  if (!input.startsWith("/") || absoluteUrlPattern.test(input)) return input;

  const apiOrigin = getApiOrigin();
  return apiOrigin ? `${apiOrigin}${input}` : input;
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
