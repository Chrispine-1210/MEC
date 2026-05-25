# Functional Analysis Report

## Architecture Summary

The system is implemented as a dual-frontend platform with shared domain logic. The public client uses React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind, and shadcn/Radix UI components. The admin system uses a separate React/Vite application with its own sidebar, top bar, RBAC route catalog, and management modules. The backend is Express/Node with REST APIs, Drizzle ORM, PostgreSQL/Neon schema definitions, JWT/bcrypt authentication, WebSocket readiness, OpenAI integration, Stripe payment hooks, email/subscriber workflows, upload handling, and analytics tables.

## Data Model

The shared schema defines approximately 47 operational tables. Major domains include users, scholarships, jobs, applications, partners, testimonials, blog posts, comments, team members, events, event registrations, event media/documents/notification plans, partner activities/documents/sponsorships/opportunities/financial records, permissions, notifications, webhooks, referrals, payments, commissions, wallets, ledgers, payout requests, fraud signals, analytics, saved items, module workflows, application reviews, documents, content revisions, scheduled reports, user sessions, permission audit logs, module analytics snapshots, messages, and subscribers.

## Public Workflow

1. Visitor lands on the homepage, explores services, searches opportunities, or enters a page through SEO/social.
2. User filters scholarships, jobs, events, partners, or content.
3. User opens a detail page, saves an item, registers, submits an application, or uses contact/chat.
4. Authenticated user tracks applications, manages referrals, and can use checkout-linked services.
5. Backend APIs persist application, message, referral, saved-item, and payment data for admin action.

## Admin Workflow

1. Admin enters dashboard with KPIs, notifications, quick creation, search, and module navigation.
2. Content operators manage scholarships, jobs, events, partners, blog posts, team records, and media.
3. Application reviewers filter the pipeline, inspect applicants, assign status, score, shortlist, schedule interviews, and save notes.
4. Super admins manage users, permissions, roles, security settings, and audit trails.
5. Leadership uses analytics, activity, ecosystem overview, exports, and scheduled-report-ready structures for oversight.

## Integration Observations

- Stripe/payment, wallet, ledger, commission, payout, fraud, and dispute structures are present for monetization and referral growth.
- OpenAI and AI chat monitoring hooks are present for student support and admin oversight.
- Email/subscriber, contact message, notification, webhook, and WebSocket patterns create an automation-ready foundation.
- Docker, Kubernetes, Prometheus/Grafana references, and deployment artifacts indicate cloud readiness, though production environment validation remains required.

## Runtime Observation During Audit

The frontend dev servers rendered successfully for the screenshot audit. The live backend on the expected local API/WebSocket port was not consistently reachable during capture, so screenshots were taken using controlled browser API fixtures seeded from the codebase's actual route and schema shape. This protects the visual audit from stalled services while preserving accurate UI and workflow coverage. Backend availability, WebSocket origin, and environment configuration should be validated before stakeholder demos.
