import "dotenv/config";
import { z } from "zod";

const toBooleanFromEnv = (value: string) =>
  ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  REDIS_URL: z.string().optional(),
  METRICS_PATH: z.string().min(1).default("/metrics"),
  MFA_REQUIRED_ROLES: z.string().default("admin,super_admin"),
  MFA_ENCRYPTION_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SKIP_DB_SCHEMA_BOOTSTRAP: z
    .string()
    .optional()
    .default("0")
    .transform((value) => toBooleanFromEnv(value)),
});

export const env = envSchema.parse(process.env);
