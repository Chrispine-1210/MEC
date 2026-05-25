CREATE TABLE IF NOT EXISTS "module_workflows" (
  "id" serial PRIMARY KEY NOT NULL,
  "module" varchar(80) NOT NULL,
  "reference_id" integer,
  "workflow_type" varchar(80) DEFAULT 'review' NOT NULL,
  "status" varchar(50) DEFAULT 'open' NOT NULL,
  "stage" varchar(120),
  "priority" varchar(30) DEFAULT 'normal',
  "assigned_to" integer,
  "due_at" timestamp,
  "payload" jsonb,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "application_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "application_id" integer NOT NULL,
  "reviewer_id" integer,
  "stage" varchar(120) DEFAULT 'review' NOT NULL,
  "status" varchar(50) DEFAULT 'pending' NOT NULL,
  "score" integer,
  "comments" text,
  "criteria" jsonb,
  "interview_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "application_id" integer NOT NULL,
  "document_type" varchar(120) NOT NULL,
  "file_url" text NOT NULL,
  "original_name" text,
  "status" varchar(50) DEFAULT 'received' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "access_level" varchar(40) DEFAULT 'admin' NOT NULL,
  "metadata" jsonb,
  "uploaded_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "content_revisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "module" varchar(80) NOT NULL,
  "reference_id" integer NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "title" text,
  "snapshot" jsonb,
  "change_summary" text,
  "created_by" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "scheduled_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "module" varchar(80) NOT NULL,
  "cadence" varchar(40) DEFAULT 'weekly' NOT NULL,
  "recipients" jsonb,
  "format" varchar(20) DEFAULT 'pdf' NOT NULL,
  "filters" jsonb,
  "is_active" boolean DEFAULT true,
  "next_run_at" timestamp,
  "last_run_at" timestamp,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS "module_analytics_snapshots" (
  "id" serial PRIMARY KEY NOT NULL,
  "module" varchar(80) NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "metrics" jsonb NOT NULL,
  "generated_by" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "module_workflows_module_idx" ON "module_workflows" ("module");
CREATE INDEX IF NOT EXISTS "module_workflows_status_idx" ON "module_workflows" ("status");
CREATE INDEX IF NOT EXISTS "module_workflows_reference_idx" ON "module_workflows" ("module", "reference_id");
CREATE INDEX IF NOT EXISTS "application_reviews_application_idx" ON "application_reviews" ("application_id");
CREATE INDEX IF NOT EXISTS "application_reviews_reviewer_idx" ON "application_reviews" ("reviewer_id");
CREATE INDEX IF NOT EXISTS "application_documents_application_idx" ON "application_documents" ("application_id");
CREATE INDEX IF NOT EXISTS "application_documents_status_idx" ON "application_documents" ("status");
CREATE INDEX IF NOT EXISTS "content_revisions_content_idx" ON "content_revisions" ("module", "reference_id");
CREATE INDEX IF NOT EXISTS "scheduled_reports_module_idx" ON "scheduled_reports" ("module");
CREATE INDEX IF NOT EXISTS "scheduled_reports_next_run_idx" ON "scheduled_reports" ("next_run_at");
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_hash_idx" ON "user_sessions" ("session_hash");
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx" ON "user_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "permission_audit_actor_idx" ON "permission_audit_logs" ("actor_id");
CREATE INDEX IF NOT EXISTS "permission_audit_target_idx" ON "permission_audit_logs" ("target_user_id");
CREATE INDEX IF NOT EXISTS "module_analytics_module_period_idx" ON "module_analytics_snapshots" ("module", "period_start", "period_end");
