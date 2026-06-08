# Email Infrastructure Documentation

Date: 2026-06-01

## Runtime

- Email dispatch uses `server/email.ts`.
- Emails are queued in memory per function invocation, retried up to three times, and logged to `data/email-events.jsonl` using Vercel-safe writable paths.
- Provider delivery supports SendGrid, Resend, Postmark, Amazon SES, SMTP, and a custom HTTP fallback through `EMAIL_API_URL` and `EMAIL_API_KEY`.

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

## Production DNS

Before final launch, verify:

- Resend has `mtendereeducationconsult.com` added under Domains.
- The Resend DNS records returned for `mtendereeducationconsult.com` are present in Cloudflare.
- SPF includes the selected email provider.
- DKIM keys are active.
- DMARC has at least monitoring policy, then enforcement after deliverability is stable.
- `EMAIL_FROM` uses `Mtendere Education Consult <onboarding@resend.dev>` only for initial Resend testing, then switches to a verified Mtendere sender domain.
- `ADMIN_NOTIFICATION_EMAIL` is set to the operations inbox.

Use this helper with a full-access Resend API key:

```powershell
npm run resend:domain:configure
```

To also apply the returned DNS records to Cloudflare and trigger Resend verification:

```powershell
npm run resend:domain:configure:cloudflare
```
