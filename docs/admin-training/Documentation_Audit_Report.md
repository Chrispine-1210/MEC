# Mtendere Admin Documentation Audit Report

Version: 1.0  
Date: 23 July 2026  
Prepared for: Mtendere Education Consult  
Prepared by: Chrispine Mndala / Aöthothe Technologies

## Modules reviewed

- Dashboard (/admin) — authorized roles: viewer, writer, editor, admin, super_admin.
- Ecosystem (/admin/ecosystem) — authorized roles: admin, super_admin.
- Analytics (/admin/analytics) — authorized roles: admin, super_admin.
- Activity (/admin/activity) — authorized roles: admin, super_admin.
- Scholarships (/admin/scholarships) — authorized roles: writer, editor, admin, super_admin.
- Job Opportunities (/admin/jobs) — authorized roles: writer, editor, admin, super_admin.
- Events (/admin/events) — authorized roles: writer, editor, admin, super_admin.
- Partners (/admin/partners) — authorized roles: writer, editor, admin, super_admin.
- Blog Posts (/admin/blog) — authorized roles: writer, editor, admin, super_admin.
- Team Members (/admin/team) — authorized roles: writer, editor, admin, super_admin.
- Media Governance (/admin/media) — authorized roles: writer, editor, admin, super_admin.
- Users (/admin/users) — authorized roles: super_admin.
- Applications (/admin/applications) — authorized roles: admin, super_admin.
- Payments (/admin/payments) — authorized roles: admin, super_admin.
- Communications (/admin/communications) — authorized roles: admin, super_admin.
- Subscribers (/admin/subscribers) — authorized roles: admin, super_admin.
- Messages (/admin/messages) — authorized roles: admin, super_admin.
- Roles & Permissions (/admin/roles) — authorized roles: super_admin.
- AI Chat Assistant (/admin/ai-chat) — authorized roles: admin, super_admin.
- Settings (/admin/settings) — authorized roles: super_admin.

## Workflows tested/documented

- Login using seeded demonstration accounts.
- Dashboard and navigation review.
- Role-bound access mapping for Super Admin, Admin, Writer/Content Manager and Viewer from current RBAC source.
- Content management workflow for Scholarships, Job Opportunities, Events, Partners, Blog Posts, Team Members and Media Governance.
- Application review workflow.
- Consultation/message handling workflow.
- Subscriber review workflow.
- Communications/template audit workflow.
- Payments, Analytics, Activity and Settings review.
- Responsive/mobile subscriber view.

## Missing or incomplete features

- MFA is intentionally disabled for the current administrator handoff and should be re-enabled in the next authentication update after recovery and setup procedures are finalized.
- AI Chat Assistant is marked Beta and should be treated as incomplete until production policies and monitoring are confirmed.
- Payment/transaction management is configuration-dependent and requires Stripe/payment environment configuration.
- Export controls are documented only where buttons/routes are available; some export workflows may be role-restricted or incomplete.

## Broken buttons or routes

- The reported email confirmation, unsubscribe and event action links require verification against the deployed public base URL and token handlers. These workflows should be tested before new campaigns are sent.
- Media Governance rendered duplicate React key warnings during capture, indicating duplicate media identifiers that may confuse asset display.

## Permission inconsistencies

- No route-level inconsistency was identified from the current admin RBAC file: Super Admin has Users/Roles/Settings, Admin has operational intelligence/people/payment areas, Writer has content modules, Viewer has Dashboard only.
- Manual role testing used seeded accounts and source-code route boundaries; perform another live production check after deployment configuration changes.

## Security concerns

- MFA is disabled for handoff; this lowers protection and should be temporary.
- Administrator screenshots and exports can expose personal information if not sanitized.
- Email action links must not reveal reusable tokens or redirect to missing routes.
- Shared accounts should be prohibited; named accounts and least privilege should be enforced.

## Recommended platform improvements

1. Re-enable MFA with clear issuer/account labels, backup recovery codes and a documented reset procedure.
2. Add automated tests for confirmation, unsubscribe and event action links.
3. Add a route health check for every link emitted by email templates.
4. Clean duplicate media identifiers and add uniqueness validation.
5. Add explicit disabled/configuration labels for beta, payment and export features.
6. Add end-to-end role tests for Super Admin, Admin, Writer and Viewer.
7. Add admin audit entries for high-risk changes such as role assignment, payment actions, email campaign sends and settings updates.
