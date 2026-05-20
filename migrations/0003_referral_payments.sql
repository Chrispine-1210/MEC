-- Migration: production referral engine + Stripe payment ledger
-- Date: 2026-05-18

ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code varchar(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_currency varchar(3) DEFAULT 'USD';

CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users(referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_unique ON users(stripe_customer_id);

UPDATE users
SET referral_code = 'MEC' || id
WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS "referral_campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code_prefix" varchar(20),
  "starts_at" timestamp NOT NULL,
  "ends_at" timestamp,
  "status" varchar(30) DEFAULT 'draft' NOT NULL,
  "boost_bps" integer DEFAULT 10000 NOT NULL,
  "max_rewards_per_referrer" integer,
  "attribution_model" varchar(30) DEFAULT 'last_click' NOT NULL,
  "created_by" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "campaign_id" integer,
  "code" varchar(32) NOT NULL,
  "expires_at" timestamp,
  "max_uses" integer,
  "use_count" integer DEFAULT 0 NOT NULL,
  "status" varchar(30) DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "referral_codes_code_unique" UNIQUE("code")
);

ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS user_id integer;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS campaign_id integer;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS expires_at timestamp;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS use_count integer DEFAULT 0 NOT NULL;
ALTER TABLE referral_codes ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'active' NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_codes' AND column_name = 'program_id'
  ) THEN
    EXECUTE 'ALTER TABLE referral_codes ALTER COLUMN program_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_codes' AND column_name = 'referrer_id'
  ) THEN
    EXECUTE 'ALTER TABLE referral_codes ALTER COLUMN referrer_id DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_codes' AND column_name = 'referrer_id'
  ) THEN
    EXECUTE 'UPDATE referral_codes SET user_id = COALESCE(user_id, referrer_id) WHERE user_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_codes' AND column_name = 'program_id'
  ) THEN
    EXECUTE 'UPDATE referral_codes SET campaign_id = program_id WHERE campaign_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_codes' AND column_name = 'is_active'
  ) THEN
    EXECUTE 'UPDATE referral_codes SET status = CASE WHEN is_active IS FALSE THEN ''paused'' ELSE ''active'' END';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_unique_idx ON referral_codes(code);

INSERT INTO referral_codes (user_id, code, status)
SELECT id, referral_code, 'active'
FROM users
WHERE referral_code IS NOT NULL
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS "referral_clicks" (
  "id" serial PRIMARY KEY NOT NULL,
  "referral_code_id" integer,
  "campaign_id" integer,
  "referrer_id" integer,
  "visitor_id" varchar(64) NOT NULL,
  "ip_hash" text,
  "user_agent_hash" text,
  "device_fingerprint_hash" text,
  "landing_url" text,
  "utm" jsonb,
  "risk_score" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS referral_code_id integer;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS campaign_id integer;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS referrer_id integer;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS visitor_id varchar(64);
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS ip_hash text;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS user_agent_hash text;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS device_fingerprint_hash text;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS landing_url text;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS utm jsonb;
ALTER TABLE referral_clicks ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0 NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'program_id'
  ) THEN
    EXECUTE 'ALTER TABLE referral_clicks ALTER COLUMN program_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'code_id'
  ) THEN
    EXECUTE 'ALTER TABLE referral_clicks ALTER COLUMN code_id DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'fingerprint_hash'
  ) THEN
    EXECUTE 'ALTER TABLE referral_clicks ALTER COLUMN fingerprint_hash DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'code_id'
  ) THEN
    EXECUTE 'UPDATE referral_clicks SET referral_code_id = code_id WHERE referral_code_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'program_id'
  ) THEN
    EXECUTE 'UPDATE referral_clicks SET campaign_id = program_id WHERE campaign_id IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'ip_address'
  ) THEN
    EXECUTE 'UPDATE referral_clicks SET ip_hash = md5(ip_address) WHERE ip_hash IS NULL AND ip_address IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'user_agent'
  ) THEN
    EXECUTE 'UPDATE referral_clicks SET user_agent_hash = md5(user_agent) WHERE user_agent_hash IS NULL AND user_agent IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'referral_clicks' AND column_name = 'fingerprint_hash'
  ) THEN
    EXECUTE 'UPDATE referral_clicks SET device_fingerprint_hash = fingerprint_hash WHERE device_fingerprint_hash IS NULL';
  END IF;
