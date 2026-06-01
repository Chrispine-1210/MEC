# Production Readiness Report

Date: 2026-06-01

## Ready

- Vercel serverless API bridge is configured.
- Admin domain routing is configured.
- CORS allows trusted Mtendere production and preview origins.
- Authentication, refresh, logout, registration, email verification, and password reset are connected.
- Contact, newsletter, application, and event workflows store data and send emails.
- Admin dashboards cover core operational modules.

## Must Configure In Vercel

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED` if required by Neon setup
- `JWT_SECRET`
- `PUBLIC_APP_URL=https://mtendereeducationconsult.com`
- `ADMIN_APP_URL=https://admin.mtendereeducationconsult.com`
- `CORS_ORIGIN=https://mtendereeducationconsult.com,https://www.mtendereeducationconsult.com,https://admin.mtendereeducationconsult.com`
- `EMAIL_FROM`
- `EMAIL_API_URL`
- `EMAIL_API_KEY`
- `ADMIN_NOTIFICATION_EMAIL`
- `RECAPTCHA_SECRET_KEY`
- `VITE_RECAPTCHA_SITE_KEY`

## Deployment Notes

- Keep `npm ci --include=dev --include=optional` only if `package-lock.json` stays synced.
- Run `npm run build:vercel` before promotion.
- Confirm the live admin bundle contains the latest API bridge logic after deployment.
