# Email Delivery and Subscriber Capture P0 Report

Date: 2026-07-18

## Executive Status

The production subscriber and email transport paths are operational on commit
`0a320b756a207648bb8e9ba9ce4b74d7af878521`.

- A live public subscription was durably upserted in PostgreSQL.
- The confirmation job was accepted by Resend on its first attempt.
- Resend reported the Gmail message as `delivered`.
- A signed Resend webhook reached Vercel, returned HTTP 200, and persisted a
  distinct `delivered` event with a durable provider event ID.
- Unsigned production webhook requests are rejected with HTTP 401.
- The Resend sending domain and sending-only production key are ready.
- The previously exposed Resend management key was revoked and replaced.

Two closure checks still require an authenticated user surface and must not be
reported as complete:

1. Visual Gmail folder placement (Inbox, Promotions, or Spam).
2. Visual comparison of the protected Admin Subscribers page with the database.

Provider `delivered` means Gmail's receiving server accepted the message; it is
not proof of a particular Gmail folder.

## Root Cause Analysis

### 1. Production provider credential

The earlier Vercel Production Resend credential was invalid. The API rejected
email before any mailbox provider could evaluate it. Production now uses a new
least-privilege `sending_access` key scoped to the verified sending domain.

### 2. Missing provider webhook

The Resend account had zero webhooks and Vercel's
`EMAIL_WEBHOOK_SIGNING_SECRET` was empty. MEC could record only its outbound
`sent` event even when Resend later delivered the message. SendGrid logs were
empty because SendGrid was not the active provider.

### 3. Subscriber Admin visibility

Subscriber writes were PostgreSQL-backed, but the Admin client had no
subscriber route, navigation entry, or page. Records could therefore exist
without a visible portal workflow. The Admin Subscribers page now consumes the
protected PostgreSQL-backed endpoint.

### 4. Delivery event misclassification

The existing mapper checked `deliver` before `delay`, causing Resend
`email.delivery_delayed` events to be counted as delivered. The matcher order
now records delays as `deferred` and provider failures as `failed`.

### 5. Domain state

Resend sending DNS was valid, but unused inbound receiving remained enabled and
failed, leaving the domain `partially_failed`. Receiving was disabled while
sending remained enabled; the domain now reports `verified`.

## Implemented Fixes

1. Durable PostgreSQL `ON CONFLICT` subscriber upsert keyed by normalized email.
2. Accurate HTTP 202 response when persistence succeeds but email orchestration
   fails; a successful send now returns HTTP 201.
3. Admin Subscribers route, page, navigation, RBAC/MFA guard, filters, search,
   pagination, CSV export, realtime invalidation, and polling fallback.
4. Subscriber counts in Admin dashboard data and non-PII notifications/logging.
5. Verified Resend sender-domain diagnostics for SPF, return path, and DKIM.
6. Rotated least-privilege Vercel Production Resend sending key.
7. Official Svix raw-body signature verification for Resend webhooks.
8. Fail-closed production webhook behavior when configuration or signatures are
   missing or invalid.
9. Additive `provider_event_id` column and partial unique index for durable,
   cross-instance webhook idempotency.
10. Retry-safe webhook event claim rollback when suppression side effects fail.
11. Delivery, defer, bounce, complaint, open, click, failure, and suppression
    webhook subscriptions.
12. Correct `email.delivery_delayed` and `email.failed` normalization.
13. Revoked the exposed Resend management key and removed the temporary pulled
    production environment file.

## Production Evidence

### Health and deployment

| Check | Result |
|---|---|
| Production commit | `0a320b756a207648bb8e9ba9ce4b74d7af878521` |
| Deployment | Vercel Production `READY` |
| Database | Ready via `POSTGRES_URL_NON_POOLING` / Neon |
| Email ready | `true` |
| Active provider | `resend` |
| Activation ready | `true` |
| Resend domain status | `verified_via_dns` |
| Credential scope | `sending_access` |
| Activation blockers | None |
| Webhook secret | Encrypted Vercel Production variable |
| Webhook status | Enabled |

### Controlled Gmail subscription

Recipient: controlled Gmail account supplied by the operator.

| Evidence | Result |
|---|---|
| Public API response | HTTP 201 |
| Subscriber ID | `1` |
| Subscriber status | `pending` (double opt-in awaiting link click) |
| Subscriber source | `production-p0-webhook-verification` |
| Email job ID | `bc67c508-ea60-4bc9-adf0-8fde86bc79e5` |
| Job status / attempts | `sent` / `1` |
| Provider | `resend` |
| Provider message ID | `5373a631-823d-4a60-88dd-a7ea6c7c7d3d` |
| Job error / failed time | `null` / `null` |
| Resend last event | `delivered` |
| MEC outbound event | Event `816`, `sent` |
| MEC provider event | Event `817`, `delivered` |
| Durable provider event ID | Present |
| Vercel webhook response | HTTP 200 in 33 ms |
| Unsigned webhook probe | HTTP 401 |

