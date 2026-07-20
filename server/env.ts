import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

const nodeEnv = process.env.NODE_ENV || "development";
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), `.env.${nodeEnv}`), override: true, quiet: true });

const optionalEnvString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().optional(),
);

const requiredEnvString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1, "JWT_SECRET is required"),
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
  JWT_SECRET: requiredEnvString,
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  ADMIN_HMAC_SECRET: optionalEnvString,
  ADMIN_HMAC_REQUIRED: optionalEnvBoolean,
  ADMIN_HMAC_MAX_SKEW_MS: z.coerce.number().int().positive().default(300_000),
  MFA_ENCRYPTION_KEY: optionalEnvString,
  PUBLIC_APP_URL: optionalEnvString,
  FRONTEND_URL: optionalEnvString,
  ADMIN_APP_URL: optionalEnvString,
  API_APP_URL: optionalEnvString,
  CORS_ORIGIN: optionalEnvString,
  CORS_ORIGINS: optionalEnvString,
  ALLOWED_ORIGINS: optionalEnvString,
  VITE_SITE_URL: optionalEnvString,
  VITE_API_URL: optionalEnvString,
  EMAIL_FROM: optionalEnvString,
  EMAIL_API_URL: optionalEnvString,
  EMAIL_API_KEY: optionalEnvString,
  EMAIL_PROVIDER_ORDER: optionalEnvString,
  EMAIL_QUEUE_WORKER_ENABLED: optionalEnvBoolean,
  EMAIL_QUEUE_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  EMAIL_PROVIDER_INLINE_RETRIES: z.coerce.number().int().min(1).max(5).default(2),
  EMAIL_PROVIDER_CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().min(1).max(20).default(3),
  EMAIL_PROVIDER_CIRCUIT_COOLDOWN_MS: z.coerce.number().int().positive().default(120_000),
  EMAIL_SOFT_BOUNCE_SUPPRESSION_THRESHOLD: z.coerce.number().int().min(2).max(20).default(3),
  EMAIL_DRY_RUN: optionalEnvBoolean,
  EMAIL_ALLOW_LIVE_TEST_SENDS: optionalEnvBoolean,
  EMAIL_ACTIVATION_REQUIRES_DNS_READY: optionalEnvBoolean,
  EMAIL_TRACKING_SECRET: optionalEnvString,
  EMAIL_LINK_BASE_URL: optionalEnvString,
  EMAIL_WEBHOOK_SIGNING_SECRET: optionalEnvString,
  EMAIL_WEBHOOK_DEDUP_TTL_MS: z.coerce.number().int().positive().default(24 * 60 * 60 * 1000),
  ADMIN_VIEWER_EMAILS: optionalEnvString,
  ADMIN_WRITER_EMAILS: optionalEnvString,
  ADMIN_EDITOR_EMAILS: optionalEnvString,
  ADMIN_ADMIN_EMAILS: optionalEnvString,
  ADMIN_SUPER_ADMIN_EMAILS: optionalEnvString,
  E2E_TEST_SECRET: optionalEnvString,
  METRICS_SECRET: optionalEnvString,
  CRON_SECRET: optionalEnvString,
  SMS_API_URL: optionalEnvString,
  SMS_API_KEY: optionalEnvString,
  SMS_API_FROM: optionalEnvString,
  WHATSAPP_API_URL: optionalEnvString,
  WHATSAPP_API_KEY: optionalEnvString,
  WHATSAPP_API_FROM: optionalEnvString,
  TWILIO_ACCOUNT_SID: optionalEnvString,
  TWILIO_AUTH_TOKEN: optionalEnvString,
  TWILIO_SMS_FROM: optionalEnvString,
  TWILIO_WHATSAPP_FROM: optionalEnvString,
  WHATSAPP_CLOUD_ACCESS_TOKEN: optionalEnvString,
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: optionalEnvString,
  COMMUNICATION_DOCUMENT_LINK_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SENDGRID_TRACKING_ENABLED: optionalEnvBoolean,
  RESEND_API_KEY: optionalEnvString,
  RESEND_DOMAIN: optionalEnvString,
  SENDGRID_API_KEY: optionalEnvString,
  SMTP_HOST: optionalEnvString,
  SMTP_USER: optionalEnvString,
  SMTP_PASSWORD: optionalEnvString,
  SMTP_PORT: optionalEnvString,
  SMTP_SECURE: optionalEnvBoolean,
  SMTP_REQUIRE_TLS: optionalEnvBoolean,
  POSTMARK_SERVER_TOKEN: optionalEnvString,
  POSTMARK_MESSAGE_STREAM: optionalEnvString,
  MAILGUN_API_KEY: optionalEnvString,
  MAILGUN_DOMAIN: optionalEnvString,
  MAILGUN_BASE_URL: optionalEnvString,
  AWS_SES_REGION: optionalEnvString,
  AWS_SES_ACCESS_KEY_ID: optionalEnvString,
  AWS_SES_SECRET_ACCESS_KEY: optionalEnvString,
  AWS_SES_CONFIGURATION_SET: optionalEnvString,
  ADMIN_NOTIFICATION_EMAIL: optionalEnvString,
  ADMIN_NOTIFICATION_PHONE: optionalEnvString,
  BOT_DEFENSE_ENABLED: optionalEnvBoolean,
  BOT_DEFENSE_RECAPTCHA_REQUIRED: optionalEnvBoolean,
  BOT_DEFENSE_RECAPTCHA_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  BOT_DEFENSE_RECAPTCHA_MAX_TOKEN_AGE_MS: z.coerce.number().int().positive().default(120_000),
  BOT_DEFENSE_RECAPTCHA_ALLOWED_HOSTNAMES: optionalEnvString,
  BOT_DEFENSE_THREAT_IP_BLOCKLIST: optionalEnvString,
  BOT_DEFENSE_COUNTRY_BLOCKLIST: optionalEnvString,
  BOT_DEFENSE_COUNTRY_CHALLENGE: optionalEnvString,
  RECAPTCHA_SECRET_KEY: optionalEnvString,
  REDIS_URL: optionalEnvString,
  SENTRY_DSN: optionalEnvString,
  SENTRY_ENVIRONMENT: optionalEnvString,
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
  PAYMENTS_ENABLED: optionalEnvBoolean,
  STRIPE_SECRET_KEY: optionalEnvString,
  STRIPE_WEBHOOK_SECRET: optionalEnvString,
  STRIPE_WEBHOOK_URL: optionalEnvString,
  STRIPE_DEFAULT_CURRENCY: z.string().length(3).default("USD"),
  STRIPE_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(60_000).default(20_000),
  PAYMENT_APPLICATION_SUPPORT_AMOUNT: z.coerce.number().int().min(50).default(5_000),
  PAYMENT_APPLICATION_SUPPORT_CURRENCY: z.string().length(3).default("USD"),
  REFERRAL_PAYOUT_MIN_AMOUNT: z.coerce.number().int().positive().default(2500),
  REFERRAL_RELEASE_WORKER_ENABLED: optionalEnvBoolean,
  REFERRAL_RELEASE_WORKER_MS: z.coerce.number().int().positive().default(900_000),
  AI_CHAT_ENABLED: optionalEnvBoolean,
  OPENAI_API_KEY: optionalEnvString,
  OPENAI_MODEL: z.string().trim().min(1).default("gpt-4o-mini"),
  OPENAI_FALLBACK_MODEL: optionalEnvString,
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(60_000).default(25_000),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(100).max(4_000).default(700),
  OPENAI_INPUT_COST_PER_MILLION_USD: z.coerce.number().min(0).max(10_000).default(0),
  OPENAI_OUTPUT_COST_PER_MILLION_USD: z.coerce.number().min(0).max(10_000).default(0),
  AI_CHAT_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(90),
  AI_CHAT_AUTHENTICATED_REQUESTS_PER_HOUR: z.coerce.number().int().min(1).max(500).default(60),
  AI_CHAT_ANONYMOUS_REQUESTS_PER_HOUR: z.coerce.number().int().min(1).max(100).default(15),
  AI_CHAT_DAILY_TOKEN_LIMIT: z.coerce.number().int().min(1_000).max(10_000_000).default(100_000),
  AI_CHAT_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1_800),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === "production" && parsedEnv.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}

export const env = parsedEnv;
