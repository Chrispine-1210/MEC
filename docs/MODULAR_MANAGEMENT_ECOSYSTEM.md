# Modular Management Ecosystem

## Executive Summary

The Admin Management System and public platform now operate as a unified modular SaaS ecosystem covering scholarships, jobs, partners, blog/CMS, team profiles, users, roles and permissions, applications, analytics, events, media, and reporting. The implementation preserves existing routes while adding enterprise lifecycle controls, workflow metadata, operational analytics, secure exports, application review pipelines, and automation-ready data structures.

## System Architecture

### Experience Layer

- `Admin/client/src/pages/admin/ecosystem.tsx`: unified operations command center.
- `Admin/client/src/pages/admin/scholarships.tsx`: lifecycle management, duplication, publishing, archival, analytics, CSV export.
- `Admin/client/src/pages/admin/jobs.tsx`: recruitment lifecycle management, duplication, publishing, archival, analytics, CSV export.
- `Admin/client/src/pages/admin/applications.tsx`: unified review queue with status, stage, score, shortlist, interview scheduling, notes, and exports.
- Existing admin modules for partners, blog, team, users, roles, analytics, activity, media, messages, settings, events, and AI remain integrated.
- Public pages remain the conversion layer for scholarships, jobs, partners, blog, team, events, dashboards, and applications.

### API Layer

Core administrative APIs use authenticated REST endpoints, validation, RBAC middleware, and structured responses:

- `/api/admin/ecosystem/overview`
- `/api/admin/scholarships/analytics`
- `/api/admin/scholarships/reports/summary`
- `/api/admin/scholarships/:id/duplicate`
- `/api/admin/scholarships/:id/status`
- `/api/admin/scholarships/export`
- `/api/admin/jobs/analytics`
- `/api/admin/jobs/reports/summary`
- `/api/admin/jobs/:id/duplicate`
- `/api/admin/jobs/:id/status`
- `/api/admin/jobs/export`
- `/api/admin/blog/analytics`
- `/api/admin/blog/:id/duplicate`
- `/api/admin/blog/:id/status`
- `/api/admin/blog/export`
- `/api/admin/team/analytics`
- `/api/admin/team/:id/status`
- `/api/admin/team/export`
- `/api/admin/users/analytics`
- `/api/admin/users/:id/status`
- `/api/admin/users/export`
- `/api/admin/applications/analytics`
- `/api/admin/applications/reports/summary`
- `/api/admin/applications/:id/comments`
- `/api/admin/permissions/catalog`

The ecosystem overview response also includes `sourceHealth`, allowing the command center to surface partial data if a backing collection is temporarily unavailable instead of failing the entire dashboard.

### Data Layer

New migration files:

- `migrations/0008_modular_management_ecosystem.sql`
- `Admin/migrations/0002_modular_management_ecosystem.sql`

New normalized tables:

- `module_workflows`: module-agnostic workflow stages, assignment, priority, due dates, and payloads.
- `application_reviews`: scoring, reviewer comments, interview scheduling, status, stage, and criteria.
- `application_documents`: governed document records, versions, access level, status, and metadata.
- `content_revisions`: revision snapshots for CMS, scholarships, jobs, team, partners, and events.
- `scheduled_reports`: report cadence, recipients, filters, format, next run and last run timestamps.
- `user_sessions`: session/device tracking and revocation-ready records.
- `permission_audit_logs`: role/permission assignment auditing.
- `module_analytics_snapshots`: historical KPI snapshots for dashboards and executive reporting.

## Module Workflows

### Scholarships

Workflow:

1. Create or duplicate scholarship.
2. Configure details, eligibility, application fields, documents, SEO/social metadata, and visibility.
3. Publish, schedule, archive, or keep draft.
4. Receive applications through public forms.
5. Review applications, score, shortlist, schedule interviews, and approve/reject.
6. Export records and produce summary reports.

Operational controls:

- Duplicate scholarship into draft.
- Publish/archive status endpoint.
- Analytics for published, featured, expiring, applications, approvals, categories, and top scholarships.
- CSV export.

### Jobs

Workflow:

1. Create or duplicate opportunity.
2. Configure company, role, location, employment type, skills, pipeline stages, compensation, benefits, and attachments.
3. Publish, archive, or schedule expiration.
4. Receive candidate applications.
5. Score, shortlist, schedule interviews, record recruiter notes.
6. Export jobs and reporting data.

Operational controls:

- Duplicate job into draft.
- Publish/archive status endpoint.
- Analytics for candidates, interviews, applications by stage, job type, and top jobs.
- CSV export.

### Partners

Partner CRM remains integrated with:

- Profiles, logos, covers, social links, sponsorship tiers, agreements, documents, financial records.
- CRM activities, reminders, contribution tracking, renewal alerts, and analytics.
- Public partner showcase, partner detail pages, and partnership opportunities.

### Blog/CMS

CMS now supports:

- Draft/publish/archive lifecycle.
- Duplicate to draft.
- Revision metadata.
- Reading time calculation.
- Gallery/video/pull quote/code/table metadata readiness.
- SEO/social/structured data readiness.
- CSV exports and analytics.

### Team

Team module supports:

