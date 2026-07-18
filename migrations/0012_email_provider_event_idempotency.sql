ALTER TABLE "email_delivery_events"
  ADD COLUMN IF NOT EXISTS "provider_event_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "email_delivery_events_provider_event_unique_idx"
  ON "email_delivery_events" ("provider", "provider_event_id")
  WHERE "provider_event_id" IS NOT NULL;