The production database contained nine subscriber rows at verification time;
all nine were pending double opt-in. Re-subscribing the controlled address
updated the existing row instead of creating a duplicate.

### Admin visibility

- The deployed `/admin/subscribers` application route returns HTTP 200.
- The page queries the protected `GET /api/admin/subscribers` endpoint.
- That endpoint reads `storage.getAllSubscribers()` from production PostgreSQL.
- Automated coverage proves a duplicate upsert remains one row and is returned
  immediately by the Admin endpoint.
- Direct PostgreSQL evidence proves the controlled row and exact database count.

An authenticated Admin browser session was unavailable during this run. No
production token was forged and MFA/RBAC was not weakened to manufacture a UI
screenshot. Visual Admin count comparison therefore remains operator-confirmed.

## Provider and DNS Findings

| Check | Status | Evidence |
|---|---|---|
| Resend sender domain | Pass | `notifications.mtendereeducationconsult.com` is verified |
| Resend SPF | Pass | `send.notifications...` includes `amazonses.com` |
| Resend return path | Pass | MX routes to the Resend/SES feedback host |
| Resend DKIM | Pass | `resend._domainkey.notifications...` is verified |
| Organizational DMARC | Monitoring | `_dmarc.mtendereeducationconsult.com` uses `p=none` |
| SendGrid provider | Inactive | Production health reports SendGrid unconfigured |
| SendGrid activity | Expected empty | MEC is sending through Resend |
| Reverse DNS / PTR | Not independently verified | Requires the actual outbound IP from received headers |
| Gmail SPF/DKIM/DMARC header alignment | Not inspected | Requires access to the received message headers |

Legacy SendGrid DNS records remain published, but they do not make SendGrid an
active runtime provider. Do not add a second SPF TXT record. Inventory all
senders before changing root SPF or progressing DMARC from monitoring to
`quarantine` and `reject`.

## Reliability and Security Controls

- Database-backed email jobs and delivery history.
- Inline transactional attempts on Vercel.
- Exponential retry scheduling and dead-letter state.
- Provider failover and circuit breakers.
- Plaintext and HTML MIME bodies.
- Standards-compliant Message-ID.
- List-Unsubscribe and one-click unsubscribe for commercial mail.
- Hard-bounce, complaint, suppression, and repeated-soft-bounce handling.
- Signed, timestamp-checked raw webhook verification.
- Durable replay protection using Resend's `svix-id`.
- Header injection normalization.
- Secrets stored outside source and exposed Resend credential revoked.

The Vercel build currently reports seven npm audit findings (two critical, four
high, one low). They predate this P0 path and require a separate dependency
impact audit; they are not silently classified as resolved.

## Verification Matrix

| Verification | Result |
|---|---|
| Root TypeScript | Pass |
| Admin TypeScript | Pass |
| Unit tests | Pass: 44/44 |
| Focused email/webhook/subscriber tests | Pass: 29/29 |
| Integration tests | Pass: 8/8 |
| Platform smoke test | Pass: 1/1 |
| npm 10 production `npm ci` lockfile dry run | Pass |
| Vercel clean `npm ci` | Pass: 535 packages |
| Vercel client/Admin/Node 20 server build | Pass |
| Changed-file credential scan | Pass: zero credential-shaped values |
| Live PostgreSQL additive migration | Pass: column and unique index present |
| Live subscriber persistence | Pass |
| Live Resend provider acceptance | Pass |
| Live signed webhook ingestion | Pass |
| Live Gmail receiving-server delivery | Pass (`delivered`) |
| Gmail folder placement | Not verified: no browser backend available |
| Outlook/Yahoo/custom mailbox tests | Not run |
| Live bounce simulation | Not run; automated suppression tests pass |
| Authenticated Admin visual count | Not verified: no Admin browser session |
| Browser E2E | Not run in this production verification session |

## Remaining Actions

1. Operator confirms the controlled email's Gmail folder and inspects original
   headers for SPF, DKIM, and DMARC pass/alignment.
2. Operator opens `/admin/subscribers` in an MFA-authenticated Admin session and
   confirms the count is nine and subscriber ID `1` has the verification source.
3. Repeat controlled inbox tests for Outlook, Yahoo, and a custom domain.
4. Execute a labeled Resend bounce simulation in a controlled environment and
   confirm suppression without polluting production subscriber data.
5. Review DMARC aggregate reports before increasing enforcement.
6. Audit and remediate the seven production dependency findings separately.
7. Reassess the daily Vercel queue-drain schedule as retry volume grows.

## Completion Status

The code, production provider, subscriber persistence, signed delivery-event
tracking, and Gmail receiving-server delivery are verified. The P0 is
**operational but not fully closed** until the operator confirms actual Gmail
folder placement and the protected Admin page in an authenticated session.

References:

- [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Resend webhook delivery guarantees](https://resend.com/docs/webhooks/introduction)
- [Resend webhook event types](https://resend.com/docs/webhooks/event-types)
- [Resend domain management](https://resend.com/docs/dashboard/domains/introduction)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126)
- [SendGrid domain authentication](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)