- Active/inactive visibility.
- Departments, leadership levels, skills, achievements, certifications, CV links, contact data, and public/internal visibility metadata.
- Analytics by department and skills coverage.
- CSV export.

### Users

Users management supports:

- Activation and suspension workflow.
- Region, avatar, preferences, activity logs, login/device history, verification metadata.
- Analytics by role/region/activity.
- Secure CSV exports.

### Roles And Permissions

RBAC supports:

- Core role hierarchy: viewer, editor, admin, super_admin.
- Permission catalog endpoint with module/action matrix.
- Protected system roles.
- Super admin role management.
- Access auditing data model.

### Applications

Unified application infrastructure supports:

- Scholarship and job applications now.
- Partner, event, and contact workflow compatibility through `module_workflows` and application metadata.
- Draft saving on the public form.
- File uploads.
- Review stages, scores, shortlist flags, interview scheduling, reviewer comments, verification checks, history, notifications.
- CSV export and summary reports.

## Security Architecture

- Authenticated admin endpoints use token authentication.
- Role gates protect editor/admin/super_admin actions.
- Status and user suspension endpoints prevent self-lockout and protect super admins.
- Uploads are validated by extension and MIME patterns in existing upload middleware.
- Database writes use Drizzle/Zod validation and parameterized queries.
- API exports are authenticated through `authFetch` in the admin UI.
- Permission catalog and role management are protected.
- New audit tables are ready for durable security event persistence.

## Analytics And Reporting

The new ecosystem overview aggregates:

- Total records.
- Active records.
- Workflow items.
- Risk items.
- RBAC role count.
- Permission count.
- Admin audit event count.
- Automation readiness.

Module reports expose summary payloads for executive reporting, scheduled delivery, and future PDF generation.

## Public Platform Integration

Public application dialogs now support:

- Draft saving in local storage.
- Opportunity-specific questions.
- File upload.
- Unified dashboard tracking.
- Workflow metadata submitted to the admin review pipeline.

Public scholarship and job detail pages pass role-specific application questions to the dialog. Existing public pages for partners, blog, team, events, dashboard, saved items, and contact remain compatible.

## Developer Guide

### Adding A Module

1. Add public read endpoints and admin CRUD endpoints.
2. Register module metadata in `/api/admin/ecosystem/overview`.
3. Add lifecycle endpoints: duplicate, status, analytics, export, report.
4. Add module workflow records or metadata hooks.
5. Add RBAC permission IDs and route guards.
6. Extend admin UI navigation and public routes.
7. Add migration tables/columns if durable records are required.

### Automation Hooks

Current hooks are queue-ready:

- Scheduled reports.
- Status notifications.
- Application review events.
- Content revision snapshots.
- Permission audit events.
- Webhook subscriptions from the events/partners implementation.
- AI-ready recommendation and analytics metadata.

## Deployment

1. Apply migrations in order:
   - `0007_events_partners_enterprise.sql`
   - `0008_modular_management_ecosystem.sql`
   - Admin migration equivalents when using the standalone Admin schema.
2. Run type checks:
   - `npm run check`
   - `npm run check --prefix ./Admin`
3. Build:
   - `npm run build:client`
   - `npm run build:admin`
   - `npm run build:admin:vercel`
4. Smoke test:
   - `/admin/ecosystem`
   - `/admin/scholarships`
   - `/admin/jobs`
   - `/admin/applications`
   - `/scholarships/:id`
   - `/jobs/:id`
   - `/dashboard`

## Operations Manual

### Daily Admin Checklist

- Open Management Ecosystem.
- Review risk items and workflow load.
- Check pending applications.
- Publish or archive expired scholarships/jobs.
- Review partner reminders and contract alerts.
- Export module data when needed.
- Confirm analytics and reports are updating.

### Application Review

1. Open Applications.
2. Filter by pending or under review.
3. Open an applicant.
4. Set stage, score, shortlist flag, interview date, and notes.
5. Approve, reject, waitlist, or keep under review.
6. Export or use the report summary for operational meetings.

### Publishing

1. Open the module page.
2. Edit content and metadata.
3. Use publish/archive action.
4. Verify public page visibility.
5. Review analytics after launch.

## UI/UX Standards

- Admin pages use responsive grids, accessible buttons, icons, badges, tables, and dialogs.
- Public application forms use familiar step-compatible fields, file pickers, checkboxes, and draft saving.
- Ecosystem dashboard uses compact cards, progress bars, module-specific iconography, clear risk labels, and export controls.

## Monitoring And Maintenance

- Use analytics logs for admin actions and public submissions.
- Persist scheduled reporting definitions in `scheduled_reports`.
- Persist audit events in `permission_audit_logs`.
- Use `module_analytics_snapshots` for long-term trend dashboards.
- Review large Vite chunks periodically and add route-level code splitting as module density grows.

## Executive Assets

- Slide deck: `docs/presentations/mtendere-modular-management-ecosystem.pptx`
- Visual pack: `docs/visuals/modular-ecosystem/`
- Included visuals cover the management command center, applications pipeline, review dialog, mobile public application workflow, architecture overview, workflow operating model, and roadmap/automation strategy.