END $$;

UPDATE referral_clicks
SET visitor_id = COALESCE(visitor_id, md5(COALESCE(ip_hash, '') || COALESCE(user_agent_hash, '') || id::text))
WHERE visitor_id IS NULL;

CREATE TABLE IF NOT EXISTS "referral_relationships" (
  "id" serial PRIMARY KEY NOT NULL,
  "referrer_id" integer NOT NULL,
  "referred_user_id" integer NOT NULL,
  "referral_code_id" integer,
  "campaign_id" integer,
  "level" integer DEFAULT 1 NOT NULL,
  "attribution_model" varchar(30) DEFAULT 'last_click' NOT NULL,
  "status" varchar(40) DEFAULT 'signup_pending' NOT NULL,
  "fraud_status" varchar(40) DEFAULT 'clear' NOT NULL,
  "first_payment_id" integer,
  "activated_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "referral_relationships_referred_user_unique" UNIQUE("referred_user_id"),
  CONSTRAINT "referral_relationships_no_self_referral" CHECK ("referrer_id" <> "referred_user_id")
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "stripe_customer_id" text,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "stripe_invoice_id" text,
  "stripe_subscription_id" text,
  "amount_total" integer NOT NULL,
  "amount_net" integer,
  "currency" varchar(3) NOT NULL,
  "status" varchar(40) NOT NULL,
  "product_type" varchar(60) NOT NULL,
  "metadata" jsonb,
  "paid_at" timestamp,
  "refunded_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "payments_checkout_session_unique" UNIQUE("stripe_checkout_session_id"),
  CONSTRAINT "payments_payment_intent_unique" UNIQUE("stripe_payment_intent_id"),
  CONSTRAINT "payments_invoice_unique" UNIQUE("stripe_invoice_id")
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_total integer;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_net integer;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS product_type varchar(60) DEFAULT 'application' NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at timestamp;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at timestamp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount'
  ) THEN
    EXECUTE 'ALTER TABLE payments ALTER COLUMN amount DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'amount'
  ) THEN
    EXECUTE 'UPDATE payments SET amount_total = COALESCE(amount_total, amount) WHERE amount_total IS NULL';
  END IF;
END $$;

UPDATE payments
SET amount_net = COALESCE(amount_net, amount_total);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'raw'
  ) THEN
    EXECUTE 'UPDATE payments SET metadata = raw WHERE metadata IS NULL';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_checkout_session_unique_idx ON payments(stripe_checkout_session_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_payment_intent_unique_idx ON payments(stripe_payment_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_invoice_unique_idx ON payments(stripe_invoice_id);

CREATE TABLE IF NOT EXISTS "commission_rules" (
  "id" serial PRIMARY KEY NOT NULL,
  "campaign_id" integer,
  "product_type" varchar(60),
  "level" integer DEFAULT 1 NOT NULL,
  "calculation_type" varchar(30) NOT NULL,
  "percent_bps" integer DEFAULT 0 NOT NULL,
  "flat_amount" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "release_delay_days" integer DEFAULT 14 NOT NULL,
  "min_payment_amount" integer DEFAULT 0,
  "max_commission_amount" integer,
  "status" varchar(30) DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

INSERT INTO commission_rules (
  product_type,
  level,
  calculation_type,
  percent_bps,
  flat_amount,
  currency,
  release_delay_days,
  min_payment_amount,
  status
)
SELECT NULL, 1, 'percent', 1000, 0, 'USD', 14, 1, 'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM commission_rules
  WHERE product_type IS NULL
    AND level = 1
    AND status = 'active'
);

CREATE TABLE IF NOT EXISTS "commissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "payment_id" integer NOT NULL,
  "referral_relationship_id" integer NOT NULL,
  "beneficiary_user_id" integer NOT NULL,
  "rule_id" integer,
  "level" integer NOT NULL,
  "gross_payment_amount" integer NOT NULL,
  "commission_amount" integer NOT NULL,
  "currency" varchar(3) NOT NULL,
  "status" varchar(40) DEFAULT 'pending_release' NOT NULL,
  "release_at" timestamp NOT NULL,
  "released_at" timestamp,
  "reversed_at" timestamp,
  "risk_score" integer DEFAULT 0 NOT NULL,
  "idempotency_key" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "commissions_idempotency_key_unique" UNIQUE("idempotency_key")
);

CREATE TABLE IF NOT EXISTS "wallet_accounts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'USD' NOT NULL,
  "available_balance" integer DEFAULT 0 NOT NULL,
  "pending_balance" integer DEFAULT 0 NOT NULL,
  "lifetime_earned" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "wallet_accounts_user_unique" UNIQUE("user_id")
);

