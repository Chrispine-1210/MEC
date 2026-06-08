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

CREATE TABLE IF NOT EXISTS "communication_events" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "event_type" varchar(120) NOT NULL,
  "source" varchar(40) NOT NULL,
  "user_id" integer,
  "priority" varchar(20) DEFAULT 'medium' NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(40) DEFAULT 'received' NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "communication_events_type_created_idx"
  ON "communication_events" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "communication_events_source_created_idx"
  ON "communication_events" ("source", "created_at");
CREATE INDEX IF NOT EXISTS "communication_events_status_created_idx"
  ON "communication_events" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "communication_events_user_created_idx"
  ON "communication_events" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "communication_messages" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "event_id" varchar(36),
  "event_type" varchar(120) NOT NULL,
  "channel" varchar(30) NOT NULL,
  "template_id" varchar(120),
  "recipient" varchar(255),
  "subject" text,
  "status" varchar(60) NOT NULL,
  "priority" varchar(20) DEFAULT 'medium' NOT NULL,
  "provider" varchar(40),
  "provider_message_id" text,
  "metadata" jsonb,
  "diagnostics" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "communication_messages_event_idx"
  ON "communication_messages" ("event_id");
CREATE INDEX IF NOT EXISTS "communication_messages_type_created_idx"
  ON "communication_messages" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "communication_messages_status_channel_idx"
  ON "communication_messages" ("status", "channel");
CREATE INDEX IF NOT EXISTS "communication_messages_recipient_idx"
  ON "communication_messages" ("recipient");
CREATE INDEX IF NOT EXISTS "communication_messages_provider_message_idx"
  ON "communication_messages" ("provider_message_id");

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

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mfa_confirmed_at" timestamp;

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "session_hash" varchar(128) NOT NULL,
  "device" text,
  "ip_address" varchar(45),
  "user_agent" text,
  "status" varchar(40) DEFAULT 'active' NOT NULL,
  "last_seen_at" timestamp DEFAULT now(),
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_hash_idx"
  ON "user_sessions" ("session_hash");
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx"
  ON "user_sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "permission_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" integer,
  "target_user_id" integer,
  "role_id" varchar(120),
  "permission" varchar(120),
  "action" varchar(80) NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "permission_audit_actor_idx"
  ON "permission_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "permission_audit_target_idx"
  ON "permission_audit_logs" ("target_user_id");
`;

let schemaReady: Promise<void> | null = null;

export const ensureRuntimeDatabaseSchema = () => {
  schemaReady ??= pool.query(runtimeSchemaSql).then(() => undefined);
  return schemaReady;
};
