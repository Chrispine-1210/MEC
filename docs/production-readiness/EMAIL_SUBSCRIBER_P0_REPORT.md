# Email Delivery and Subscriber Capture P0 Report

Date: 2026-07-18

## Executive Status

Subscriber persistence and Admin Portal visibility have separate root causes from email delivery.

- Subscriber persistence uses the production PostgreSQL database through Drizzle. It is not an in-memory production collection.
- The Admin API already returned subscriber records, but the Admin client had no subscriber route, navigation item, or page. Saved records therefore had no portal view.
- Production email health is fail-closed and reports Resend as the active provider, but Resend rejects the configured credential with `API key is invalid`.
- SendGrid is not configured as an active production provider. Empty SendGrid activity is expected while the application sends through Resend.
- Gmail inbox placement cannot be evaluated until a provider accepts a production message.

## Root Causes

### Email delivery

**Failing component:** Vercel Production `RESEND_API_KEY`.

Production evidence from `GET https://www.mtendereeducationconsult.com/api/health`:

- Deployment commit: `026f4e12072d10b94fc814d2dea727beaf1f5fce` at the start of this audit.
- Database: ready through `POSTGRES_URL_NON_POOLING`.
- Active email provider: `resend`.
- Email readiness: `false`.
- Resend sender-domain/API check: `API key is invalid`.

The provider rejects the request before Gmail, Outlook, Yahoo, or another mailbox provider can classify the message as delivered, deferred, spam, or inbox.

### Subscriber visibility

**Failing component:** missing Admin client integration.

The following backend path existed and was durable:

```text
POST /api/subscribers
  -> request and bot validation
  -> PostgreSQL subscribers insert/update
  -> email preference persistence
  -> durable email job
  -> inline provider attempt
```

The protected `GET /api/admin/subscribers` endpoint also existed, but no Admin page consumed it. This audit adds the missing route, navigation, filters, summary metrics, CSV export, realtime invalidation, and polling fallback.

## Implemented Fixes

1. Replaced the race-prone find-then-insert subscriber write with a PostgreSQL `ON CONFLICT` upsert keyed by normalized email.
2. Preserved successful subscriber capture when email orchestration fails and return an accurate `202` response in that state.
3. Added stage-level analytics for validation, persistence, email status, and failures without storing subscriber email in analytics metadata.
4. Added a durable, non-PII Admin notification and a `subscribers` realtime channel.
5. Added an Admin-only Subscribers page with:
   - exact total, active, pending, unsubscribed, and new-today counts;
   - status and source filters;
   - search and pagination;
   - CSV export;
   - desktop and mobile responsive layout;
   - 30-second fallback polling when realtime transport is unavailable.
6. Added subscriber counts to the existing Admin dashboard response.
7. Corrected Resend DNS diagnostics to check the provider's real topology:
   - SPF and MX at `send.<sending-domain>`;
   - DKIM at `resend._domainkey.<sending-domain>`.
8. Kept subscriber records and CSV export behind the existing `admin`/`super_admin` plus MFA guard.

## DNS and Authentication Findings

Live Windows DNS resolution produced the following evidence:

| Check | Status | Evidence |
|---|---|---|
| Resend SPF | Pass | `send.notifications.mtendereeducationconsult.com` publishes `v=spf1 include:amazonses.com ~all` |
| Resend return path | Pass | MX routes to `feedback-smtp.us-east-1.amazonses.com` |
| Resend DKIM | Pass | `resend._domainkey.notifications.mtendereeducationconsult.com` publishes a public key |
| Organizational DMARC | Pass, monitoring | `_dmarc.mtendereeducationconsult.com` publishes `v=DMARC1; p=none;` |
| SendGrid link branding | Pass | `links` and `54085667` point to `sendgrid.net` |
| SendGrid return path | Pass | `mail` points to `u54085667.wl168.sendgrid.net` |
| SendGrid DKIM | Pass | `mtd1` and `mtd12` selectors point to SendGrid |
| Root SPF | Not present | Root TXT contains Google site verification only |

