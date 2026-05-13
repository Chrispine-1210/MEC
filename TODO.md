# Delivery TODO

## Completed (2026-05-11)
- [x] Add stack baseline document (`SCHOOL_MANAGEMENT_TECH_STACK.md`)
- [x] Add CI workflow (`.github/workflows/ci.yml`)
- [x] Add containerization assets (`Dockerfile`, `.dockerignore`, `docker-compose.yml`)
- [x] Add Kubernetes deployment templates (`k8s/`)
- [x] Add observability baseline (`/metrics` + request/error instrumentation)
- [x] Add Redis-ready cache layer with safe memory fallback
- [x] Add unit-test baseline and `npm test` harness
- [x] Sanitize `.env.example` and align env keys to runtime

## Next Priorities
- [x] Enforce MFA for privileged roles across admin/editor protected routes
- [x] Add integration tests for auth + RBAC + MFA challenge flow
- [x] Add E2E smoke suite for login and admin pages with automated app startup
- [x] Add integration coverage for explicit per-endpoint permission guards and MFA-verified token enforcement
- [x] Add Sentry error tracking with environment gating
- [ ] Add Redis-backed session persistence (beyond cache abstraction)
- [ ] Implement school-specific modules (attendance, timetable, exams, fees, library, transport)
- [ ] Finalize Next.js SSR migration strategy (or formally keep Vite)
