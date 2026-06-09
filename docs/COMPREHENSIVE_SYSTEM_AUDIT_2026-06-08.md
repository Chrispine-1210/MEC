# Mtendere Platform Comprehensive System Audit

Reviewed: 2026-06-08

This report records the audit and hardening pass requested for the Mtendere Education Platform. It is evidence-based on local source review, TypeScript compilation, unit tests, production builds, dependency audit, static scans, and targeted fixes. It is not a substitute for a formal penetration test, legal opinion, or live production monitoring review.

## Executive Summary

The platform has a solid production foundation: React/Vite frontends, an Express API, Drizzle/PostgreSQL data layer, email queueing, JWT access tokens, refresh cookies, MFA support, RBAC, Helmet security headers, CORS controls, rate limiting, upload restrictions, audit logging, SEO rendering, and unit tests for cache, communication, email, auth verification, and observability.

This pass found and fixed several high-confidence issues:

- Admin TypeScript failed in `Admin/client/src/pages/admin/communications.tsx` because Set/Map iteration did not match the Admin compiler target.
- Duplicate auth middleware used a hardcoded JWT fallback secret.
- General uploads trusted declared MIME type too heavily.
- Public navigation lacked route-level scroll restoration behavior.
- Public login had no visible remember-me control.
- Public trust/legal pages were missing.

## Automated Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Root TypeScript | Pass | `npm run check` |
| Admin TypeScript | Pass after fix | `npm run check --prefix Admin` |
| Unit tests | Pass, 14/14 | `npm run test:unit` |
| Dependency audit | Pass | `npm audit --audit-level=moderate` found 0 vulnerabilities |
| Production build | Pass before trust-page build recheck | `npm run build` built public, admin, and server bundles |
| SEO governance audit | Needs live server | Initial run against `http://localhost:5000` produced zero crawled pages because no server was serving that URL |

Important environment note: tests warned that local Node.js was 24.13.0 while `package.json` declares `>=20 <23`. Use Node 20 or 22 LTS for production parity.

## Architecture Audit

### Frontend

- Public app: React 18, TypeScript, Vite, Wouter, TanStack Query, shadcn/Radix UI, Tailwind.
- Admin app: separate Vite/React app under `Admin/`, with duplicated UI/lib/server patterns.
- Strengths: componentized pages, SEO component, reusable UI primitives, conversion tracking, autosaved application drafts, route SEO metadata.
- Risks: public and Admin apps duplicate auth/upload/query patterns, increasing drift risk. Large vendor chunks exist, especially Radix/chart bundles.

### Backend

- Express API with security middleware, route-level auth, RBAC, MFA, email, communication automation, referral payments, media assets, analytics, and runtime migrations.
- Strengths: validated payloads with Zod, strong password rules, email verification, password reset, refresh-token rotation, admin role checks, noindex handling, request IDs.
- Risks: several stateful security controls use in-memory maps. They will not coordinate across multiple instances without Redis or a database-backed store.

### Database

- Drizzle ORM and migrations exist for core platform, email, events, partners, MFA, communications, and governance.
- Strengths: schema is versioned; runtime migration support reduces deployment drift.
- Risks: query-level performance was not measured against production data. Add slow query logging and EXPLAIN plans for admin dashboards, search, analytics, and exports.

### Email and Notifications

- Email queue supports provider failover and diagnostics.
- Unit tests cover provider failover, retries, cron authorization, verification, and newsletter flow.
- Risks: deliverability depends on configured provider keys, DNS records, and production monitoring.

## Security Assessment

### Existing Controls

- Helmet security headers and CSP.
- CORS allowlist and trusted production host logic.
- Rate limiting for auth, admin, and API scopes.
- JWT access tokens with password fingerprint invalidation.
- Refresh-token cookie rotation and reuse detection.
- MFA support for sensitive roles.
- Password strength validation and login lockout.
- Upload size limits and static upload hardening.
- Admin RBAC and permission catalogs.
- Audit/security event logging.

### Fixes Implemented

- Removed hardcoded JWT fallback secret from duplicated auth middleware.
- Added stricter token payload parsing.
- Added upload extension validation plus file magic-byte validation for PDF, DOC, DOCX, JPG, PNG, WEBP, and Admin image uploads.
- Invalid upload content is now deleted and rejected with HTTP 400.
- Added remember-me behavior with session-only refresh cookies when disabled.

### Remaining Security Work

- Replace in-memory rate limit/login failure/refresh reuse stores with Redis or database-backed stores before horizontal scaling.
- Revisit CSP. Current `script-src` includes `'unsafe-inline'`; removing it will require nonce/hash support and moving inline HTML scripts where possible.
- Add CSRF tokens for any cookie-authenticated mutating endpoint if broader cookie-authenticated APIs are introduced.
- Run a formal penetration test covering SQL injection, XSS, CSRF, SSRF, auth bypass, privilege escalation, session hijacking, upload abuse, and API abuse.
- Add automated SAST/DAST in CI.

## Performance Assessment

### Observed

- Public build produced a main app chunk around 562 KB and Radix vendor around 243 KB before gzip.
- Admin build produced a chart vendor chunk around 403 KB, Radix vendor around 273 KB, and main admin chunk around 384 KB before gzip.
- Large media assets exist, including one public image near 928 KB in the build output.

### Recommendations

- Lazy-load heavy public routes such as dashboard, referrals, blog detail, partner detail, and AI chat.
- Lazy-load Admin chart-heavy routes and management modules.
- Continue converting large content images to WebP/AVIF and responsive sizes.
- Add production performance budgets for JS, CSS, image sizes, LCP, CLS, INP, API p95 latency, and error rate.
- Add database query timing and slow-query alerts.

