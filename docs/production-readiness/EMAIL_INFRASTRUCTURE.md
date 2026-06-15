# Email Infrastructure Documentation

Date: 2026-06-10

## Runtime

- Email dispatch uses `server/email.ts`.
- Transactional email dispatch is persisted in `email_jobs`, retried with scheduled backoff, and logged through `email_delivery_events`.
- Provider delivery supports SendGrid, Amazon SES, Mailgun, Resend, Postmark, SMTP, and a custom HTTP fallback through `EMAIL_API_URL` and `EMAIL_API_KEY`.
- On Vercel, do not rely on fire-and-forget background work after an HTTP response returns. User-facing transactional routes request inline delivery for the exact queued job they create, then leave retries/backlog to the durable queue drain.
- `/api/email/queue/drain` accepts either Vercel Cron requests or a valid `CRON_SECRET` bearer token for manual operations.
- Admin email operations expose stats, diagnostics, deliverability checks, templates, and production readiness through `/api/admin/email/stats`, `/api/admin/email/diagnostics`, `/api/admin/email/deliverability`, `/api/admin/email/templates`, and `/api/admin/email/readiness`.
- Multi-event communications use `server/communication.ts`: `Event Bus -> Notification Router -> Template Engine -> Delivery Providers`.
- Event and message audit records are persisted in `communication_events` and `communication_messages`, with JSONL runtime fallback at `data/communication-events.jsonl` and `data/communication-messages.jsonl`.
- SMS and WhatsApp delivery use `server/notifications.ts` provider adapters. Twilio, WhatsApp Cloud API, and generic HTTP webhooks are supported when configured.

## Transactional Emails

Implemented templates cover:

- Account verification
- Welcome email
- Password reset
- Password changed confirmation
- Subscription confirmation
- Contact acknowledgment
- Admin notification
- Application confirmation and status update
- Event registration confirmation and status update
- Partner onboarding
- Payment confirmation, payment failure, and invoice-generated categories

## Event-Driven Communication Layer

`emitCommunicationEvent` accepts events in this shape:

```json
{
  "event_type": "student.enrolled",
  "timestamp": "ISO-8601",
  "user_id": 123,
  "payload": {},
  "source": "admin"
}
```

Implemented routes include student registration, enrollment, application approval, payment received, payment failed, invoice generated, admin user creation, admin role updates, admin exports, system alerts, and security events.

Admin APIs:

- `GET /api/admin/communications/templates`
- `GET /api/admin/communications/templates/:templateId`
- `POST /api/admin/communications/templates/:templateId/preview`
- `GET /api/admin/communications/routes`
- `GET /api/admin/communications/diagnostics`
- `GET /api/admin/communications/analytics`
- `GET /api/admin/communications/timeline?userId=...` or `?email=...`
- `GET /api/admin/communications/audit`
- `POST /api/admin/communications/events`
- `POST /api/admin/communications/events/:eventId/replay`
- `POST /api/admin/communications/messages/:messageId/resend`

Generated PDFs are stored under `data/generated-documents/` and served through signed expiring links at `/api/documents/generated/:fileName?exp=...&t=...`. The default TTL is 30 days through `COMMUNICATION_DOCUMENT_LINK_TTL_DAYS`.

## Template Standards

The communication template catalog supports:

- Responsive HTML email templates with standard Mtendere header/footer through `renderMtendereEmail`.
- SMS templates optimized for short plain-text delivery.
- In-app alert templates stored through analytics/admin notification feed.
- Document templates with Mtendere letterhead, embedded local logo, reference number, date, recipient block, subject, body, and administration signature.
- Preview rendering validates template output without sending through a provider.
- Conditional sections are supported with `{{#if variable}}...{{/if}}`, `{{#if variable=value}}...{{/if}}`, and `{{#if variable!=value}}...{{/if}}`.
- Template metadata includes category, language, and version, preparing the admin builder for multi-language and version-controlled content.
- Template diagnostics include variable coverage and lightweight content-quality signals such as subject length, missing CTA, and spam-risk phrases.

Dynamic variables use `{{variable_name}}` syntax. Values are HTML-escaped for email rendering and missing values render as `Not provided`, preventing broken output and raw HTML injection.

## Reliability And Audit

