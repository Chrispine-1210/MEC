# Enterprise Email Modernization and Reliability Report

## Production Architecture

Mtendere Education Consult now routes outbound email through the centralized `server/email.ts` service. Forms, subscriptions, account verification, password reset, application workflows, event registration, contact acknowledgements, partner onboarding, scholarship recommendations, and admin alerts are expected to use this service instead of direct provider calls.

The platform also includes a centralized event-driven communication layer in `server/communication.ts`. It turns operational events into email, SMS/WhatsApp-ready notifications, in-app alerts, and generated documents through a single route and template catalog.

The service provides:

- Provider failover across SendGrid, Amazon SES, Mailgun, Resend, Postmark, SMTP, custom HTTP providers, and controlled dry-run mode.
- Queue-backed processing with retry scheduling at 1 minute, 5 minutes, 15 minutes, and 1 hour.
- Dead-letter visibility through failed `email_jobs`.
- Branded responsive templates with Mtendere identity, preference links, unsubscribe links, tracking links, and open tracking pixels.
- Email preference records, consent state, and suppression for commercial categories.
- Delivery event logging for queued, processing, sent, delivered, opened, clicked, bounced, unsubscribed, spam complaint, retry, provider failure, and final failure events.
- Admin diagnostics at `/api/admin/email/diagnostics`, `/api/admin/email/stats`, `/api/admin/email/templates`, and `/api/admin/email/deliverability`.

## Event-Driven Notifications And Documents

Communication events use this pipeline:

`Event Bus -> Notification Router -> Template Engine -> Delivery Providers`

Implemented event families:

- Student lifecycle: `student.registered`, `student.enrolled`, `student.payment_confirmed`, `student.application_approved`
- Admin actions: `admin.user_created`, `admin.role_updated`, `admin.data_exported`
- Financial: `payment.received`, `payment.failed`, `invoice.generated`
- System: `system.alert`, `system.security_event`

Outputs:

- Email: queued through `server/email.ts` with branded responsive HTML and standard footer.
- SMS/WhatsApp: delivered through `server/notifications.ts` when Twilio, WhatsApp Cloud API, or generic HTTP webhook settings are configured; otherwise returns explicit `unsupported_channel`.
- In-app: recorded as formatted admin notification analytics.
- Documents: generated as expiring signed PDF letterhead files with Mtendere branding, reference number, date, recipient, subject, body, and administration signature.

Durable audit:

- `communication_events`: original event payload, source, priority, user, status, processing timestamps, error.
- `communication_messages`: every delivery/document/in-app/SMS attempt with channel, recipient, template, subject, status, provider IDs, metadata, and diagnostics.
- JSONL fallback: `data/communication-events.jsonl`, `data/communication-messages.jsonl`.

Admin operations:

- `/api/admin/communications/templates`
- `/api/admin/communications/templates/:templateId`
- `/api/admin/communications/templates/:templateId/preview`
- `/api/admin/communications/routes`
- `/api/admin/communications/diagnostics`
- `/api/admin/communications/analytics`
- `/api/admin/communications/timeline`
- `/api/admin/communications/audit`
- `/api/admin/communications/events`
- `/api/admin/communications/events/:eventId/replay`
- `/api/admin/communications/messages/:messageId/resend`

Diagnostics report route/template consistency, missing route templates, undeclared template variables, orphan templates, template quality signals, provider readiness, sending subdomain health, BIMI readiness, and generated-document link TTL. Timeline APIs provide per-student/per-email communication history for admissions, finance, support, and compliance review.

## Vercel Environment Requirements

Production Vercel must contain real server-side values. These values must not be committed:

