ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_status" varchar(40) DEFAULT 'active' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_source" varchar(40) DEFAULT 'self_registration' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "environment" varchar(20) DEFAULT 'production' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_test_account" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_reason" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_ip" varchar(45);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_user_agent" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lock_reason" text;

UPDATE "users" SET "role" = 'admin' WHERE lower("role") IN ('legacy admin', 'legacy_admin');
UPDATE "users" SET "role" = 'editor' WHERE lower("role") IN ('legacy editor', 'legacy_editor');
UPDATE "users" SET "account_status" = CASE WHEN "is_active" = false THEN 'suspended' ELSE 'active' END
WHERE "account_status" IS NULL OR "account_status" NOT IN ('pending_verification','active','suspended','disabled','locked','deleted');
UPDATE "users" SET "is_test_account" = true, "environment" = 'test'
WHERE lower("email") LIKE '%@example.test' OR lower("username") ~ '^(e2e|training|playwright|cypress|test[_-]|seed[_-]|demo[_-])';

CREATE INDEX IF NOT EXISTS "users_governed_listing_idx" ON "users" ("environment", "is_test_account", "deleted_at", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("account_status");
CREATE INDEX IF NOT EXISTS "users_username_ci_idx" ON "users" (lower("username"));
CREATE INDEX IF NOT EXISTS "users_email_ci_idx" ON "users" (lower("email"));
