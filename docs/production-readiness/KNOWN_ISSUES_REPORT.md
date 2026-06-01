# Known Issues Report

Date: 2026-06-01

## Known Gaps

- Password history tracking beyond current-password reuse needs a durable password history table.
- Contact assignment, status workflow, internal notes, and communication history need durable schema support.
- Email queue is process-local; a durable queue should be added for high volume.
- reCAPTCHA is optional until production keys are configured.
- Virus scanning is not yet connected to a scanning engine.
- Email open and click tracking requires provider webhooks and tracked links.

## Operational Watch Items

- Vercel function cold starts with database connections.
- Email provider rate limits and bounce handling.
- Admin role permissions should be reviewed after every new module is added.
- Generated `dist` assets change after builds and should be committed only when intended.
