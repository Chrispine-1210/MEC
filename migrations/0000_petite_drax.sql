CREATE TABLE "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" varchar(100) NOT NULL,
	"user_id" integer,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"documents" jsonb,
	"notes" text,
	"submitted_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"image_url" text,
	"category" varchar(100) NOT NULL,
	"tags" text[],
	"is_published" boolean DEFAULT false,
	"author_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"salary" integer,
	"currency" varchar(10) DEFAULT 'USD',
	"job_type" varchar(50) NOT NULL,
	"requirements" jsonb,
	"benefits" jsonb,
	"is_remote" boolean DEFAULT false,
	"deadline" timestamp,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"logo_url" text,
	"website" text,
	"country" text,
	"student_count" integer,
	"ranking" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer,
	"referred_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"reward_amount" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"institution" text NOT NULL,
	"country" text NOT NULL,
	"amount" integer,
	"currency" varchar(10) DEFAULT 'USD',
	"deadline" timestamp NOT NULL,
	"requirements" jsonb,
	"category" varchar(100) NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text NOT NULL,
	"bio" text,
	"image_url" text,
	"email" varchar(255),
	"linkedin" text,
	"twitter" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"rating" integer NOT NULL,
	"image_url" text,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"profile_picture" text,
	"phone" varchar(20),
	"date_of_birth" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
