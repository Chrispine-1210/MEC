import "dotenv/config";
import { z } from "zod";

const optionalEnvString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  PUBLIC_APP_URL: optionalEnvString,
  FRONTEND_URL: optionalEnvString,
  ADMIN_APP_URL: optionalEnvString,
  CORS_ORIGIN: optionalEnvString,
  CORS_ORIGINS: optionalEnvString,
  VITE_SITE_URL: optionalEnvString,
  VITE_API_URL: optionalEnvString,
  EMAIL_FROM: optionalEnvString,
  EMAIL_API_URL: optionalEnvString,
  EMAIL_API_KEY: optionalEnvString,
  ADMIN_NOTIFICATION_EMAIL: optionalEnvString,
  STRIPE_SECRET_KEY: optionalEnvString,
  STRIPE_WEBHOOK_SECRET: optionalEnvString,
  STRIPE_DEFAULT_CURRENCY: z.string().length(3).default("USD"),
  REFERRAL_PAYOUT_MIN_AMOUNT: z.coerce.number().int().positive().default(2500),
  REFERRAL_RELEASE_WORKER_MS: z.coerce.number().int().positive().default(900_000),
});

export const env = envSchema.parse(process.env);
