-- Migration: University applications enhancements + saved items + messages
-- Date: 2025-01-01

-- Add programs JSONB column to partners (for university program listings)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS programs jsonb;

-- Saved items / bookmarks table
CREATE TABLE IF NOT EXISTS "saved_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);

-- Messages / contact inquiries table
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"subject" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