## UX Assessment

### Existing Strengths

- Registration has inline validation, password strength feedback, confirm-password checks, loading state, and email verification messaging.
- Login has password visibility toggle, reset link, success notices, and now a remember-device option.
- Application dialogs include autosave, structured sections, consent, file uploads, progress feedback, and success/failure toasts.
- Contact form has inline validation, consent, recaptcha hook, conversion tracking, and fallback acknowledgement handling.

### Fixes Implemented

- Added navigation memory: new route navigation scrolls to top, browser back/forward restores prior scroll position.
- Added public trust/legal pages for policy clarity and institutional confidence.

### Remaining UX Work

- Add full E2E coverage for registration, login, logout, reset, profile update, application submission, uploads, contact, payments, email verification, and Admin workflows.
- Add accessibility pass with keyboard-only testing, screen reader labels, focus order, color contrast, and dialog escape paths.
- Standardize form error summaries for long forms.

## Reliability and Observability

### Existing

- Request IDs on API responses.
- Prometheus metric rendering unit tests.
- Email queue health and diagnostics.
- Incident runbook documentation exists.
- Runtime database schema checks.

### Recommendations

- Configure Sentry or equivalent in production with release/environment tags.
- Add uptime checks for `/health`, homepage, login, admin login, email queue health, and database health.
- Add structured logs shipped to a central sink.
- Define alert thresholds for p95 latency, 5xx rate, failed logins, email queue backlog, upload failures, and DB errors.

## Compliance Review

Reference sources consulted:

- Malawi Data Protection Act, 2024: https://www.malawi.gov.mw/index.php/resources/publications/acts?download=153%3Adata-protection-act-2024
- Malawi Data Protection Authority downloads: https://www.dpa.mw/downloads/
- Electronic Transactions and Cyber Security Act, 2016: https://malawilii.org/akn/mw/act/2016/33/eng%402017-12-31

Implemented during this pass:

- Privacy Policy public page.
- Terms of Service public page.
- Security page.
- Privacy Center.
- Transparency Center.
- Compliance page.
- Standalone policy drafts in `docs/legal/`.

Required before final legal publication:

- Counsel review for Malawi law, cross-border data transfers, education partner disclosures, payment/referral terms, consumer protection, and dispute language.
- Formal retention schedule.
- Data processing register.
- Data subject request workflow with identity verification and response SLA.
- Incident and breach notification workflow.

## Smoke Test Matrix

| Workflow | Status | Notes |
| --- | --- | --- |
| Homepage | Build verified | Needs browser E2E |
| Registration | Static/server reviewed | Email verification tests pass |
| Login | Static/server reviewed | Remember-me added; needs browser E2E |
| Logout | Static reviewed | Clears refresh cookie and local token |
| Password reset | Static/server reviewed | Needs browser E2E |
| Profile update | Not fully verified | Add E2E |
| Application submission | Static reviewed | Upload hardening added |
| Document upload | Hardened | Needs browser/upload E2E |
| Contact forms | Static reviewed | Existing validation and recaptcha hook |
| Payment workflows | Static reviewed only | Requires Stripe test credentials |
| Email verification | Unit tested | Pass |
| Admin dashboard access | Static reviewed | Admin typecheck pass |
| User management | Static reviewed | Requires seeded admin account for E2E |
| Student/application management | Static reviewed | Add E2E |
| Data exports | Static reviewed | Add authorization and CSV tests |
| Email management | Unit/static reviewed | Add admin browser tests |
| Notifications | Static reviewed | Add E2E |
| Audit logs | Static reviewed | Add authorization tests |

## Technical Debt Report

1. Public and Admin code duplication for auth, uploads, query clients, rich text, and UI shell behavior.
2. In-memory security/rate-limit/session state blocks reliable multi-instance scaling.
3. E2E test spec exists but no root script or visible Playwright dependency in `package.json`.
4. CSP still permits inline scripts.
5. SEO audit script should start or verify the target server before crawling.
6. Admin app has separate server code that may drift from the main platform server.
7. Large JS/image bundles need budgets and route-based loading.

## Implementation Roadmap

### Immediate

- Run full production build after every trust/legal or route change.
- Add Playwright dependency/config/scripts and cover auth smoke flows.
- Configure Node 20 or 22 LTS locally and in CI.
- Run live SEO audit against a running local server.

### Next 2-4 Weeks

- Move rate limiting, login failures, refresh-token reuse, and cache state to Redis or database-backed stores.
- Add Sentry/log drain and dashboards for API latency, 5xx, auth failures, email queue, and database health.
- Add route-level code splitting and image optimization budget checks.
- Add formal privacy request workflow and retention register.

### Next Quarter

- Consolidate duplicate Admin/public server utilities.
- Commission penetration test and accessibility audit.
- Add CI SAST/DAST, dependency scanning, and smoke tests for every critical workflow.
- Build executive, admin, and technical observability dashboards.

## Final Deliverables Mapping

1. Full Audit Report: this file.
2. Security Assessment Report: security section above.
3. Performance Optimization Report: performance section above.
4. UX Improvement Report: UX section above.
5. Compliance Review Report: compliance section above.
6. Technical Debt Report: technical debt section above.
7. Smoke Test Results: smoke matrix above.
8. Privacy Policy Draft: `docs/legal/PRIVACY_POLICY_DRAFT.md` and `/privacy-policy`.
9. Terms of Service Draft: `docs/legal/TERMS_OF_SERVICE_DRAFT.md` and `/terms-of-service`.
10. Implementation Roadmap: roadmap section above.
