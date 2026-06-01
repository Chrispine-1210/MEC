# Recommendations For Future Enhancements

Date: 2026-06-01

## Security

- Add `auth_tokens`, `email_verifications`, `password_resets`, and `password_history` tables for single-use token storage and full auditability.
- Add durable per-user session records and refresh-token rotation IDs.
- Add WebAuthn/passkeys for super admin and high-risk admin roles.
- Enforce MFA after durable MFA columns are migrated.

## Forms And CRM

- Add a `lead_records` table to unify contacts, subscribers, applications, event registrations, and attribution.
- Add contact ticket status, assignment, internal notes, and communication history.
- Add abandoned-form recovery for started but incomplete forms.

## Email

- Move to a durable provider queue or Vercel Queues.
- Add provider webhooks for delivered, bounced, complained, opened, clicked, and suppressed events.
- Add branded campaign template management in Admin.

## Analytics

- Add daily, weekly, monthly, quarterly, and annual materialized snapshots.
- Add conversion funnel dashboards for landing page -> form start -> form completion -> application/subscription.
