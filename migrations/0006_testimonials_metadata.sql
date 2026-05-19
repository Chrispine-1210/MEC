ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "author_name" text;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "credential" text;
