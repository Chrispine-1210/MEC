## Monitoring + Elevation + Ice-breaker engine (work plan)

- [ ] Create server-side monitoring engine modules:
  - [ ] `server/monitoring-engine/types.ts` (issue/report schemas)
  - [ ] `server/monitoring-engine/evidence.ts` (collect evidence from `/api/health`, `/api/metrics`, security audit JSONL)
  - [ ] `server/monitoring-engine/analyzer.ts` (turn evidence into findings with Problem/Impact/Severity/Recommendation/Expected Outcome)
  - [ ] `server/monitoring-engine/report.ts` (daily + weekly report rendering)
- [ ] Create CLI generator:
  - [ ] `scripts/generate-monitoring-report.ts` writes snapshots + latest report
- [ ] Wire minimal runtime usage:
  - [ ] Ensure it can run in local dev (no external dependencies beyond existing code)
- [ ] Quick validation:
  - [ ] Run CLI locally and verify JSON snapshot + report output files are created
