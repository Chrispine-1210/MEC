# Authentication Architecture

Date: 2026-06-01

## Login

1. Client submits credentials to `/api/auth/login`.
2. Server normalizes email/username, checks lockout state, verifies bcrypt password, rejects inactive/unverified accounts, logs analytics, returns an access token, and sets an HTTP-only refresh cookie.
3. Client stores only the short-lived access token in local storage.
4. API requests automatically call `/api/auth/refresh` once when an access token expires.

## Registration

1. Public users register through `/api/auth/register`.
2. Duplicate email and username are checked before insert.
3. Password is hashed with bcrypt.
4. Account is created inactive until email verification completes.
5. A signed email verification token is sent by email.
6. `/api/auth/verify-email/:token` activates the account and sends a welcome email.

## Admin Account Governance

- `/api/auth/admin/register`, `/api/admin/auth/register`, and `/auth/register` return 403.
- Viewer and Writer accounts are created only by the super admin from Admin Management.
- Super admin role is protected from deletion, suspension, and role changes.

## Password Recovery

1. `/api/auth/forgot-password` always returns a neutral response.
2. If the email belongs to an active account, a signed 20-minute reset token is emailed.
3. `/api/auth/reset-password` validates token type, expiry, email, password fingerprint, and strong password rules.
4. The new password is hashed, analytics are logged, refresh cookie is cleared, and a confirmation email is sent.

## Session Invalidation

- Access and refresh tokens include a password fingerprint.
- Password reset or admin password change invalidates future refresh attempts for older tokens.
- Super admin can still invalidate all sessions through existing admin settings.
