-- Migration: event-driven communication and document audit
-- Date: 2026-06-08

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