- High-priority email routes request immediate delivery for their own queued job. This covers account verification, welcome, password reset, password changed, application confirmations and status updates, event registration confirmations and status updates, partner onboarding, contact acknowledgments, and admin notifications triggered by public submissions.
- `email_jobs.status = sent` means the provider accepted the message. It does not prove inbox placement. Mailbox-level confirmation is recorded later through provider webhook events such as `delivered`, `opened`, `clicked`, `bounced`, or `spam_complaint`.
- Public API responses expose `acceptedByProvider`, `mailboxDeliveryConfirmed`, `confirmationPending`, and `queued` so the UI does not claim mailbox delivery before webhook confirmation exists.
- The queue drain remains responsible for retrying provider failures, recovering stale processing jobs, and clearing backlog from durable storage.
- Permanent provider rejections such as Resend testing-mode recipient blocks, invalid senders, unauthorized keys, or 400/401/403 validation failures are marked as failed instead of being retried repeatedly. Temporary failures such as rate limits and 5xx responses remain retryable.
- Every channel output writes a `communication_messages` row with status, recipient, template, provider IDs, metadata, and diagnostics.
- Every emitted event writes a `communication_events` row with original payload and status.
- Failed or unsupported SMS/WhatsApp provider paths are recorded explicitly instead of failing silently.
- Admin notification feed formats communication and in-app notification analytics into readable operational alerts.
- Provider circuit breakers stop repeatedly failing providers from being hammered during outages while preserving failover to the next configured provider.
- Bounce, complaint, unsubscribe, and provider suppression webhooks update email preferences automatically so future sends honor suppression state.
- Provider webhook ingestion normalizes SendGrid, Amazon SES/SNS, Mailgun, Resend, and Postmark payloads and deduplicates repeated deliveries for `EMAIL_WEBHOOK_DEDUP_TTL_MS`.
- Communication diagnostics expose route/template consistency, undeclared variables, orphan templates, provider readiness, and document-link TTL.
- Communication analytics expose message totals by channel, status, template, event type, and recent problem deliveries.
- Communication timelines expose per-student/per-email history across emails, generated documents, in-app alerts, SMS/WhatsApp attempts, and source events.

## Production DNS

Before final launch, verify:

- Resend has `notifications.mtendereeducationconsult.com` added under Domains for transactional email.
- The Resend DNS records returned for `notifications.mtendereeducationconsult.com` are present in Cloudflare.
- SPF includes the selected email provider.
- DKIM keys are active.
- DMARC has at least monitoring policy, then enforcement after deliverability is stable.
- BIMI is present on `default._bimi.mtendereeducationconsult.com` when brand-authenticated display is required.
- Authentication diagnostics report SPF provider include coverage, DMARC policy/alignment/report URIs, DKIM selector status, and BIMI status.
- For Postmark, root-domain SPF is optional because SPF alignment is handled through Postmark's Return-Path; DKIM verification for the Mtendere sender domain is still required before relying on `no-reply@mtendereeducationconsult.com`.
- Sending subdomains are segmented for `notifications`, `support`, `admissions`, `billing`, and `marketing`.
- Reverse DNS is verified in the active provider dashboard when dedicated IPs are enabled.
- `EMAIL_FROM` must use a verified Mtendere sender domain in production, for example `Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>`.
- `mail.mtendereeducationconsult.com` is reserved for the existing SendGrid CNAME and must not be reused as the Resend sending domain unless the SendGrid DNS plan is intentionally migrated.
- `onboarding@resend.dev` is only acceptable for local or one-off smoke tests to the Resend account owner. Health/readiness treats it as public-recipient restricted when Resend is active.
- `ADMIN_NOTIFICATION_EMAIL` is set to the operations inbox.
- `ADMIN_NOTIFICATION_PHONE` is set when SMS/WhatsApp provider integration is added.
- For Twilio SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SMS_FROM`.
- For Twilio WhatsApp: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM`.
- For WhatsApp Cloud API: `WHATSAPP_CLOUD_ACCESS_TOKEN` and `WHATSAPP_CLOUD_PHONE_NUMBER_ID`.
- For generic SMS/WhatsApp webhooks: `SMS_API_URL`, `SMS_API_KEY`, `SMS_API_FROM`, `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, and `WHATSAPP_API_FROM`.
- For Mailgun failover: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and optional `MAILGUN_BASE_URL`.
- Provider circuit breaker tuning: `EMAIL_PROVIDER_CIRCUIT_FAILURE_THRESHOLD` and `EMAIL_PROVIDER_CIRCUIT_COOLDOWN_MS`.
- Webhook deduplication tuning: `EMAIL_WEBHOOK_DEDUP_TTL_MS`.

Use this helper with a full-access Resend API key:

```powershell
npm run resend:domain:configure
```

The helper defaults to `notifications.mtendereeducationconsult.com`. Override with `--domain=<domain>` only when the target sender domain is intentionally different.

To also apply the returned DNS records to Cloudflare and trigger Resend verification:

```powershell
npm run resend:domain:configure:cloudflare
```