- `RESEND_API_KEY`
- `RESEND_DOMAIN=mtendereeducationconsult.com`
- `EMAIL_PROVIDER_ORDER=sendgrid,ses,mailgun,resend,postmark,smtp,custom`
- `EMAIL_DRY_RUN=false`
- `EMAIL_FROM=Mtendere Education Consult <onboarding@resend.dev>` for immediate Resend testing, then `EMAIL_FROM=Mtendere Education Consult <no-reply@mtendereeducationconsult.com>` after the sender domain is verified
- `SENDGRID_TRACKING_ENABLED=true`
- `EMAIL_LINK_BASE_URL=https://links.mtendereeducationconsult.com`
- `PUBLIC_APP_URL=https://mtendereeducationconsult.com`
- `API_APP_URL=https://mtendereeducationconsult.com`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` when using SMTP fallback instead of a direct provider API key
- `ADMIN_NOTIFICATION_EMAIL` for operational alerts
- `ADMIN_NOTIFICATION_PHONE` once SMS/WhatsApp provider delivery is enabled
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, and optionally `TWILIO_WHATSAPP_FROM`
- `WHATSAPP_CLOUD_ACCESS_TOKEN` and `WHATSAPP_CLOUD_PHONE_NUMBER_ID` for WhatsApp Cloud API
- `SMS_API_URL`, `SMS_API_KEY`, `SMS_API_FROM`, `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_API_FROM` for generic provider webhooks
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and optional `MAILGUN_BASE_URL` for tertiary email failover
- `COMMUNICATION_DOCUMENT_LINK_TTL_DAYS=30`

If `/api/health` reports `email.ready=false`, account creation and confirmation-email workflows must remain blocked instead of pretending the message was sent.

## SendGrid DNS Records

The deliverability endpoint checks the following records:

- `links.mtendereeducationconsult.com` CNAME `sendgrid.net`
- `54085667.mtendereeducationconsult.com` CNAME `sendgrid.net`
- `mail.mtendereeducationconsult.com` CNAME `u54085667.wl168.sendgrid.net`
- `mtd1._domainkey.mtendereeducationconsult.com` CNAME `mtd1.domainkey.u54085667.wl168.sendgrid.net`
- `mtd12._domainkey.mtendereeducationconsult.com` CNAME `mtd12.domainkey.u54085667.wl168.sendgrid.net`
- `_dmarc.mtendereeducationconsult.com` TXT `v=DMARC1; p=none` or a stricter policy
- `mtendereeducationconsult.com` TXT SPF with `include:sendgrid.net`
- `default._bimi.mtendereeducationconsult.com` TXT `v=BIMI1; ...` as an optional warning check
- SPF and DMARC records for `notifications`, `support`, `admissions`, `billing`, and `marketing` sending subdomains

The last known local DNS audit showed `mail.mtendereeducationconsult.com` pointing to the wrong target. Fixing that record requires a Cloudflare token with DNS edit permission.

## Reliability Controls

The email health payload now exposes:

- `reliability.sent`
- `reliability.delivered`
- `reliability.failed`
- `reliability.bounced`
- `reliability.spamComplaints`
- `queueOperations.deadLetter`
- `queueOperations.congestion`
- `alerts`
- `deliverability`

Alert codes include:

- `email_provider_unavailable`
- `email_dry_run_enabled`
- `email_dead_letter_jobs`
- `email_queue_congestion`
- `email_bounce_rate_high`
- `email_spam_complaints_high`
- `email_dns_not_ready`

## Notification Center Readiness

`server/notifications.ts` adds a unified notification contract. Email is active and routes to the queue. SMS and WhatsApp use configured provider adapters and otherwise return explicit unsupported-channel responses, which prevents silent failures. Push remains provider-ready but unimplemented. Communication-layer in-app alerts are formatted into the admin notification feed instead of appearing as raw analytics JSON.

## Remaining Operational Work

- Add the Resend API key to Vercel production, preview, and development environments. Use SendGrid or SMTP only as fallback providers.
- Configure `mtendereeducationconsult.com` in Resend, add the returned DNS records to Cloudflare, and run Resend verification.
- Correct the Cloudflare `mail` CNAME target.
- Configure SendGrid Event Webhook to post delivery events into `/api/email/webhooks/sendgrid` if that route is enabled in the deployment.
- Move DMARC from `p=none` to `p=quarantine`, then `p=reject` after bounce and complaint rates are stable.
- Add a scheduled queue drain if Vercel cold starts are not enough for high-volume marketing campaigns.
- Configure and smoke-test the selected SMS/WhatsApp provider before enabling high-priority security/payment text delivery in production.
- Complete provider dashboards for dedicated IP reverse DNS if monthly volume moves toward high-scale dedicated sending.
