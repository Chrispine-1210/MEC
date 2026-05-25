CREATE TABLE IF NOT EXISTS "module_workflows" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "module" text NOT NULL,
  "reference_id" text,
  "workflow_type" text DEFAULT 'review' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "stage" text,
  "priority" text DEFAULT 'normal',
  "assigned_to" varchar,
  "due_at" timestamp,
  "payload" jsonb,
  "created_by" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "application_reviews" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" varchar NOT NULL,
  "reviewer_id" varchar,
  "stage" text DEFAULT 'review' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "score" integer,
  "comments" text,
  "criteria" jsonb,
  "interview_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" varchar NOT NULL,
  "document_type" text NOT NULL,
  "file_url" text NOT NULL,
  "original_name" text,
  "status" text DEFAULT 'received' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "access_level" text DEFAULT 'admin' NOT NULL,
  "metadata" jsonb,
  "uploaded_by" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "content_revisions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "module" text NOT NULL,
  "reference_id" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "title" text,
  "snapshot" jsonb,
  "change_summary" text,
  "created_by" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "scheduled_reports" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "module" text NOT NULL,
  "cadence" text DEFAULT 'weekly' NOT NULL,
  "recipients" jsonb,
  "format" text DEFAULT 'pdf' NOT NULL,
  "filters" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "next_run_at" timestamp,
  "last_run_at" timestamp,
  "created_by" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "session_hash" text NOT NULL UNIQUE,
  "device" text,
  "ip_address" text,
  "user_agent" text,
  "status" text DEFAULT 'active' NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "permission_audit_logs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" varchar,
  "target_user_id" varchar,
  "role_id" text,
  "permission" text,
  "action" text NOT NULL,
  "before" jsonb,
  "after" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "module_analytics_snapshots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "module" text NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "metrics" jsonb NOT NULL,
  "generated_by" varchar,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_module_workflows_module_idx" ON "module_workflows" ("module");
CREATE INDEX IF NOT EXISTS "admin_module_workflows_status_idx" ON "module_workflows" ("status");
CREATE INDEX IF NOT EXISTS "admin_application_reviews_application_idx" ON "application_reviews" ("application_id");
CREATE INDEX IF NOT EXISTS "admin_application_documents_application_idx" ON "application_documents" ("application_id");
CREATE INDEX IF NOT EXISTS "admin_content_revisions_content_idx" ON "content_revisions" ("module", "reference_id");
CREATE INDEX IF NOT EXISTS "admin_scheduled_reports_module_idx" ON "scheduled_reports" ("module");
CREATE INDEX IF NOT EXISTS "admin_user_sessions_user_idx" ON "user_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "admin_permission_audit_actor_idx" ON "permission_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "admin_module_analytics_period_idx" ON "module_analytics_snapshots" ("module", "period_start", "period_end");
