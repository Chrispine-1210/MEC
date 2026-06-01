# Forms Architecture

Date: 2026-06-01

## Contact Form

- Client validates name, email, phone, subject, inquiry category, message, and privacy consent.
- Server validates the same payload with Zod.
- Honeypot submissions are accepted without persistence to avoid bot feedback.
- Optional reCAPTCHA v3 is supported.
- Each valid message is stored, emailed to the user, emailed to admin, assigned a ticket code, and logged to analytics.

## Newsletter Form

- Supports email, optional name, preferences, consent, honeypot, double opt-in, unsubscribe token, and analytics.
- Admin can view subscribers and export CSV.

## Applications

- Application creation requires authentication.
- Duplicate application prevention is enforced by user, type, and reference ID.
- File uploads are limited by MIME type and size.
- Confirmation emails and admin notifications are already connected.

## Event Registrations

- Registration deadline, capacity, duplicate email, ticket generation, confirmation email, and analytics are already implemented.

## Conversion Tracking

- Public endpoint `/api/analytics/track` stores form-start and form-complete events.
- Client helper captures landing page, referrer, and UTM attribution.
