# Resend Production Recovery

## Verified Incident State

On 2026-07-18, the production health endpoint reported Resend as configured, but the Resend sender-domain request returned `API key is invalid`. Subscription records are therefore saved while their confirmation jobs fail provider delivery. This is a provider credential failure, not a newsletter form validation failure.

## Required Production Changes

1. Rotate the previously exposed Resend key in the Resend dashboard. Create a fresh sending-capable key and delete the exposed key.
2. In Vercel Production, set the fresh key as `RESEND_API_KEY`. Do not add it to source control, `.env.example`, or deployment logs.
3. Verify `notifications.mtendereeducationconsult.com` in Resend and publish its required SPF and DKIM records. Keep a DMARC policy at the organisational domain.
4. Set these Vercel Production values:

```env
EMAIL_PROVIDER_ORDER=resend,sendgrid,smtp,postmark,ses,custom
EMAIL_DRY_RUN=false
EMAIL_FROM=Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>
EMAIL_LINK_BASE_URL=https://links.mtendereeducationconsult.com
ADMIN_VIEWER_EMAILS=
ADMIN_WRITER_EMAILS=
ADMIN_EDITOR_EMAILS=
ADMIN_ADMIN_EMAILS=
ADMIN_SUPER_ADMIN_EMAILS=
```

Each role variable accepts one or more comma-, newline-, or semicolon-separated inboxes. Active MEC accounts with the corresponding role are included automatically; `ADMIN_NOTIFICATION_EMAIL` remains the fallback when no role inbox is available.

5. Deploy the commit containing the fail-closed activation check. A Resend domain/API-key check that is missing, invalid, or unverified will then report `email.ready: false` and provide a blocking reason instead of a false ready state.

## Release Verification

1. Check `GET /api/health`. Confirm `email.ready`, `email.activation.ready`, and `email.activation.resendDomain.ready` are all `true`, with `activeProviders` containing only the intended live provider.
2. Submit a subscription using a controlled inbox. Confirm the email job is `sent`, has `provider: resend`, and has a provider message ID.
3. Check the Resend activity log for the same message ID, then confirm inbox or spam-folder receipt.
4. Trigger an email failure in a non-production test environment. Confirm the alert is queued once per unique configured role inbox and visible in the corresponding admin notification feed.
5. Verify the sender domain's SPF, DKIM, and DMARC results from a received message's authentication headers before treating the release as deliverability-complete.
