# Admin Platform Hardening Report

Date: 2026-06-09

## Scope Completed

- Hardened RBAC across super admin, admin, writer, and viewer account paths.
- Kept `editor` as a legacy compatibility alias, but the active account matrix is now centered on `super_admin`, `admin`, `writer`, and `viewer`.
- Added publish-permission enforcement for scholarship, job, blog, and event status publishing.
- Added non-production email live-send protection so provider keys cannot accidentally send real smoke-test emails unless `EMAIL_ALLOW_LIVE_TEST_SENDS=true`.
- Added superseding of pending account verification, password reset, and subscription confirmation jobs to reduce duplicate email sends.
- Hardened websocket lifecycle with heartbeat cleanup, payload size limits, subscription caps, and explicit denied-channel feedback.
- Added upload audit metadata and rejected empty multi-file upload requests.
- Added a single secure role-account seed script and removed the weak legacy admin seed script.

## Seeded Role Accounts

Credentials were generated and stored locally in:

`data/admin-role-credentials.json`

This file is ignored by git. Do not paste passwords into chat or commit them. Rotate passwords after handoff and enroll MFA before production use.

| Role | Username | Email | Status |
| --- | --- | --- | --- |
| Super Admin | `mec_super_admin` | `super-admin@mtendereeducationconsult.com` | Created |
| Admin | `mec_admin` | `admin@mtendereeducationconsult.com` | Created |
| Writer | `mec_writer` | `writer@mtendereeducationconsult.com` | Created |
| Viewer | `mec_viewer` | `viewer@mtendereeducationconsult.com` | Created |

All seeded accounts passed API login and profile lookup. Current platform settings require MFA for admin-portal roles, so the seeded accounts log in with `mfaRequired: true` and need MFA setup before privileged admin actions.

## RBAC Matrix

| Capability | Viewer | Writer | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| Dashboard access | Yes | Yes | Yes | Yes |
| Analytics/report viewing | Yes, where exposed by dashboard routes | Limited | Yes | Yes |
| Create/update draft content | No | Yes | Yes | Yes |
| Publish content | No | No | Yes | Yes |
| Applications review | No | No | Yes | Yes |
| AI/admin operations | No | No | Yes | Yes |
| User management | No | No | No | Yes |
| Role/settings/security controls | No | No | No | Yes |

## Verification

- `npm run test:unit`: passed, 14/14.
- `node --import tsx --test tests/integration/auth-mfa-rbac.integration.test.ts`: passed, 8/8.
- `npm run check`: passed.
- `npm run build:client`: passed.
- `npm run build:admin`: passed.
- `npm run build:server`: passed.
- Seeded account login smoke: 4/4 roles passed login and profile lookup.
- Public registration smoke: passed; account creation returned 201, verification email job was queued, and unverified login was blocked.
- Limited load smoke: 30 health checks plus 10 viewer logins, 0 failures, 14.225 seconds.

## Email And DNS

- Non-production smoke tests now default to dry-run unless `EMAIL_ALLOW_LIVE_TEST_SENDS=true`.
- Duplicate prevention now cancels pending verification, password reset, and subscription confirmation jobs when a newer job is queued for the same recipient/category.
- SendGrid DNS verification:
  - Passing: `links`, `54085667`, `mtd1._domainkey`, `mtd12._domainkey`, `_dmarc`.
  - Needs update: `mail.mtendereeducationconsult.com`.
  - Expected CNAME target: `u54085667.wl168.sendgrid.net`.
  - Actual target: `sendgrid.net`.
- The Cloudflare DNS fix script was attempted, but Cloudflare returned 403 because the configured token lacks DNS edit permission for `mtendereeducationconsult.com`.

## Resolved Issues

- Weak role seed script removed.
- Secure role-account seed script added.
- Admin assignment can now assign `admin`, `writer`, and `viewer`.
- Writers can no longer publish through status endpoints.
- Admin client route guards now align better with server access.
- Uploads now produce audit metadata.
- Websocket cleanup and subscription authorization feedback improved.
- Non-production email smoke tests are protected from accidental live provider delivery.

## Remaining Risk Register

| Risk | Severity | Status |
| --- | --- | --- |
| `mail.mtendereeducationconsult.com` SendGrid CNAME is wrong | High | Requires Cloudflare token with DNS edit permission |
| MFA setup is still required after seeded account handoff | High | Expected production control; operators must enroll MFA |
| Full browser E2E suite is not installed locally | Medium | API/build smoke passed; install Playwright for full browser journeys |
| Load testing was limited, not production-scale | Medium | Run k6/Artillery/JMeter against staging before launch |
| Node runtime is 24.13.0 | Medium | Project warns to use Node 20 or 22 LTS for Neon websocket stability |
