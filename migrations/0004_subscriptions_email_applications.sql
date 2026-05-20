-- Migration: newsletter subscriptions, email delivery audit, and application upload metadata support
-- Date: 2026-05-18

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

CREATE INDEX IF NOT EXISTS subscribers_status_created_idx
  ON subscribers(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_verification_token_unique_idx
  ON subscribers(verification_token)
  WHERE verification_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_unsubscribe_token_unique_idx
  ON subscribers(unsubscribe_token)
  WHERE unsubscribe_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS applications_user_type_reference_idx
  ON applications(user_id, type, reference_id);
