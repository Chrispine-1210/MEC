import { pool } from "./db";

const runtimeSchemaSql = `
CREATE TABLE IF NOT EXISTS "subscribers" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" varchar(255) NOT NULL,
  "name" text,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "preferences" jsonb,
  "source" varchar(80) DEFAULT 'website',
  "verification_token" text,
  "unsubscribe_token" text,
  "verified_at" timestamp,
  "unsubscribed_at" timestamp,
  "last_email_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);

ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "email" varchar(255);
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "status" varchar(40) DEFAULT 'pending' NOT NULL;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "preferences" jsonb;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "source" varchar(80) DEFAULT 'website';
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "verification_token" text;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "unsubscribe_token" text;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "unsubscribed_at" timestamp;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "last_email_at" timestamp;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_accepted" boolean DEFAULT false;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_source" varchar(120);
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_ip_address" varchar(45);
ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_user_agent" text;

CREATE INDEX IF NOT EXISTS "subscribers_status_created_idx"
  ON "subscribers" ("status", "created_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_verification_token_unique_idx"
  ON "subscribers" ("verification_token")
  WHERE "verification_token" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_unsubscribe_token_unique_idx"
  ON "subscribers" ("unsubscribe_token")
  WHERE "unsubscribe_token" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "email" varchar(255) NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "jwt_id" varchar(80) NOT NULL,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "request_ip_address" varchar(45),
  "request_user_agent" text,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "replaced_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_hash_idx"
  ON "email_verification_tokens" ("token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_jti_idx"
  ON "email_verification_tokens" ("jwt_id");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_status_idx"
  ON "email_verification_tokens" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_email_created_idx"
  ON "email_verification_tokens" ("email", "created_at");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_expiry_idx"
  ON "email_verification_tokens" ("expires_at");

CREATE TABLE IF NOT EXISTS "email_jobs" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "category" varchar(100) NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "subject" text NOT NULL,
  "payload" jsonb NOT NULL,
  "metadata" jsonb,
  "status" varchar(40) DEFAULT 'queued' NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "provider" varchar(40),
  "provider_message_id" text,
  "scheduled_for" timestamp DEFAULT now() NOT NULL,
  "processing_at" timestamp,
  "sent_at" timestamp,
  "failed_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "email_jobs_status_schedule_idx"
  ON "email_jobs" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "email_jobs_category_status_idx"
  ON "email_jobs" ("category", "status");
CREATE INDEX IF NOT EXISTS "email_jobs_recipient_idx"
  ON "email_jobs" ("recipient");
CREATE INDEX IF NOT EXISTS "email_jobs_provider_message_idx"
  ON "email_jobs" ("provider_message_id");

CREATE TABLE IF NOT EXISTS "email_delivery_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "job_id" varchar(36),
  "provider" varchar(40),
  "event_type" varchar(80) NOT NULL,
  "recipient" varchar(255),
  "category" varchar(100),
  "provider_message_id" text,
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "email_delivery_events_job_idx"
  ON "email_delivery_events" ("job_id");
CREATE INDEX IF NOT EXISTS "email_delivery_events_type_created_idx"
  ON "email_delivery_events" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "email_delivery_events_category_created_idx"
  ON "email_delivery_events" ("category", "created_at");
CREATE INDEX IF NOT EXISTS "email_delivery_events_provider_message_idx"
  ON "email_delivery_events" ("provider_message_id");

CREATE TABLE IF NOT EXISTS "email_preferences" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "email" varchar(255) NOT NULL,
  "categories" jsonb NOT NULL,
  "consent_status" varchar(40) DEFAULT 'pending' NOT NULL,
  "consent_source" varchar(120),
  "consent_at" timestamp,
  "unsubscribed_at" timestamp,
  "unsubscribe_token_hash" varchar(128) NOT NULL,
  "audit_trail" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_preferences_email_idx"
  ON "email_preferences" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "email_preferences_token_hash_idx"
  ON "email_preferences" ("unsubscribe_token_hash");
CREATE INDEX IF NOT EXISTS "email_preferences_user_idx"
  ON "email_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "email_preferences_status_idx"
  ON "email_preferences" ("consent_status");
`;

let schemaReady: Promise<void> | null = null;

export const ensureRuntimeDatabaseSchema = () => {
  schemaReady ??= pool.query(runtimeSchemaSql).then(() => undefined);
  return schemaReady;
};
