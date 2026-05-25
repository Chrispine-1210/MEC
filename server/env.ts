import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true, quiet: true });

const optionalEnvString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const optionalEnvBoolean = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return value;
}, z.boolean().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: optionalEnvString,
  PORT: z.coerce.number().int().positive().default(5000),
  ADMIN_PORT: z.coerce.number().int().positive().default(5174),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PUBLIC_APP_URL: optionalEnvString,
  FRONTEND_URL: optionalEnvString,
  ADMIN_APP_URL: optionalEnvString,
  CORS_ORIGIN: optionalEnvString,
  CORS_ORIGINS: optionalEnvString,
  ALLOWED_ORIGINS: optionalEnvString,
  VITE_SITE_URL: optionalEnvString,
  VITE_API_URL: optionalEnvString,
  EMAIL_FROM: optionalEnvString,
  EMAIL_API_URL: optionalEnvString,
  EMAIL_API_KEY: optionalEnvString,
  ADMIN_NOTIFICATION_EMAIL: optionalEnvString,
  REDIS_URL: optionalEnvString,
  SENTRY_DSN: optionalEnvString,
  SENTRY_ENVIRONMENT: optionalEnvString,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  STRIPE_SECRET_KEY: optionalEnvString,
  STRIPE_WEBHOOK_SECRET: optionalEnvString,
  STRIPE_DEFAULT_CURRENCY: z.string().length(3).default("USD"),
  REFERRAL_PAYOUT_MIN_AMOUNT: z.coerce.number().int().positive().default(2500),
  REFERRAL_RELEASE_WORKER_ENABLED: optionalEnvBoolean,
  REFERRAL_RELEASE_WORKER_MS: z.coerce.number().int().positive().default(900_000),
});

export const env = envSchema.parse(process.env);
