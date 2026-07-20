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
  "provider_event_id" text,
  "metadata" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE "email_delivery_events" ADD COLUMN IF NOT EXISTS "provider_event_id" text;

CREATE INDEX IF NOT EXISTS "email_delivery_events_job_idx"
  ON "email_delivery_events" ("job_id");
CREATE INDEX IF NOT EXISTS "email_delivery_events_type_created_idx"
  ON "email_delivery_events" ("event_type", "created_at");
CREATE INDEX IF NOT EXISTS "email_delivery_events_category_created_idx"
  ON "email_delivery_events" ("category", "created_at");
CREATE INDEX IF NOT EXISTS "email_delivery_events_provider_message_idx"
  ON "email_delivery_events" ("provider_message_id");
CREATE UNIQUE INDEX IF NOT EXISTS "email_delivery_events_provider_event_unique_idx"
  ON "email_delivery_events" ("provider", "provider_event_id")
  WHERE "provider_event_id" IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS "communication_template_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "template_id" varchar(120) NOT NULL,
  "type" varchar(30) NOT NULL,
  "event_trigger" varchar(120) NOT NULL,
  "category" varchar(80) DEFAULT 'system' NOT NULL,
  "language" varchar(12) DEFAULT 'en' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "status" varchar(40) DEFAULT 'draft' NOT NULL,
  "subject" text,
  "title" text,
  "preheader" text,
  "body" text NOT NULL,
  "variables" jsonb,
  "defaults" jsonb,
  "quality" jsonb,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "communication_template_versions_template_version_idx"
  ON "communication_template_versions" ("template_id", "version");
CREATE INDEX IF NOT EXISTS "communication_template_versions_template_status_idx"
  ON "communication_template_versions" ("template_id", "status");
CREATE INDEX IF NOT EXISTS "communication_template_versions_type_event_idx"
  ON "communication_template_versions" ("type", "event_trigger");

CREATE TABLE IF NOT EXISTS "communication_documents" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "event_id" varchar(36),
  "event_type" varchar(120) NOT NULL,
  "template_id" varchar(120),
  "document_type" varchar(80) NOT NULL,
  "reference_id" varchar(120),
  "recipient" varchar(255),
  "file_name" text NOT NULL,
  "download_url" text NOT NULL,
  "mime_type" varchar(120) DEFAULT 'application/pdf' NOT NULL,
  "status" varchar(40) DEFAULT 'generated' NOT NULL,
  "expires_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "communication_documents_event_idx"
  ON "communication_documents" ("event_id");
CREATE INDEX IF NOT EXISTS "communication_documents_type_created_idx"
  ON "communication_documents" ("document_type", "created_at");
CREATE INDEX IF NOT EXISTS "communication_documents_reference_idx"
  ON "communication_documents" ("reference_id");
CREATE INDEX IF NOT EXISTS "communication_documents_status_idx"
  ON "communication_documents" ("status");

CREATE TABLE IF NOT EXISTS "communication_workflow_tasks" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "workflow_id" varchar(120) NOT NULL,
  "step_id" varchar(120) NOT NULL,
  "event_id" varchar(36),
  "event_type" varchar(120) NOT NULL,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "scheduled_for" timestamp NOT NULL,
  "executed_at" timestamp,
  "attempts" integer DEFAULT 0 NOT NULL,
  "payload" jsonb,
  "last_error" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "communication_workflow_tasks_workflow_idx"
  ON "communication_workflow_tasks" ("workflow_id");
CREATE INDEX IF NOT EXISTS "communication_workflow_tasks_status_schedule_idx"
  ON "communication_workflow_tasks" ("status", "scheduled_for");
