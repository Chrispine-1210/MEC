import { type IssueFinding, type MonitoringEvidence, type MonitoringReport, type Severity } from "./types";

const makeFinding = (input: Omit<IssueFinding, "id"> & { id?: string }): IssueFinding => ({
  id: input.id ?? `finding-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  title: input.title,
  problem: input.problem,
  impact: input.impact,
  severity: input.severity,
  recommendation: input.recommendation,
  implementationSteps: input.implementationSteps,
  expectedOutcome: input.expectedOutcome,
  evidence: input.evidence,
});

const countPrometheusMetric = (promText: string, metric: string) => {
  const linePattern = new RegExp(`^${metric}(?:\\\\{[^}]*\\\\})?\\\\s+([0-9.]+)$`, "gm");
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = linePattern.exec(promText))) {
    total += Number(match[1]) || 0;
  }
  return total;
};

const securityEventSeverity = (event: Record<string, unknown>): Severity => {
  const name = String(event.event || event.type || event.action || "").toLowerCase();
  const statusCode = Number(event.statusCode || event.status || 0);
  if (/bot_detected|headless|csrf|forbidden|unauthorized|credential|injection/.test(name) || statusCode === 403) {
    return "High";
  }
  if (/rate_limit|captcha_failure|mfa|password/.test(name) || statusCode === 429) return "Medium";
  return "Low";
};

const maxSeverity = (left: Severity, right: Severity): Severity => {
  const rank: Record<Severity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
  return rank[right] > rank[left] ? right : left;
};

export const analyzeEvidence = async (evidence: MonitoringEvidence): Promise<IssueFinding[]> => {
  const findings: IssueFinding[] = [];

  if (!evidence.health.ok) {
    findings.push(
      makeFinding({
        title: "Health endpoint is not reporting ready",
        severity: "High",
        problem: "The supplied health evidence indicates that the platform is not fully healthy.",
        impact: "Operational workflows can silently degrade if production readiness is not green.",
        recommendation: [
          "Inspect the raw health payload and resolve each blocking subsystem before promoting changes.",
          "Keep the deployment gate tied to the same health contract used by production monitoring.",
        ],
        implementationSteps: [
          "Open /api/health for the target environment.",
          "Resolve database, email, cache, and provider readiness failures reported by the payload.",
          "Re-run this monitoring report after the health endpoint returns ok readiness.",
        ],
        expectedOutcome: {
          securityImprovement: "Reduces the chance of accepting user submissions while critical services are degraded.",
          userExperienceImprovement: "Users receive fewer partial-success states and delayed confirmations.",
        },
        evidence: {
          sources: [{ kind: "health", detail: "health.ok was false in the supplied evidence." }],
        },
      }),
    );
  }

  const promText = evidence.metrics?.promText ?? "";
  if (promText) {
    const errorTotal = countPrometheusMetric(promText, "app_http_errors_total");
    if (errorTotal > 0) {
      findings.push(
        makeFinding({
          title: "HTTP error counter has recorded failures",
          severity: errorTotal >= 25 ? "High" : "Medium",
          problem: `Prometheus metrics show ${errorTotal} recorded HTTP errors.`,
          impact: "Repeated API errors reduce form reliability, admin confidence, and conversion quality.",
          recommendation: [
            "Break down the error counter by route/status label and fix the highest-volume failures first.",
            "Add alert thresholds for sustained error growth instead of relying on manual log checks.",
          ],
          implementationSteps: [
            "Query /api/metrics and group app_http_errors_total by route.",
            "Inspect matching Vercel runtime logs for stack traces or provider failures.",
            "Add a regression test for the repaired route.",
          ],
          expectedOutcome: {
            performanceGain: "Less retry traffic and fewer failed form submissions.",
            userExperienceImprovement: "Public forms and admin workflows fail less often.",
          },
          evidence: {
            sources: [{ kind: "prometheus_metrics_text", detail: `app_http_errors_total=${errorTotal}` }],
          },
        }),
      );
    }
  }

  const recentEvents = evidence.securityAudit?.recentEvents ?? [];
  const notableEvents = recentEvents.filter((event) => securityEventSeverity(event) !== "Low");
  if (notableEvents.length > 0) {
    const severity = notableEvents
      .map(securityEventSeverity)
      .reduce<Severity>((current, next) => maxSeverity(current, next), "Low");
    findings.push(
      makeFinding({
        title: "Recent security audit events need review",
        severity,
        problem: `${notableEvents.length} recent security audit events were classified as medium or higher.`,
        impact: "Unreviewed abuse, authentication, or rate-limit events can hide real attacks or broken defenses.",
        recommendation: [
          "Review the most recent security-audit JSONL entries and group them by event type, route, and IP/fingerprint.",
          "Promote repeated high-risk patterns into blocklists, bot-defense rules, or stricter rate limits.",
        ],
        implementationSteps: [
          "Inspect the referenced JSONL path.",
          "Create a short incident note for high/critical event clusters.",
          "Tune bot-defense thresholds only after confirming false-positive rates.",
        ],
        expectedOutcome: {
          securityImprovement: "Improves detection and response for abuse patterns.",
        },
        evidence: {
          sources: [
            {
              kind: "security_audit_jsonl",
              path: evidence.securityAudit?.jsonlPath,
              detail: `${notableEvents.length} notable recent audit events.`,
            },
          ],
        },
      }),
    );
  }

  if (!evidence.configSnapshot?.metricsSecretConfigured) {
    findings.push(
      makeFinding({
        title: "Metrics endpoint secret is not confirmed",
        severity: "Medium",
        problem: "The monitoring config snapshot does not confirm that METRICS_SECRET is configured.",
        impact: "Unauthenticated operational metrics can expose platform behavior and route-level failure patterns.",
        recommendation: ["Set METRICS_SECRET in production and verify /api/metrics rejects unauthenticated requests."],
        implementationSteps: [
          "Add METRICS_SECRET in Vercel production environment variables.",
          "Redeploy production.",
          "Check /api/metrics without a bearer token returns 401.",
        ],
        expectedOutcome: {
          securityImprovement: "Keeps operational telemetry private.",
        },
        evidence: {
          sources: [{ kind: "config", detail: "metricsSecretConfigured is false or missing." }],
        },
      }),
    );
  }

  if (!evidence.configSnapshot?.recaptchaConfigured) {
    findings.push(
      makeFinding({
        title: "reCAPTCHA secret is not configured",
        severity: "Low",
        problem: "The monitoring config snapshot does not confirm a server-side reCAPTCHA secret.",
        impact: "High-risk public forms may rely only on local bot-defense heuristics until CAPTCHA is configured.",
        recommendation: [
          "Configure RECAPTCHA_SECRET_KEY and VITE_RECAPTCHA_SITE_KEY when strict CAPTCHA enforcement is desired.",
          "Keep bot-defense risk scoring enabled even when CAPTCHA is optional.",
        ],
        implementationSteps: [
          "Create production keys for the public and admin hostnames.",
          "Add the site key to client/admin build environments and the secret to server environments.",
          "Redeploy and submit a low-risk form plus a failed-token test.",
        ],
        expectedOutcome: {
          securityImprovement: "Adds external human verification for risky public submissions.",
        },
        evidence: {
          sources: [{ kind: "config", detail: "recaptchaConfigured is false or missing." }],
        },
      }),
    );
  }

  return findings;
};

export const computeSystemHealthScore = (evidence: MonitoringEvidence, findings: IssueFinding[]) => {
  const severityPenalty: Record<Severity, number> = { Critical: 35, High: 22, Medium: 10, Low: 4 };
  const findingPenalty = findings.reduce((sum, finding) => sum + severityPenalty[finding.severity], 0);
  const healthPenalty = evidence.health.ok ? 0 : 15;
  return Math.max(0, Math.min(100, 100 - findingPenalty - healthPenalty));
};

export const buildIceBreaker = (findings: IssueFinding[]): MonitoringReport["iceBreaker"] => {
  const highest = findings[0];
  if (!highest) {
    return {
      tone: "friendly-technical",
      opener: "The platform evidence looks calm for this pass.",
      nextAction: "Keep the monitoring report scheduled and compare the next run against this baseline.",
    };
  }

  return {
    tone: "friendly-technical",
    opener: `The sharpest signal in this pass is: ${highest.title}.`,
    nextAction: highest.recommendation[0] ?? "Review the highest-severity finding first.",
  };
};
