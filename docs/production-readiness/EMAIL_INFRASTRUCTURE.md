# Email Infrastructure Documentation

Date: 2026-06-02

## Runtime

- Email dispatch is implemented in `server/email.ts`.
- Account verification, password reset, application, event, contact, subscription, scholarship, and administrator messages are queued in the `email_jobs` table.
- Delivery events are persisted in `email_delivery_events` and also mirrored to `data/email-events.jsonl` for runtime incident review.
- The background worker starts from `server/index.ts` with `startEmailQueueWorker()` unless `EMAIL_QUEUE_WORKER_ENABLED=false`.
- Immediate enqueue also triggers a queue pass for near real-time transactional sends.

## Providers

Supported providers:

- Resend
- SendGrid
- Postmark
- Amazon SES
- Custom API fallback through `EMAIL_API_URL`

Provider order is controlled with `EMAIL_PROVIDER_ORDER`, for example:

```env
EMAIL_PROVIDER_ORDER=resend,sendgrid,postmark,ses
```

If one provider fails during a send attempt, the worker records `provider_failed` and tries the next configured provider before scheduling a retry.

## Retry Policy

Each email receives one initial send attempt plus four retries:

- Retry 1: 1 minute
- Retry 2: 5 minutes
- Retry 3: 15 minutes
- Retry 4: 1 hour

After final failure, the job is marked `failed`, full provider error context is stored, and an administrator notification is queued when `ADMIN_NOTIFICATION_EMAIL` or `EMAIL_FROM` is available.

## Verification Flow

Registration now requires a working transactional email provider before creating a new account in production. New users are created inactive, then a 24-hour JWT verification token is generated, HMAC-hashed, stored in `email_verification_tokens`, and emailed through the queue.

Verification links are generated from `API_APP_URL` when configured so backend-only deployments do not accidentally send users to a frontend host that cannot serve `/api/auth/verify-email/:token`.

Security controls:

- JWT verification token with 24-hour expiry
- HMAC token hash storage
- One-time use status transition
- Pending-token replacement on resend
- Replay prevention
- Maximum 3 verification requests per email per hour
- Public flow rate limiting by IP

## Subscription Compliance

The platform stores consent and preference records in `email_preferences` and synchronizes newsletter subscribers where possible. Commercial categories are individually configurable:

- Scholarships
- Jobs
- News
- Events
- Blog updates
- Partner updates
- Marketing

All platform emails include preference-management and unsubscribe links when `API_APP_URL` or `PUBLIC_APP_URL` is configured.

## Admin Monitoring

The admin email module reads `/api/admin/email/stats` and displays:

- Sent, delivered, opened, clicked, bounced, spam complaint, unsubscribe, and suppression totals
- Per-category metrics for verification, scholarship, newsletter, application, and password-reset flows
- Queue status
- Active provider order
- Recent final failures
- Template catalog coverage

## Production DNS

Before final launch, verify:

- `EMAIL_FROM` uses a verified sender domain.
- SPF includes every active provider.
- DKIM is enabled for every active provider.
- DMARC is at least in monitoring mode, then moved toward enforcement after deliverability is stable.
- Bounce and complaint webhooks are configured to `/api/email/webhooks/:provider`.
- `EMAIL_WEBHOOK_SIGNING_SECRET` is set and supplied by provider webhook integrations where possible.
- `ADMIN_NOTIFICATION_EMAIL` points to the operations inbox.

## Required Environment

```env
PUBLIC_APP_URL=https://mtendereeducationconsult.com
API_APP_URL=https://api.mtendereeducationconsult.com
EMAIL_FROM="Mtendere Education Consult <no-reply@mtendereeducationconsult.com>"
EMAIL_PROVIDER_ORDER=resend,sendgrid,postmark,ses
EMAIL_QUEUE_WORKER_ENABLED=true
EMAIL_DRY_RUN=false
EMAIL_TRACKING_SECRET=replace-with-random-email-tracking-secret
RESEND_API_KEY=
SENDGRID_API_KEY=
POSTMARK_SERVER_TOKEN=
AWS_SES_REGION=
AWS_SES_ACCESS_KEY_ID=
AWS_SES_SECRET_ACCESS_KEY=
ADMIN_NOTIFICATION_EMAIL=operations@mtendereeducationconsult.com
```
