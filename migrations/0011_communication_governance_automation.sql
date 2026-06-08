-- Migration: communication governance, documents, workflow automation
-- Date: 2026-06-08

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
