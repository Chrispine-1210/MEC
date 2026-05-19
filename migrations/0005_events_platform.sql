CREATE TABLE IF NOT EXISTS "events" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "slug" varchar(180) NOT NULL UNIQUE,
  "summary" text,
  "description" text NOT NULL,
  "category" varchar(100) DEFAULT 'General' NOT NULL,
  "event_type" varchar(80) DEFAULT 'Information Session' NOT NULL,
  "location" text DEFAULT 'Lilongwe, Malawi' NOT NULL,
  "venue_name" text,
  "address" text,
  "map_url" text,
  "is_virtual" boolean DEFAULT false,
  "virtual_url" text,
  "livestream_url" text,
  "is_paid" boolean DEFAULT false,
  "price_amount" integer DEFAULT 0,
  "currency" varchar(10) DEFAULT 'MWK',
  "capacity" integer,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp NOT NULL,
  "registration_deadline" timestamp,
  "cover_image" text,
  "video_url" text,
  "tags" text[],
  "agenda" jsonb,
  "speakers" jsonb,
  "sponsors" jsonb,
  "faqs" jsonb,
  "resources" jsonb,
  "gallery" jsonb,
  "status" varchar(40) DEFAULT 'draft' NOT NULL,
  "is_featured" boolean DEFAULT false,
  "is_recommended" boolean DEFAULT false,
  "is_trending" boolean DEFAULT false,
  "allow_comments" boolean DEFAULT true,
  "requires_approval" boolean DEFAULT false,
  "view_count" integer DEFAULT 0,
  "share_count" integer DEFAULT 0,
  "like_count" integer DEFAULT 0,
  "created_by" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_idx" ON "events" ("slug");
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" ("status");
CREATE INDEX IF NOT EXISTS "events_start_at_idx" ON "events" ("start_at");
CREATE INDEX IF NOT EXISTS "events_category_idx" ON "events" ("category");

CREATE TABLE IF NOT EXISTS "event_registrations" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "user_id" integer,
  "full_name" text NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(40),
  "organization" text,
  "status" varchar(40) DEFAULT 'pending' NOT NULL,
  "ticket_code" varchar(80) NOT NULL UNIQUE,
  "attendance_status" varchar(40) DEFAULT 'registered' NOT NULL,
  "answers" jsonb,
  "reminder_opt_in" boolean DEFAULT true,
  "checked_in_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "event_registrations_event_idx" ON "event_registrations" ("event_id");
CREATE INDEX IF NOT EXISTS "event_registrations_email_idx" ON "event_registrations" ("email");
CREATE INDEX IF NOT EXISTS "event_registrations_status_idx" ON "event_registrations" ("status");

CREATE TABLE IF NOT EXISTS "event_comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "user_id" integer,
  "parent_id" integer,
  "author_name" text NOT NULL,
  "author_email" varchar(255),
  "content" text NOT NULL,
  "status" varchar(40) DEFAULT 'approved' NOT NULL,
  "report_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "event_comments_event_idx" ON "event_comments" ("event_id");
CREATE INDEX IF NOT EXISTS "event_comments_status_idx" ON "event_comments" ("status");

CREATE TABLE IF NOT EXISTS "event_reactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_id" integer NOT NULL,
  "user_id" integer,
  "visitor_id" varchar(120),
  "reaction" varchar(40) DEFAULT 'like' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "event_reactions_event_idx" ON "event_reactions" ("event_id");