The root SPF absence does not explain the current Resend API rejection. Resend authenticates the custom return path under `send.notifications...` and DKIM under the `notifications...` sending domain. Add or change root SPF only after inventorying every root-domain sender; never publish multiple SPF records.

DMARC should remain at monitoring until successful authenticated traffic and aggregate reports are reviewed, then progress to `quarantine` and `reject` deliberately.

References:

- [Resend domain management](https://resend.com/docs/dashboard/domains/introduction)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126)
- [SendGrid domain authentication](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)

## Reliability and Deliverability Controls

The existing email platform already provides:

- durable database-backed jobs;
- inline transactional delivery;
- exponential retry scheduling and dead-letter status;
- provider failover and circuit breakers;
- plaintext and HTML bodies;
- standards-compliant Message-ID generation;
- List-Unsubscribe and one-click unsubscribe headers for commercial mail;
- delivery, bounce, complaint, defer, open, and click event storage;
- hard-bounce and repeated-soft-bounce suppression;
- signed provider webhook support;
- Admin email health, diagnostics, readiness, and communication analytics APIs.

Vercel runs transactional attempts inline and drains retry/backlog jobs through `/api/email/queue/drain`. The current cron runs daily, so a transient failure can wait until the next scheduled drain. Reassess the schedule or move to a persistent worker when the Vercel plan and campaign volume support it.

## Verification Evidence

| Verification | Result |
|---|---|
| TypeScript check | Pass |
| Admin TypeScript check | Pass |
| Unit tests | Pass: 37/37 |
| Focused email/subscriber tests | Pass: 22/22 |
| Integration tests | Pass: 8/8 |
| Platform smoke test | Pass: 1/1 |
| Vercel client/Admin/server build | Pass |
| Serverless backend bundle | Pass |
| Secret scan of changed diff | Pass: no provider/API/private-key patterns found |
| Browser E2E | Blocked before assertions: local runtime could not reach Neon (`ETIMEDOUT`) |
| Live production database health | Pass |
| Live Resend credential | Fail: invalid API key |
| Provider acceptance | Not verified |
| Gmail inbox receipt | Not verified |
| Outlook/Yahoo/custom-domain receipt | Not verified |
| Live Admin subscriber count comparison | Not verified; requires authenticated Admin session |

## Production Recovery Procedure

1. Revoke the previously exposed Resend key and create a fresh sending-capable key in Resend.
2. Set the fresh key as Vercel Production `RESEND_API_KEY`. Do not place it in source, chat, screenshots, or logs.
3. In Resend, confirm `notifications.mtendereeducationconsult.com` has status `verified`.
4. Keep these Vercel Production values:

```env
RESEND_DOMAIN=notifications.mtendereeducationconsult.com
EMAIL_FROM=Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>
EMAIL_PROVIDER_ORDER=resend,sendgrid,smtp,postmark,ses,custom
EMAIL_DRY_RUN=false
EMAIL_LINK_BASE_URL=https://links.mtendereeducationconsult.com
```

5. Redeploy the latest `main` commit.
6. Confirm `/api/health` reports:

```text
email.ready = true
email.activation.ready = true
email.activation.resendDomain.ready = true
email.activeProviders includes resend
```

7. Submit one controlled Gmail subscription and capture its returned subscriber ID and email job ID.
8. Confirm the same subscriber appears at `/admin/subscribers` and through `GET /api/admin/subscribers`.
9. Confirm the email job has `status=sent`, `provider=resend`, a non-null provider message ID, and no final error.
10. Match that provider message ID in Resend logs, then confirm delivered status and actual inbox/spam placement.
11. Repeat with Outlook, Yahoo, and a controlled custom-domain mailbox.
12. Inspect authentication headers from received messages for SPF, DKIM, and DMARC pass/alignment before closing the incident.

## Completion Status

Code remediation and automated regression verification are complete. The P0 incident is **not operationally closed** because the production Resend credential is invalid and real mailbox receipt has not been demonstrated.
