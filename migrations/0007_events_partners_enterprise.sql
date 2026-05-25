ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "cover_image" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "contact_name" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "contact_email" varchar(255);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "contact_phone" varchar(40);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "social_links" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "industry_category" varchar(120);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "partnership_level" varchar(120);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "sponsorship_tier" varchar(120);
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "status" varchar(40) DEFAULT 'active';
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "region" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "documents" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "agreements" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "internal_comments" text;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "linked_events" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "linked_sponsorships" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "linked_opportunities" jsonb;
ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "partnership_history" jsonb;

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organizer" text;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "rsvp_enabled" boolean DEFAULT true;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "ticket_types" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "custom_fields" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "partners" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "attachments" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "seo_meta" jsonb;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "social_meta" jsonb;

ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "ticket_type" varchar(120);
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "source" varchar(80) DEFAULT 'public';
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "qr_payload" jsonb;
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "approval_notes" text;
ALTER TABLE "event_registrations" ADD COLUMN IF NOT EXISTS "checked_out_at" timestamp;

CREATE TABLE IF NOT EXISTS "event_ticket_types" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" text,
  "price_amount" integer DEFAULT 0,
  "currency" varchar(10) DEFAULT 'MWK',
  "capacity" integer,
  "sales_start_at" timestamp,
  "sales_end_at" timestamp,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "event_ticket_types_event_idx" ON "event_ticket_types" ("event_id");

CREATE TABLE IF NOT EXISTS "event_media_assets" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "asset_type" varchar(40) DEFAULT 'image' NOT NULL,
  "url" text NOT NULL,
  "alt_text" text,
  "caption" text,
  "metadata" jsonb,
  "sort_order" integer DEFAULT 0,
  "is_featured" boolean DEFAULT false,
  "uploaded_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "event_media_assets_event_idx" ON "event_media_assets" ("event_id");

CREATE TABLE IF NOT EXISTS "event_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "title" text NOT NULL,
  "document_type" varchar(80) DEFAULT 'attachment',
  "file_url" text NOT NULL,
  "version" integer DEFAULT 1,
  "access_level" varchar(40) DEFAULT 'public',
  "uploaded_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "event_documents_event_idx" ON "event_documents" ("event_id");

CREATE TABLE IF NOT EXISTS "event_notification_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "channel" varchar(40) DEFAULT 'email' NOT NULL,
  "template_key" varchar(120) NOT NULL,
  "audience" varchar(80) DEFAULT 'registrants' NOT NULL,
  "scheduled_for" timestamp,
  "status" varchar(40) DEFAULT 'draft' NOT NULL,
  "metadata" jsonb,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "event_notification_plans_event_idx" ON "event_notification_plans" ("event_id");
CREATE INDEX IF NOT EXISTS "event_notification_plans_status_idx" ON "event_notification_plans" ("status");

CREATE TABLE IF NOT EXISTS "partner_activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "activity_type" varchar(80) DEFAULT 'note' NOT NULL,
  "subject" text NOT NULL,
  "notes" text,
  "outcome" text,
  "due_at" timestamp,
  "completed_at" timestamp,
  "owner_id" integer,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "partner_activities_partner_idx" ON "partner_activities" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_activities_due_idx" ON "partner_activities" ("due_at");

CREATE TABLE IF NOT EXISTS "partner_documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "title" text NOT NULL,
  "document_type" varchar(80) DEFAULT 'agreement',
  "file_url" text NOT NULL,
  "version" integer DEFAULT 1,
  "access_level" varchar(40) DEFAULT 'admin',
  "expires_at" timestamp,
  "uploaded_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "partner_documents_partner_idx" ON "partner_documents" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_documents_expires_idx" ON "partner_documents" ("expires_at");

CREATE TABLE IF NOT EXISTS "sponsorships" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "event_id" integer,
  "title" text NOT NULL,
  "tier" varchar(120),
  "amount" integer DEFAULT 0,
  "currency" varchar(10) DEFAULT 'MWK',
  "contribution_type" varchar(80) DEFAULT 'financial',
  "status" varchar(40) DEFAULT 'prospect',
  "starts_at" timestamp,
  "ends_at" timestamp,
  "benefits" jsonb,
  "metrics" jsonb,
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sponsorships_partner_idx" ON "sponsorships" ("partner_id");
CREATE INDEX IF NOT EXISTS "sponsorships_event_idx" ON "sponsorships" ("event_id");
CREATE INDEX IF NOT EXISTS "sponsorships_status_idx" ON "sponsorships" ("status");

CREATE TABLE IF NOT EXISTS "partner_opportunities" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "title" text NOT NULL,
  "opportunity_type" varchar(80) DEFAULT 'collaboration',
  "stage" varchar(80) DEFAULT 'discovery',
  "value_amount" integer DEFAULT 0,
  "currency" varchar(10) DEFAULT 'MWK',
  "probability" integer DEFAULT 0,
  "close_date" timestamp,
  "owner_id" integer,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "partner_opportunities_partner_idx" ON "partner_opportunities" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_opportunities_stage_idx" ON "partner_opportunities" ("stage");

CREATE TABLE IF NOT EXISTS "partner_financial_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "partner_id" integer NOT NULL,
  "sponsorship_id" integer,
  "record_type" varchar(80) DEFAULT 'contribution',
  "amount" integer DEFAULT 0 NOT NULL,
  "currency" varchar(10) DEFAULT 'MWK',
  "status" varchar(40) DEFAULT 'pledged',
  "recorded_at" timestamp DEFAULT now(),
  "notes" text,
  "created_by" integer,
  "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "partner_financial_records_partner_idx" ON "partner_financial_records" ("partner_id");
CREATE INDEX IF NOT EXISTS "partner_financial_records_sponsorship_idx" ON "partner_financial_records" ("sponsorship_id");

CREATE TABLE IF NOT EXISTS "permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "role" varchar(80) NOT NULL,
  "permission" varchar(120) NOT NULL,
  "resource" varchar(120) NOT NULL,
  "created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_role_permission_idx" ON "permissions" ("role", "permission", "resource");

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "channel" varchar(40) DEFAULT 'in_app',
  "title" text NOT NULL,
  "message" text NOT NULL,
  "status" varchar(40) DEFAULT 'unread',
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "read_at" timestamp
);
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications" ("status");

CREATE TABLE IF NOT EXISTS "webhook_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "target_url" text NOT NULL,
  "event_types" text[],
  "secret_hash" text,
  "status" varchar(40) DEFAULT 'active',
  "created_by" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "webhook_subscriptions_status_idx" ON "webhook_subscriptions" ("status");

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" serial PRIMARY KEY NOT NULL,
  "subscription_id" integer NOT NULL,
  "event_type" varchar(120) NOT NULL,
  "payload" jsonb NOT NULL,
  "response_status" integer,
  "response_body" text,
  "attempts" integer DEFAULT 0,
  "status" varchar(40) DEFAULT 'pending',
  "next_attempt_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "delivered_at" timestamp
);
CREATE INDEX IF NOT EXISTS "webhook_deliveries_subscription_idx" ON "webhook_deliveries" ("subscription_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_idx" ON "webhook_deliveries" ("status");
