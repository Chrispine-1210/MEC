# Smoke Test Report - 2026-06-09

## Scope

Reliability pass for Mtendere Education Platform core flows:

- Public registration and login
- Dashboard-equivalent authenticated API loading
- Public application submission
- Application confirmation email queue trigger
- Admin MFA login and application visibility
- Admin application status update
- Status-change email queue trigger
- Writer/viewer RBAC denial for admin application access
- Duplicate application failure handling
- Email queue retry/failover regression
- Vercel build and dry-run deployment validation
- DNS and live HTTP reachability checks

## Fix Applied

### Application Submission Email Queue Handling

**What broke:** Public application submission saved the application, then returned `503` when the confirmation email was queued instead of synchronously delivered.

**Why it broke:** `sendApplicationConfirmation()` queues email asynchronously by default, but the route treated any result other than immediate real provider delivery as a failed user flow.

**What changed:** The application route now treats application creation as durable first. It returns `201` when the confirmation email is queued or sent, returns `202` if enqueue fails, logs deferred email delivery, and includes delivery telemetry in the response.

**Confirmed by:** `npm run test:smoke` verifies application submission returns success with queued confirmation email and that admin status updates trigger a status email job.

## Automated Test Results

| Check | Result |
| --- | --- |
| TypeScript check | Passed |
| Smoke tests | Passed - 1/1 |
| Unit tests | Passed - 16/16 |
| Integration tests | Passed - 8/8 |
| Vercel build | Passed |
| Predeploy validation | Passed in dry-run mode |
| Whitespace check | Passed |

## Live Infrastructure Checks

| Target | Result |
| --- | --- |
| `mtendereeducationconsult.com` DNS | Resolved to Vercel A record |
| `admin.mtendereeducationconsult.com` DNS | Resolved through Vercel CNAME |
| `api.mtendereeducationconsult.com` DNS | Resolved through Vercel CNAME |
| `links.mtendereeducationconsult.com` DNS | Resolved through SendGrid CNAME |
| Public website HTTP | 200 |
| Admin auth HTTP | 200 |
| API health HTTP | 200 |

## Latency Notes

Observed live HEAD request samples:

- Public site: cold response was slow, warm responses around 1.6s.
- Admin auth: 0.8s to 2.6s.
- API health: 0.6s to 2.4s.

## Stability Rating

**92/100**

The automated smoke, unit, integration, build, and predeploy checks passed. Remaining risk is mostly operational: cold public-page latency, local browser E2E needing an isolated database, and production email/DNS readiness depending on real provider secrets in Vercel.

## Remaining Risk Areas

- Run Playwright E2E in CI or with a local PostgreSQL test database; local PostgreSQL is running but current local credentials are not available.
- Watch public homepage cold-start/edge latency and consider cache tuning or lighter first payloads if slow responses persist.
- Strict production email readiness must run in Vercel/GitHub with real SendGrid/SES secrets and DNS checks enabled.
