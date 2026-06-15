# User Access Stability Report - 2026-06-15

## Root Cause

The unstable access behavior came from credential provisioning paths, not the login form itself.

- `server/seed.ts` reset the `admin` account password whenever `SEED_SUPER_ADMIN_PASSWORD` was present.
- `scripts/seed-role-accounts.ts` generated new random passwords for missing accounts and wrote them to `data/admin-role-credentials.json`.
- The standalone `Admin/server` role maps did not consistently include the `admin` role.
- The standalone in-memory admin store generated an unusable random default admin password when no seed password was configured.
- MFA enforcement was role-hardcoded for writer/admin/super-admin accounts, which could block dashboard access for stable operational accounts before MFA enrollment.

## Corrective Actions

- Added `server/role-accounts.ts`, an idempotent stabilizer for `super_admin`, `admin`, `writer`, and `viewer`.
- Updated `scripts/seed-role-accounts.ts` so existing accounts are preserved by default and passwords are never generated, printed, or written to disk.
- Password rotation now requires `--rotate-existing` plus an explicit role password environment variable.
- `server/seed.ts` now repairs the existing `admin` role and active state without changing its password hash.
- Added the missing `admin` role to standalone admin role maps.
- Aligned the standalone admin guard so `admin` can access admin-level routes while super-admin-only routes remain protected.
- Replaced standalone in-memory random default admin hash behavior with a fixed disabled hash when no seed password is configured.
- Adjusted MFA enforcement so it is required when the platform setting is enabled or when a user has enrolled MFA; seeded operational users are not blocked solely by role before enrollment.
- Added `ADMIN_TWO_FACTOR_REQUIRED` as an optional deployment-level MFA policy override; when unset, the admin settings file remains the source of truth.
- Added `.env.example` entries for stable role-account usernames, emails, and explicit first-time passwords.
- Added unit coverage for password preservation, metadata repair, missing-password behavior, and explicit rotation.

## Validation

- Existing role account passwords are preserved during normal seed execution.
- Missing role accounts require explicit configured passwords.
- Existing inactive or wrong-role operational accounts are repaired without password changes.
- Explicit password rotation works only when requested.
- Seed output no longer includes plaintext passwords.
- Local runtime admin MFA policy is set to `false` so seeded role accounts can access the dashboard immediately; enabling `ADMIN_TWO_FACTOR_REQUIRED=true` or the admin setting will require MFA enrollment.

## Deployment Readiness

Role-account provisioning is now safe to run before or after deployments and migrations. Existing operational account passwords remain unchanged unless an administrator explicitly runs the role-account seed with `--rotate-existing` and provides the replacement password through environment configuration.
