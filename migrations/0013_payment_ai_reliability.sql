-- Durable payment state, webhook recovery, and PostgreSQL-backed AI conversations.

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
  "idempotency_key" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "payment_status_events_idempotency_key_unique" UNIQUE("idempotency_key")
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
