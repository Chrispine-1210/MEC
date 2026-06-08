# Email Infrastructure Documentation

Date: 2026-06-08

## Runtime

- Email dispatch uses `server/email.ts`.
- Transactional email dispatch is persisted in `email_jobs`, retried with scheduled backoff, and logged through `email_delivery_events`.
- Provider delivery supports SendGrid, Amazon SES, Mailgun, Resend, Postmark, SMTP, and a custom HTTP fallback through `EMAIL_API_URL` and `EMAIL_API_KEY`.
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

- High-priority email routes request immediate delivery from the queue.
- Every channel output writes a `communication_messages` row with status, recipient, template, provider IDs, metadata, and diagnostics.
- Every emitted event writes a `communication_events` row with original payload and status.
- Failed or unsupported SMS/WhatsApp provider paths are recorded explicitly instead of failing silently.
- Admin notification feed formats communication and in-app notification analytics into readable operational alerts.
- Communication diagnostics expose route/template consistency, undeclared variables, orphan templates, provider readiness, and document-link TTL.
- Communication analytics expose message totals by channel, status, template, event type, and recent problem deliveries.
- Communication timelines expose per-student/per-email history across emails, generated documents, in-app alerts, SMS/WhatsApp attempts, and source events.

## Production DNS

Before final launch, verify:

- Resend has `mtendereeducationconsult.com` added under Domains.
- The Resend DNS records returned for `mtendereeducationconsult.com` are present in Cloudflare.
- SPF includes the selected email provider.
- DKIM keys are active.
- DMARC has at least monitoring policy, then enforcement after deliverability is stable.
- BIMI is present on `default._bimi.mtendereeducationconsult.com` when brand-authenticated display is required.
- Sending subdomains are segmented for `notifications`, `support`, `admissions`, `billing`, and `marketing`.
- Reverse DNS is verified in the active provider dashboard when dedicated IPs are enabled.
- `EMAIL_FROM` uses `Mtendere Education Consult <onboarding@resend.dev>` only for initial Resend testing, then switches to a verified Mtendere sender domain.
- `ADMIN_NOTIFICATION_EMAIL` is set to the operations inbox.
- `ADMIN_NOTIFICATION_PHONE` is set when SMS/WhatsApp provider integration is added.
- For Twilio SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SMS_FROM`.
- For Twilio WhatsApp: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_FROM`.
- For WhatsApp Cloud API: `WHATSAPP_CLOUD_ACCESS_TOKEN` and `WHATSAPP_CLOUD_PHONE_NUMBER_ID`.
- For generic SMS/WhatsApp webhooks: `SMS_API_URL`, `SMS_API_KEY`, `SMS_API_FROM`, `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, and `WHATSAPP_API_FROM`.
- For Mailgun failover: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and optional `MAILGUN_BASE_URL`.

Use this helper with a full-access Resend API key:

```powershell
npm run resend:domain:configure
```

To also apply the returned DNS records to Cloudflare and trigger Resend verification:

```powershell
npm run resend:domain:configure:cloudflare
```
