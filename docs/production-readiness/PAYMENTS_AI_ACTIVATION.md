# Payments and AI Production Activation

## Verified root causes

- Production variables named `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `OPENAI_API_KEY` existed in Vercel but had no usable values at the time of the audit.
- Checkout accepted amount, currency, product, and redirect URLs from the browser.
- Stripe webhooks acknowledged requests before processing and continued work with `setImmediate`, which is not durable in a serverless invocation.
- Payment Intent and Checkout Session events could create separate records or regress a paid payment when Stripe delivered events out of order.
- Public AI returned local canned text when OpenAI was unavailable, making provider failure look successful.
- AI conversations and memory were written to an ephemeral JSON file and public conversation IDs had no ownership proof.

## Implemented controls

### Payments

- Server-owned payment catalog and pricing.
- Production live-key enforcement; Stripe test mode cannot activate production checkout.
- Provider account, charges, webhook URL, and subscribed-event readiness checks.
- UUID idempotency keys and durable pre-checkout payment records.
- Signed webhook verification followed by synchronous durable claim and processing before HTTP acknowledgement.
- Retryable Stripe event inbox with stale-claim recovery and reconciliation.
- Monotonic payment status rules, durable status history, refund/dispute handling, and commission idempotency.
- MEC integration markers plus exact user, amount, currency, and product matching before provider events can settle a payment.
- Customer cancellation reconciliation, cumulative partial-refund accounting, and proportional wallet/commission reversals.
- Durable receipt claims and retryable communication handoff.
- Authenticated checkout reconciliation on the success page.
- Admin payment diagnostics, summary, search, receipt state, webhook failure state, and manual reconciliation.
- Admin method/date filters, authenticated CSV export, sanitized webhook history, and idempotent Stripe refund requests.
- Atomic wallet reservation and one-time payout approve/reject transitions.

### AI

- OpenAI Responses API with `store: false`, bounded output, configured timeout/retries, and hashed `safety_identifier`.
- Real server-sent token streaming.
- Explicit `503` when OpenAI is not configured and `502` when the provider rejects or interrupts a request.
- Local responses limited to governed security refusals and automated tests; there is no production fallback that impersonates OpenAI.
- PostgreSQL conversations, memory, audit history, retention dates, and usage records.
- User messages committed before provider work, with completed/failed turn states, retry support, stop propagation, durable reload, close, and deletion controls.
- Authenticated owner checks and high-entropy anonymous conversation tokens stored only as HMAC hashes.
- Per-actor hourly limits, a platform daily token ceiling, token/latency/provider accounting, and Admin diagnostics.
- Database advisory locks for concurrent conversation updates and retention cleanup controls.

## Required production variables

Set fresh secrets directly in Vercel. Never commit or paste them into source files.

```env
PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=<fresh sk_live key>
STRIPE_WEBHOOK_SECRET=<signing secret for the production endpoint>
STRIPE_WEBHOOK_URL=https://www.mtendereeducationconsult.com/api/stripe/webhook
STRIPE_DEFAULT_CURRENCY=USD
PAYMENT_APPLICATION_SUPPORT_AMOUNT=5000
PAYMENT_APPLICATION_SUPPORT_CURRENCY=USD

AI_CHAT_ENABLED=true
OPENAI_API_KEY=<fresh project key>
OPENAI_MODEL=gpt-4o-mini
OPENAI_FALLBACK_MODEL=
OPENAI_MAX_OUTPUT_TOKENS=700
OPENAI_INPUT_COST_PER_MILLION_USD=<current input price for the configured model>
OPENAI_OUTPUT_COST_PER_MILLION_USD=<current output price for the configured model>
AI_CHAT_RETENTION_DAYS=90
AI_CHAT_AUTHENTICATED_REQUESTS_PER_HOUR=60
AI_CHAT_ANONYMOUS_REQUESTS_PER_HOUR=15
AI_CHAT_DAILY_TOKEN_LIMIT=100000
```

Any secret previously pasted into chat, logs, tickets, or source control must be revoked before activation.

## Stripe endpoint

Create an enabled live-mode webhook endpoint at:

```text
https://www.mtendereeducationconsult.com/api/stripe/webhook
```

Subscribe it to:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
payment_intent.succeeded
payment_intent.processing
payment_intent.payment_failed
invoice.paid
invoice.payment_failed
charge.refunded
charge.dispute.created
```

Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` for Production only.

## Deployment verification

1. Run `npm run check`, `npm run test:unit`, `npm run test:integration`, and `npm run build:vercel`.
2. Run `PREDEPLOY_STRICT=true npm run predeploy:validate` with production variables available.
3. Apply `migrations/0013_payment_ai_reliability.sql` through the normal migration path; runtime migrations are also idempotent.
4. Deploy the resulting commit and inspect `/api/health`.
5. Confirm `payments.ready=true`, `payments.mode=live`, and `ai.ready=true`.
6. Complete a low-value real Stripe Checkout payment with an owned test customer email. Confirm one `payments` row, a `paid` status event, a processed Stripe event, and a sent/queued receipt.
7. Confirm the transaction and webhook delivery in Stripe Dashboard, issue a partial refund, and verify `amount_refunded`, `partially_refunded`, and the proportional commission debit. Complete the refund and verify `refunded` once.
8. Cancel a second Checkout session and verify both Stripe and the local payment record close without a receipt.
9. Send a public AI message and confirm streamed deltas, a PostgreSQL conversation, an `ai_chat_usage` completion row, and the same conversation in Admin.
10. Stop and retry a generation, reload the page, and verify the user message and turn status survive in PostgreSQL.
11. Continue an anonymous conversation with its token; verify the same ID without the token returns `403`, then delete it and verify subsequent access returns `404`.

## Current acceptance status

Code-level activation and automated verification are complete only after all checks above pass. Real payment capture and live OpenAI output cannot be claimed until fresh provider credentials are configured and the real production smoke tests are observed.
