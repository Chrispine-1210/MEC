# Investor-Grade Platform Blueprint

Date: 2026-06-09

## 1. System Architecture Blueprint

```text
Users in Africa/mobile networks
  -> Regional CDN/edge cache
  -> Public web app / Admin web app
  -> API gateway / edge routing
  -> Node/Express API
      -> Auth, MFA, RBAC, admin audit
      -> Content/upload publishing
      -> Email orchestration queue
      -> WebSocket realtime hub
      -> Referral/payment abstraction
      -> Observability metrics endpoint
  -> Primary Postgres region
      -> Read replicas per expansion region
      -> Queue/event replication for async workflows
  -> Email providers
      -> SendGrid primary
      -> AWS SES fallback
      -> Webhooks into /api/email/webhooks/:provider
  -> Object/media storage + CDN
  -> Monitoring and alerting
```

Target regions:
- West Africa: Nigeria/Ghana edge and future application replica.
- Southern Africa: South Africa primary or replica for Malawi/SADC latency.
- East Africa: Kenya edge and future application replica.

## 2. CI/CD Pipeline Definition

Implemented gate: `.github/workflows/platform-gates.yml`

Stages:
1. Install: `npm ci`
2. Browser install: `npx playwright install --with-deps chromium`
3. Type check: `npm run check`
4. Unit tests: `npm run test:unit`
5. Integration tests: `npm run test:integration`
6. Build: `npm run build`
7. Predeploy validation: `npm run predeploy:validate`
8. Playwright E2E: `npm run test:e2e`
9. Production readiness: strict SendGrid + SES + DNS gate on `main`
10. Deployment gate: fails if validation, E2E, or production readiness fails

## 3. Email Routing Architecture

Provider order defaults to:

```text
SendGrid -> SES -> Mailgun -> Resend -> Postmark -> SMTP -> Custom
```

Runtime behavior:
- The email queue creates durable `email_jobs`.
- The router retries each provider inline with `EMAIL_PROVIDER_INLINE_RETRIES`.
- If a provider still fails, the router records `provider_failed` and moves to the next provider.
- If a later provider succeeds, the router records `provider_failover_triggered`.
- Provider webhooks record delivered, opened, clicked, bounced, spam complaint, suppression, and unsubscribe events.
- Provider webhooks accept HMAC-signed payloads through `x-mec-webhook-signature`.
- Health reports provider success, failover, bounce, and latency metrics.

Production safety:
- `EMAIL_DRY_RUN=false`
- `EMAIL_ALLOW_LIVE_TEST_SENDS=true`
- `EMAIL_ACTIVATION_REQUIRES_DNS_READY=true`
- SendGrid and SES credentials must both be configured for strict readiness.

User access policy:
- Public account creation activates the account immediately for usability.
- Email verification is queued as a non-blocking trust step and can be completed later.
- Admin, suspension, MFA, and RBAC restrictions remain blocking controls.

## 4. Deployment Strategy

Preferred: canary deployment.

Flow:
1. Build immutable release artifact.
2. Deploy canary at 5% traffic.
3. Run smoke checks against `/api/health`, `/api/metrics`, auth, registration, and admin login.
4. Monitor error rate, latency, provider failover, queue congestion, and DNS readiness.
5. Increase to 25%, 50%, then 100% when metrics remain healthy.
6. Roll back instantly by routing traffic back to the previous deployment.

Rollback triggers:
- E2E failure
- API 5xx spike
- login/session failure
- email activation not ready
- SendGrid + SES both unavailable
- queue dead-letter growth

## 5. Africa Scaling Strategy

Low bandwidth:
- CDN-first static assets.
- Split vendor bundles and cache immutable assets.
- Keep API payloads compact.
- Prefer progressive rendering and avoid blocking large media.

Mobile-heavy usage:
- Prioritize registration, verification, login, applications, and admin publishing flows on mobile.
- Use resilient retry for failed writes.
- Preserve form state locally before large uploads.

Intermittent connectivity:
- Queue non-critical client actions locally.
- Show explicit failure states instead of silent retries.
- Use graceful degradation when realtime/WebSocket connection drops.

Database:
- Start with one strongly consistent primary.
- Add read replicas for regional read-heavy traffic.
- Move cross-region workflow processing to event queues before active-active writes.

Payments:
- Keep Stripe as current card/payment backbone.
- Add payment abstraction hooks for M-Pesa, Airtel Money, and local bank/manual reconciliation.
- Store currency as ISO code and avoid hardcoding USD-only assumptions.

## 6. Risk Report

Current high-priority risks:
- DNS readiness still depends on external zone records and Cloudflare permissions.
- SES production delivery requires AWS SES domain verification, DKIM, SNS webhooks, and quota approval.
- True multi-region canary needs cloud routing resources not available in this local repo.
- Playwright E2E depends on a real CI Postgres service and browser installation.
- Node runtime should stay on Node 22 until the project engine range is updated.
- Local E2E requires either Docker/local Postgres credentials or `DATABASE_DRIVER=pg` with a reachable Postgres URL.

Mitigations implemented:
- CI gate blocks deployment if Playwright E2E fails.
- Strict predeploy gate blocks production if SendGrid + SES or DNS are not ready.
- Registration can block account creation when transactional email activation is unsafe.
- Metrics endpoint exposes request counters, durations, and error counters.
- Email health exposes provider counts, latency, bounce rate, and failover rate.
- Database bootstrap supports Neon for hosted environments and `pg` for localhost/CI Postgres.
