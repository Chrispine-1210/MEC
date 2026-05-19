# Production Incident Runbook

## Scope
Use this runbook for production incidents impacting availability, security, or data integrity.

## Severity Levels
- `SEV-1`: Full outage, critical data/security risk, or login/auth failures for most users.
- `SEV-2`: Major feature degradation with workaround.
- `SEV-3`: Limited-scope bug with low business impact.

## Immediate Response (First 15 Minutes)
1. Acknowledge incident and assign an incident commander.
2. Freeze non-essential deploys.
3. Capture baseline:
   - Current error rate (`/metrics`, `app_http_errors_total`)
   - Current latency (`app_http_request_duration_ms_*`)
   - Active alerts in Sentry and infrastructure platform.
4. Create incident timeline document with UTC timestamps.

## Triage Checklist
- Confirm blast radius:
  - Public API
  - Admin API
  - Authentication/MFA
  - Database connectivity
  - Redis/cache connectivity
- Verify health endpoints:
  - `GET /api/health`
  - `GET /metrics`
- Check recent releases and config changes.

## Authentication/MFA Incident Playbook
1. Check Sentry for auth failures (`/api/auth/login`, `/api/auth/mfa/*`).
2. Inspect metrics:
   - Surge in `401`/`403`
   - Elevated auth route latency
   - Rise of `INSUFFICIENT_PERMISSION` responses on admin APIs
3. Validate environment:
   - `JWT_SECRET`
   - `MFA_REQUIRED_ROLES`
   - `MFA_ENCRYPTION_KEY`
4. If privileged users are locked out:
   - Temporarily reduce `MFA_REQUIRED_ROLES` (controlled change, approved by incident commander).
   - Log and track every emergency policy change.
5. Post-incident:
   - Restore strict MFA policy.
   - Rotate any impacted credentials.

## Authorization (RBAC) Incident Playbook
1. Check Sentry for elevated `403` errors on `/api/admin/*`.
2. Separate failure mode:
   - `MFA_SETUP_REQUIRED` / `MFA_VERIFICATION_REQUIRED`: authentication hardening path.
   - `INSUFFICIENT_PERMISSION`: role-permission policy mismatch.
3. Validate role configuration source:
   - `data/admin-state.json` role permissions
   - Most recent role changes (`/api/admin/roles`, audit logs)
4. Mitigate safely:
   - Apply least-privilege temporary permission patch to affected role.
   - Avoid broad role escalation unless incident commander approves.
5. Recover:
   - Re-run integration checks for auth/MFA/RBAC before closing incident.

## Data/Storage Incident Playbook
1. Validate DB connection and query latency.
2. Validate Redis reachability.
3. If Redis unavailable:
   - App falls back to memory cache automatically.
   - Monitor elevated DB load and API latency.
4. If DB is degraded:
   - Enable traffic shaping / rate-limit tuning.
   - Prioritize auth and core read paths.

## Communication
- Update stakeholders every 15 minutes for `SEV-1`, every 30 minutes for `SEV-2`.
- Include:
  - Current impact
  - Mitigation in progress
  - Next checkpoint time

## Resolution and Recovery
1. Verify error and latency metrics returned to baseline.
2. Confirm user-facing workflows (login, admin dashboard, core CRUD) are stable.
3. Unfreeze deployments after incident commander approval.

## Postmortem (Within 48 Hours)
- Root cause and contributing factors
- Detection gaps
- Preventive actions with owners and deadlines
- Tests/alerts added after incident
