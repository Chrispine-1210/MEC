# Admin Management Documentation

Date: 2026-06-01

## Access Model

- Super Admin: dominant system owner.
- Writer: content creation and editing within allowed modules.
- Viewer: read-only admin portal access.
- Admin self-registration is disabled.

## Managed Areas

Admin Management currently surfaces:

- Users
- Scholarships
- Jobs
- Partners
- Blog
- Team
- Events
- Event registrations
- Applications
- Contact messages
- Analytics
- Activity and notifications
- Media
- AI chat monitoring

## Exports

- Contact messages: `/api/admin/messages/export`
- Subscribers: `/api/admin/subscribers/export`
- Existing module exports remain available for scholarships, jobs, applications, users, blog, team, events, and event registrations where implemented.

## Audit Logging

- Analytics and admin realtime events capture major create/update/delete and security actions.
- Permission audit tables exist in schema; deeper per-field admin mutation audit should be expanded in a future migration.