CREATE INDEX IF NOT EXISTS "communication_workflow_tasks_event_idx"
  ON "communication_workflow_tasks" ("event_id");

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

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" varchar(30) DEFAULT 'stripe' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_method" varchar(80);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "checkout_reference" varchar(120);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_status" varchar(60);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "product_name" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "quantity" integer DEFAULT 1 NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_code" varchar(120);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_reason" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount_refunded" integer DEFAULT 0 NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "disputed_at" timestamp;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_status" varchar(30) DEFAULT 'not_required' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_last_attempt_at" timestamp;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_queued_at" timestamp;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "receipt_error" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "reversed_amount" integer DEFAULT 0 NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_checkout_reference_unique_idx"
  ON "payments" ("checkout_reference")
  WHERE "checkout_reference" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "payments_status_created_idx"
  ON "payments" ("status", "created_at" DESC);

ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "attempt_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp;
ALTER TABLE "stripe_events" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp;

CREATE TABLE IF NOT EXISTS "payment_status_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "payment_id" integer NOT NULL,
  "stripe_event_id" text,
  "status" varchar(40) NOT NULL,
  "provider_status" varchar(60),
  "details" jsonb,
  "idempotency_key" text NOT NULL UNIQUE,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_status_events_payment_created_idx"
  ON "payment_status_events" ("payment_id", "created_at");
CREATE INDEX IF NOT EXISTS "payment_status_events_stripe_event_idx"
  ON "payment_status_events" ("stripe_event_id");

CREATE TABLE IF NOT EXISTS "ai_chat_conversations" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "user_id" integer,
  "user_email" varchar(255),
  "access_token_hash" varchar(128),
  "channel" varchar(20) DEFAULT 'public' NOT NULL,
  "messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "summary" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "moderation_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "memory" jsonb,
  "intelligence" jsonb,
  "audit_trail" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "retention_until" timestamp NOT NULL,
  "last_message_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_chat_conversations_user_created_idx"
  ON "ai_chat_conversations" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_chat_conversations_status_last_message_idx"
  ON "ai_chat_conversations" ("is_active", "last_message_at");
CREATE INDEX IF NOT EXISTS "ai_chat_conversations_retention_idx"
  ON "ai_chat_conversations" ("retention_until");

CREATE TABLE IF NOT EXISTS "ai_chat_usage" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "conversation_id" varchar(36),
  "user_id" integer,
  "actor_hash" varchar(128) NOT NULL,
  "provider" varchar(30) NOT NULL,
  "model" varchar(120) NOT NULL,
  "provider_request_id" varchar(160),
  "request_status" varchar(30) NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "total_tokens" integer DEFAULT 0 NOT NULL,
  "latency_ms" integer DEFAULT 0 NOT NULL,
  "error_code" varchar(120),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_chat_usage_actor_created_idx"
  ON "ai_chat_usage" ("actor_hash", "created_at");
CREATE INDEX IF NOT EXISTS "ai_chat_usage_conversation_created_idx"
  ON "ai_chat_usage" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_chat_usage_status_created_idx"
  ON "ai_chat_usage" ("request_status", "created_at");

CREATE TABLE IF NOT EXISTS "ai_chat_response_cache" (
  "cache_key" varchar(64) PRIMARY KEY NOT NULL,
  "model" varchar(120) NOT NULL,
  "response" jsonb NOT NULL,
  "hit_count" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_chat_response_cache_expiry_idx"
  ON "ai_chat_response_cache" ("expires_at");

DO $$ BEGIN
  ALTER TABLE "payment_status_events"
    ADD CONSTRAINT "payment_status_events_payment_id_payments_id_fk"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_chat_conversations"
    ADD CONSTRAINT "ai_chat_conversations_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_chat_usage"
    ADD CONSTRAINT "ai_chat_usage_conversation_id_ai_chat_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "ai_chat_conversations"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_chat_usage"
    ADD CONSTRAINT "ai_chat_usage_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_chat_conversations"
    ADD CONSTRAINT "ai_chat_conversations_owner_check"
    CHECK ("user_id" IS NOT NULL OR "access_token_hash" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

let schemaReady: Promise<void> | null = null;

export const ensureRuntimeDatabaseSchema = () => {
  schemaReady ??= pool.query(runtimeSchemaSql).then(() => undefined);
  return schemaReady;
};
