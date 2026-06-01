# Security Audit Report

Date: 2026-06-01

## Authentication Controls

- Strong password rules require 12 to 128 characters, upper/lowercase letters, a number, and a symbol.
- Login lockout throttles repeated failed attempts.
- JWT access tokens expire using the admin-configured session timeout.
- Refresh tokens are stored in an HTTP-only, secure production cookie.
- Tokens now include a server-side password fingerprint, invalidating refresh after password reset or admin password changes.
- Logout clears the refresh cookie and local access token.

## Admin Hardening

- Super admin remains the only dominant management account.
- Admin self-service registration is blocked server-side.
- Admin-created accounts are restricted to Viewer and Writer roles.
- Super admin cannot be deleted, suspended, or role-downgraded through admin user management.

## Form Security

- Contact and newsletter forms now include honeypot fields, rate limiting, server validation, optional reCAPTCHA, and analytics logging.
- Application uploads already enforce MIME allowlists and file-size limits.
- Duplicate applications and duplicate event registrations are prevented.

## SQL Injection / XSS Posture

- Database writes use Drizzle ORM parameterized queries and schema parsing rather than raw string SQL.
- Server-generated HTML paths escape dynamic values where present.
- Form payloads are validated and trimmed server-side before persistence.

## Required Production Configuration

- `JWT_SECRET` must be unique, high entropy, and at least 32 characters.
- Configure `PUBLIC_APP_URL`, `ADMIN_APP_URL`, `CORS_ORIGIN`, and `ALLOWED_ORIGINS` in Vercel.
- Configure email sender DNS: SPF, DKIM, and DMARC.
- Configure `RECAPTCHA_SECRET_KEY` and `VITE_RECAPTCHA_SITE_KEY` before enforcing bot scoring.
