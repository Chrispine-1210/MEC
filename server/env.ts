import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  ADMIN_PORT: z.coerce.number().int().positive().default(5174),
  FRONTEND_URL: z.string().url().optional(),
  VITE_SITE_URL: z.string().url().optional(),
  VITE_API_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  REFERRAL_RELEASE_WORKER_ENABLED: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") return undefined;
      return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    }),
});

export const env = envSchema.parse(process.env);
