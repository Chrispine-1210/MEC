CREATE TABLE "blog_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"blog_post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fraud_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_click_id" integer NOT NULL,
	"signal_type" varchar(100) NOT NULL,
	"score_delta" integer DEFAULT 0,
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"subject" text,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_checkout_session_id" varchar(255),
	"user_id" integer,
	"program_id" integer,
	"attribution_id" integer,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"status" varchar(30) DEFAULT 'succeeded' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"method" varchar(50) DEFAULT 'bank',
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"click_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"code_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer,
	"referred_email" varchar(255),
	"signup_at" timestamp,
	"activation_at" timestamp,
	"attribution_score" integer DEFAULT 0,
	"level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"code_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_email" varchar(255),
	"fingerprint_hash" varchar(128) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"code" varchar(64) NOT NULL,
	"referral_link_path" varchar(255) DEFAULT '/register' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"used_at" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "referral_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"attribution_model" varchar(50) DEFAULT 'last_click' NOT NULL,
	"level1_percent" integer DEFAULT 0,
	"level1_flat" integer DEFAULT 0,
	"level2_enabled" boolean DEFAULT false,
	"level2_percent" integer DEFAULT 0,
	"level2_flat" integer DEFAULT 0,
	"reward_delay_days" integer DEFAULT 7,
	"code_expiry_days" integer DEFAULT 90,
	"is_active" boolean DEFAULT true,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"attribution_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_user_id" integer,
	"payment_id" integer,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"level" integer DEFAULT 1 NOT NULL,
	"state" varchar(30) DEFAULT 'on_hold' NOT NULL,
	"rule_snapshot" jsonb,
	"held_at" timestamp DEFAULT now(),
	"released_at" timestamp,
	"reversed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"dispute_note" text
);
--> statement-breakpoint
CREATE TABLE "referral_risk_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"click_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"fingerprint_hash" varchar(128) NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"risk_band" varchar(20) DEFAULT 'low' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_event_id" varchar(255) NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"received_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"available_balance" integer DEFAULT 0 NOT NULL,
	"pending_balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallet_balances_wallet_id_unique" UNIQUE("wallet_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"referral_reward_id" integer,
	"payment_id" integer,
	"type" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "likes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "programs" jsonb;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "display_order" integer DEFAULT 0;