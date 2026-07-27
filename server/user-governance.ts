export const USER_ROLES = ["super_admin", "admin", "editor", "writer", "viewer", "user"] as const;
export type UserRole = typeof USER_ROLES[number];

export const ACCOUNT_STATUSES = [
  "pending_verification", "active", "suspended", "disabled", "locked", "deleted",
] as const;
export type AccountStatus = typeof ACCOUNT_STATUSES[number];

export const APP_ENVIRONMENTS = ["production", "staging", "development", "test"] as const;
export type AppEnvironment = typeof APP_ENVIRONMENTS[number];

const testEmailPattern = /(?:@example\.test$|@training_|(?:^|[+._-])(e2e|training|playwright|cypress|test[-_]?user|test[-_]?admin|test[-_]?student|seed|demo)(?:[+._@-]|$))/i;
const reservedUsernamePattern = /^(?:e2e|training|playwright|cypress|test[-_]?user|test[-_]?admin|test[-_]?student|seed|demo)[_.-]/i;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const normalizeUsername = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/^@+/, "")
  .replace(/\s+/g, "_")
  .replace(/[^a-z0-9_.-]/g, "")
  .replace(/[_.-]{2,}/g, "_")
  .replace(/^[_.-]+|[_.-]+$/g, "");

export const isTestIdentity = (email: string, username: string) =>
  testEmailPattern.test(normalizeEmail(email)) || reservedUsernamePattern.test(normalizeUsername(username));

export const assertProductionIdentity = (email: string, username: string, appEnv: AppEnvironment) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername || !/^[a-z0-9][a-z0-9_.-]*$/.test(normalizedUsername)) {
    throw new Error("Username must contain only lowercase letters, numbers, underscores, periods, or hyphens");
  }
  if (appEnv === "production" && isTestIdentity(normalizedEmail, normalizedUsername)) {
    throw new Error("Test or training identities are not allowed in production");
  }
  return { email: normalizedEmail, username: normalizedUsername };
};

const databaseIdentity = (value: string) => {
  const parsed = new URL(value);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}${parsed.pathname.toLowerCase()}`;
};

export const assertTestDatabaseIsolation = (testUrl?: string, productionUrl?: string) => {
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required for automated tests");
  if (productionUrl && databaseIdentity(testUrl) === databaseIdentity(productionUrl)) {
    throw new Error("TEST_DATABASE_URL must not point to the production database");
  }
};

export const normalizeRole = (value: string): UserRole => {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "legacy_admin") return "admin";
  if (normalized === "legacy_editor") return "editor";
  return (USER_ROLES as readonly string[]).includes(normalized) ? normalized as UserRole : "user";
};
