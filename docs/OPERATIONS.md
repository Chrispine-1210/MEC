# Operations Guide

## Local Development
- Install dependencies: `npm ci`
- Install Admin dependencies: `npm ci --prefix ./Admin`
- Start backend + admin dev servers: `npm run dev:all`

## Quality Gates
- Unit tests: `npm test`
- Integration tests: `npm run test:integration`
- E2E smoke tests (build + auto-start app): `npm run test:e2e`
- Typecheck: `npm run check`
- Production build: `npm run build`

## E2E Runtime Notes
- E2E defaults to dedicated port `5050` to avoid colliding with local dev servers.
- E2E sets `SKIP_DB_SCHEMA_BOOTSTRAP=1` and `REDIS_URL=` so smoke UI checks do not depend on database or Redis availability.

## Container Runtime
- Build and start stack (app + Redis + Prometheus + Grafana): `docker compose up --build`
- App: `http://localhost:5000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (admin/admin)

## Metrics
- Prometheus endpoint: `GET /metrics`
- Health endpoint: `GET /api/health`

## Error Tracking
- Configure `SENTRY_DSN` to enable Sentry.
- Optional tuning:
  - `SENTRY_ENVIRONMENT`
  - `SENTRY_TRACES_SAMPLE_RATE`

## MFA Operations
- Current handoff mode: admin MFA enforcement is disabled so available
  administrator credentials can access the admin portal immediately.
- To keep MFA disabled, set `ADMIN_TWO_FACTOR_REQUIRED=false` in the runtime
  environment and keep Admin Settings → Security → Two-factor authentication off.
- To re-enable MFA in the next security update, set
  `ADMIN_TWO_FACTOR_REQUIRED=true` or remove the env override and enable the
  Admin Settings toggle. Keep `MFA_ENCRYPTION_KEY` configured before enabling
  setup in production.
- Check MFA status: `GET /api/auth/mfa/status`
- Start MFA setup: `POST /api/auth/mfa/setup`
- Enable MFA: `POST /api/auth/mfa/enable`
- Disable MFA: `POST /api/auth/mfa/disable`
- Complete login challenge: `POST /api/auth/mfa/verify`

When enforcement is disabled, previously enrolled MFA secrets are preserved but
not required for login or privileged admin actions. This keeps the next MFA
rollout reversible without forcing administrators through setup during the
current handoff.

## Email Action Links
- Confirmation, unsubscribe, preference, and account verification links must
  point to the application/API host, not a tracking-only host.
- `EMAIL_LINK_BASE_URL` is for branded provider tracking diagnostics only. Do
  not use it as `PUBLIC_APP_URL`, `API_APP_URL`, `FRONTEND_URL`, or
  `VITE_SITE_URL`.
- Supported public aliases include `/verify-email/:token`,
  `/email/verify/:token`, `/email/preferences/:token`,
  `/email/unsubscribe/:token`, `/subscribers/verify/:token`,
  `/newsletter/verify/:token`, and `/newsletter/unsubscribe/:token`.

## Incident Response
- Use the incident procedures in `docs/INCIDENT_RUNBOOK.md`.

## Kubernetes
Apply manifests in order:
1. `kubectl apply -f k8s/namespace.yaml`
2. `kubectl apply -f k8s/configmap.yaml`
3. Create secret `mec-secrets` with production credentials
4. `kubectl apply -f k8s/deployment.yaml`
5. `kubectl apply -f k8s/service.yaml`
6. `kubectl apply -f k8s/ingress.yaml`
7. `kubectl apply -f k8s/hpa.yaml`
