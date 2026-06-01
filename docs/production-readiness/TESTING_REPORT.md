# Testing Report

Date: 2026-06-01

## Automated Checks

- `npm run check` passed after the authentication, form, email, contact, newsletter, and client API changes.
- `npm run build:vercel` passed for the Client Portal, Admin Management build, and serverless API bundle.

## Required Manual QA

Run these flows in Vercel Preview and Production:

- Public registration -> email verification -> login.
- Forgot password -> reset password -> login with new password.
- Admin super admin login from `admin.mtendereeducationconsult.com`.
- Admin logout and refresh-token expiry.
- Contact form submission with valid payload.
- Newsletter signup and double opt-in verification.
- Scholarship application duplicate prevention.
- Job application duplicate prevention.
- Event registration duplicate prevention.
- Admin CSV export for contact messages and subscribers.

## Browser Checks

- Verify no CORS failures in DevTools Network for login, register, refresh, contact, subscriber, and admin dashboard requests.
- Verify form fields have useful autocomplete attributes.
- Verify mobile layouts do not overflow.
