# Supporting Technical Documentation

## Stack

- Public frontend: React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, shadcn/Radix UI, Recharts, Vercel analytics hooks.
- Admin frontend: React/Vite/TypeScript with dedicated admin layout, route-based RBAC catalog, dashboards, tables, forms, modals, and module managers.
- Backend: Node/Express REST API, JWT/bcrypt auth, Express sessions/cookies, WebSocket readiness, Multer uploads, rate limiting, Helmet CSP, origin checks, OpenAI, Stripe, email/subscriber workflows.
- Data: PostgreSQL/Neon with Drizzle ORM and shared schema.
- Infrastructure: Docker, Kubernetes manifests, Prometheus/Grafana references, migration files, deployment documentation.

## API Surface

Public APIs include authentication, user profile, search, scholarships, jobs, partners, testimonials, blog posts, team members, events, applications, referrals, payments, saved items, subscribers, contact messages, analytics, and AI chat.

Admin APIs include dashboard stats, recent activity, ecosystem overview, users, scholarships, jobs, partners, blog, team, events, applications, AI conversations, permission catalog, roles, settings, notifications, audit logs, upload/media governance, analytics, subscribers, and messages.

## Security Controls Observed

- Password hashing with bcrypt.
- JWT bearer authentication and active-user checks.
- Admin/editor/super-admin middleware patterns.
- Route-level admin RBAC catalogs in public/admin clients.
- Helmet CSP, x-powered-by disabled, CORS/origin control, API/auth rate limits, request IDs and logging.
- Permission, user session, and permission audit tables in schema.

## Known Technical Gaps

- Backend/WebSocket service should be verified live in the demo/deployment environment.
- MFA route implementation should be verified against frontend setup/status flows.
- CI should run typecheck/build/test in addition to static code scanning.
- Code splitting, bundle budgets, E2E testing, upload scanning, monitoring dashboards, and production secrets validation should be completed before institutional launch.
