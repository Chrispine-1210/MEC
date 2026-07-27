const placeholderTokens = new Set([
  "host",
  "hostname",
  "user",
  "username",
  "password",
  "database",
  "example.com",
]);

const containsPlaceholderText = (value: string) =>
  /(placeholder|changeme|change-me|replace[-_ ]?with|your[-_])/i.test(value);

export const isUsableDatabaseUrl = (value: string | undefined): value is string => {
  const candidate = value?.trim();
  if (!candidate || containsPlaceholderText(candidate)) return false;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") return false;

    const hostname = parsed.hostname.trim().toLowerCase();
    const username = decodeURIComponent(parsed.username).trim().toLowerCase();
    const password = decodeURIComponent(parsed.password).trim().toLowerCase();
    const database = parsed.pathname.replace(/^\/+/, "").trim().toLowerCase();

    return Boolean(
      hostname &&
        !placeholderTokens.has(hostname) &&
        !placeholderTokens.has(username) &&
        !placeholderTokens.has(password) &&
        !placeholderTokens.has(database),
    );
  } catch {
    return false;
  }
};

export const selectDatabaseUrl = (candidates: Array<[string, string | undefined]>) =>
  candidates.find(([, value]) => isUsableDatabaseUrl(value)) || [];