INSERT INTO wallet_accounts (user_id, currency)
SELECT id, COALESCE(default_currency, 'USD')
FROM users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "wallet_account_id" integer,
  "user_id" integer,
  "commission_id" integer,
  "payout_request_id" integer,
  "direction" varchar(10) NOT NULL,
  "balance_type" varchar(20) NOT NULL,
  "amount" integer NOT NULL,
  "currency" varchar(3) NOT NULL,
  "entry_type" varchar(60) NOT NULL,
  "idempotency_key" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key")
);

CREATE TABLE IF NOT EXISTS "stripe_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "stripe_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "object_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "processing_status" varchar(30) DEFAULT 'received' NOT NULL,
  "processed_at" timestamp,
  "error" text,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS stripe_event_id text;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS object_id text DEFAULT 'unknown' NOT NULL;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS processing_status varchar(30) DEFAULT 'received' NOT NULL;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();

UPDATE stripe_events
SET stripe_event_id = COALESCE(stripe_event_id, id::text)
WHERE stripe_event_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_stripe_event_id_unique_idx ON stripe_events(stripe_event_id);

CREATE TABLE IF NOT EXISTS "payout_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "amount" integer NOT NULL,
  "currency" varchar(3) NOT NULL,
  "method" varchar(40) NOT NULL,
  "destination" jsonb,
  "status" varchar(40) DEFAULT 'requested' NOT NULL,
  "requested_at" timestamp DEFAULT now(),
  "approved_by" integer,
  "approved_at" timestamp,
  "paid_at" timestamp,
  "failure_reason" text
);

ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS user_id integer;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS destination jsonb;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS requested_at timestamp DEFAULT now();
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS approved_by integer;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS approved_at timestamp;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS paid_at timestamp;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS failure_reason text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'wallet_id'
  ) THEN
    EXECUTE 'ALTER TABLE payout_requests ALTER COLUMN wallet_id DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'UPDATE payout_requests SET requested_at = created_at WHERE requested_at IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payout_requests' AND column_name = 'processed_at'
  ) THEN
    EXECUTE 'UPDATE payout_requests SET paid_at = processed_at WHERE paid_at IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "fraud_signals" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "referral_relationship_id" integer,
  "payment_id" integer,
  "signal_type" varchar(80) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "score" integer NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);

ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS user_id integer;
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS referral_relationship_id integer;
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS payment_id integer;
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS signal_type varchar(80);
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS severity varchar(20) DEFAULT 'low' NOT NULL;
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS score integer DEFAULT 0 NOT NULL;
ALTER TABLE fraud_signals ADD COLUMN IF NOT EXISTS metadata jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_signals' AND column_name = 'score_delta'
  ) THEN
    EXECUTE 'UPDATE fraud_signals SET score = score_delta WHERE score = 0';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fraud_signals' AND column_name = 'details'
  ) THEN
    EXECUTE 'UPDATE fraud_signals SET metadata = details WHERE metadata IS NULL';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "referral_disputes" (
  "id" serial PRIMARY KEY NOT NULL,
  "referral_relationship_id" integer,
  "opened_by" integer NOT NULL,
  "assigned_to" integer,
  "status" varchar(40) DEFAULT 'open' NOT NULL,
  "reason" text NOT NULL,
  "resolution" text,
  "created_at" timestamp DEFAULT now(),
  "resolved_at" timestamp
);

CREATE INDEX IF NOT EXISTS referral_clicks_code_created_idx ON referral_clicks(referral_code_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_clicks_referrer_created_idx ON referral_clicks(referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_relationships_referrer_status_idx ON referral_relationships(referrer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_user_status_idx ON payments(user_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS commissions_user_status_release_idx ON commissions(beneficiary_user_id, status, release_at);
CREATE INDEX IF NOT EXISTS ledger_entries_user_created_idx ON ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_events_processing_idx ON stripe_events(processing_status, created_at);
CREATE INDEX IF NOT EXISTS fraud_signals_relationship_idx ON fraud_signals(referral_relationship_id, created_at DESC);
