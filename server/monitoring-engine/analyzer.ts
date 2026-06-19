import {
  type IssueFinding,
  type MonitoringEvidence,
  type MonitoringReport,
  type OperationalSignal,
  type OptimizationRoadmapItem,
  type ProductInsight,
  type Severity,
  type SignalStatus,
} from "./types";

const makeFinding = (input: Omit<IssueFinding, "id"> & { id?: string }): IssueFinding => ({
  id: input.id ?? `finding-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  title: input.title,
  domain: input.domain,
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

const severityRank = (severity: Severity) =>
  severity === "Critical" ? 4 : severity === "High" ? 3 : severity === "Medium" ? 2 : 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const recordValue = (value: unknown, key: string) => (isRecord(value) ? value[key] : undefined);

const recordAt = (value: unknown, ...keys: string[]) => {
  let current: unknown = value;
  for (const key of keys) {
    current = recordValue(current, key);
    if (current === undefined || current === null) return undefined;
  }
  return current;
};

const booleanAt = (value: unknown, ...keys: string[]) => {
  const raw = recordAt(value, ...keys);
  return typeof raw === "boolean" ? raw : undefined;
};

const stringArrayAt = (value: unknown, ...keys: string[]) => {
  const raw = recordAt(value, ...keys);
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
};

const formatPercent = (ratio: number | null | undefined) =>
  ratio === null || ratio === undefined ? "unknown" : `${(ratio * 100).toFixed(1)}%`;

const statusFromSeverity = (severity: Severity): SignalStatus =>
  severity === "Critical" ? "critical" : severity === "High" ? "risk" : severity === "Medium" ? "watch" : "healthy";

const mostSevereStatus = (findings: IssueFinding[], fallback: SignalStatus = "healthy"): SignalStatus => {
  const highest = [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  return highest ? statusFromSeverity(highest.severity) : fallback;
};

const findingSort = (left: IssueFinding, right: IssueFinding) => severityRank(right.severity) - severityRank(left.severity);

export const analyzeEvidence = async (evidence: MonitoringEvidence): Promise<IssueFinding[]> => {
  const findings: IssueFinding[] = [];

  if (!evidence.health.ok) {
    findings.push(
      makeFinding({
        title: "Health endpoint is not reporting ready",
        domain: "Backend Services",
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
  if (promText && !evidence.metrics?.parsed) {
    const errorTotal = countPrometheusMetric(promText, "app_http_errors_total");
    if (errorTotal > 0) {
      findings.push(
        makeFinding({
          title: "HTTP error counter has recorded failures",
          domain: "Backend Services",
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

  const parsedMetrics = evidence.metrics?.parsed;
  if (parsedMetrics) {
    if (parsedMetrics.serverErrorTotal > 0 || (parsedMetrics.errorRate ?? 0) >= 0.01) {
      const worstRoute = parsedMetrics.highestErrorRoutes[0];
      findings.push(
        makeFinding({
          title: "HTTP request metrics show server-side failures",
          domain: "Backend Services",
          severity: (parsedMetrics.errorRate ?? 0) >= 0.05 || parsedMetrics.serverErrorTotal >= 25 ? "High" : "Medium",
          problem: `Parsed request metrics show ${parsedMetrics.serverErrorTotal} server error(s) with an error rate of ${formatPercent(parsedMetrics.errorRate)}.`,
          impact: "Repeated 5xx responses directly affect form submissions, admin workflows, API consumers, and user trust.",
          recommendation: [
            worstRoute
              ? `Start with ${worstRoute.method} ${worstRoute.path}, which has ${worstRoute.serverErrors} server error(s).`
              : "Group production logs by route and status to identify the failing handler.",
            "Add a regression test for the failing route before redeploying.",
          ],
          implementationSteps: [
            "Fetch /api/metrics with the production metrics secret.",
            "Inspect the highest-error route in Vercel logs for matching stack traces.",
            "Patch the route and re-run unit, integration, and smoke tests.",
          ],
          expectedOutcome: {
            performanceGain: "Reduces retry load caused by failed requests.",
            userExperienceImprovement: "Public forms and admin actions complete more consistently.",
          },
          evidence: {
            sources: [
              {
                kind: "metrics",
                detail: `serverErrorTotal=${parsedMetrics.serverErrorTotal}; errorRate=${formatPercent(parsedMetrics.errorRate)}`,
              },
            ],
          },
        }),
      );
    }

    const slowestRoute = parsedMetrics.slowestRoutes[0];
    const maxDuration = parsedMetrics.maxDurationMs ?? 0;
    const averageDuration = parsedMetrics.averageDurationMs ?? 0;
    if (maxDuration >= 3_000 || averageDuration >= 1_000) {
      findings.push(
        makeFinding({
          title: "API latency is above the operational target",
          domain: "Backend Services",
          severity: maxDuration >= 8_000 || averageDuration >= 2_500 ? "High" : "Medium",
          problem: `Parsed request metrics show average latency of ${averageDuration.toFixed(0)}ms and max latency of ${maxDuration.toFixed(0)}ms.`,
          impact: "Slow API paths make form submissions feel unreliable and can cause client retries or abandoned sessions.",
          recommendation: [
            slowestRoute
              ? `Profile ${slowestRoute.method} ${slowestRoute.path}, currently the slowest observed route.`
              : "Profile the slowest observed route from /api/metrics.",
            "Check for avoidable serial database calls, missing indexes, remote provider timeouts, and oversized payload work.",
          ],
          implementationSteps: [
            "Capture the matching route logs and database query timings.",
            "Add lightweight timing around external provider and database sections.",
            "Ship the smallest performance fix and verify the next metrics scrape improves.",
          ],
          expectedOutcome: {
            performanceGain: "Shorter tail latency and fewer timeout-adjacent user flows.",
            userExperienceImprovement: "Forms and dashboards feel faster and steadier.",
          },
          evidence: {
            sources: [{ kind: "metrics", detail: `average=${averageDuration.toFixed(0)}ms; max=${maxDuration.toFixed(0)}ms` }],
          },
        }),
      );
    }
  }

  if (evidence.database?.ready === false) {
    findings.push(
      makeFinding({
        title: "Database readiness check is failing",
        domain: "Database",
        severity: "Critical",
        problem: "The supplied health evidence reports that the database is not ready.",
        impact: "Accounts, subscriptions, applications, communication events, and email queues can fail or become inconsistent.",
        recommendation: [
          "Resolve the reported database connection or schema problem before changing user-facing workflows.",
          "Keep production deploy gates blocked while database readiness is false.",
        ],
        implementationSteps: [
          "Inspect the database error code/type in the health payload.",
          "Verify the selected connection string source and driver for the target environment.",
          "Run a read-only connectivity check, then schema migrations only after a backup/recovery path is confirmed.",
        ],
        expectedOutcome: {
          securityImprovement: "Reduces the risk of partial writes during degraded persistence.",
          userExperienceImprovement: "Restores reliable saves for accounts, applications, subscriptions, and messages.",
        },
        evidence: {
          sources: [
            {
              kind: "database",
              detail: `database.ready=false; source=${evidence.database.source ?? "unknown"}; driver=${evidence.database.driver ?? "unknown"}`,
            },
          ],
        },
      }),
    );
  }

  if ((evidence.database?.slowQueries?.length ?? 0) > 0) {
    findings.push(
      makeFinding({
        title: "Database slow query evidence needs optimization",
        domain: "Database",
        severity: "Medium",
        problem: `${evidence.database?.slowQueries?.length ?? 0} slow query record(s) were supplied.`,
        impact: "Slow queries can degrade admin dashboards, application review, and public submission flows as data volume grows.",
        recommendation: [
          "Group slow queries by table and predicate.",
          "Add or adjust indexes only after checking the existing schema and query plans.",
        ],
        implementationSteps: [
          "Run EXPLAIN ANALYZE for the top slow query in a safe environment.",
          "Confirm whether an existing index should be reused or a new index is warranted.",
          "Add a migration and validate query latency after deployment.",
        ],
        expectedOutcome: {
          performanceGain: "Improves API response time for high-volume data paths.",
          costReduction: "Reduces database CPU and connection pressure.",
        },
        evidence: {
          sources: [{ kind: "database", detail: "slowQueries evidence array was non-empty." }],
        },
      }),
    );
  }

  const activeEmailProviders = evidence.email?.activeProviders ?? stringArrayAt(evidence.email?.raw, "activeProviders");
  const emailDryRun = booleanAt(evidence.email?.diagnostics, "dryRunEnabled") ?? booleanAt(evidence.email?.raw, "dryRunEnabled");
  const emailActivationReady =
    booleanAt(evidence.email?.diagnostics, "activation", "ready") ?? booleanAt(evidence.email?.raw, "activation", "ready");
  const emailDnsReady =
    booleanAt(evidence.email?.diagnostics, "activation", "dnsReady") ?? booleanAt(evidence.email?.raw, "activation", "dnsReady");

  if (evidence.email?.ready === false || activeEmailProviders.length === 0) {
    findings.push(
      makeFinding({
        title: activeEmailProviders.length === 0 ? "No live transactional email provider is active" : "Email readiness is degraded",
        domain: "Email & Notifications",
        severity: activeEmailProviders.length === 0 ? "Critical" : "High",
        problem:
          activeEmailProviders.length === 0
            ? "Health evidence reports no active transactional email providers."
            : "Health evidence reports that transactional email is not ready for reliable live delivery.",
        impact: "Subscription confirmations, contact acknowledgements, verification emails, application updates, and event tickets may be saved but not delivered.",
        recommendation: [
          "Configure and verify the active provider in the production environment before relying on user-facing confirmations.",
          "Use the email queue drain endpoint to clear durable backlog after provider readiness is restored.",
        ],
        implementationSteps: [
          "Check /api/health and confirm activeProviders includes the intended provider.",
          "Confirm provider DNS and sender-domain readiness in the provider dashboard.",
          "Submit a production test event and verify email_jobs.status=sent with a provider_message_id.",
        ],
        expectedOutcome: {
          userExperienceImprovement: "Users receive confirmation emails instead of partial-success warnings.",
          revenueImpact: "Improves lead capture and follow-up reliability for admissions, subscriptions, and applications.",
        },
        evidence: {
          sources: [
            {
              kind: "email",
              detail: `email.ready=${String(evidence.email?.ready)}; activeProviders=${activeEmailProviders.join(",") || "none"}`,
            },
          ],
        },
      }),
    );
  }

  if (emailDryRun === true) {
    findings.push(
      makeFinding({
        title: "Email dry-run mode is enabled",
        domain: "Email & Notifications",
        severity: "High",
        problem: "Email diagnostics indicate dry-run mode is active.",
        impact: "The application can save email jobs without sending real messages to users.",
        recommendation: ["Set EMAIL_DRY_RUN=false in production and redeploy after confirming a live provider is configured."],
        implementationSteps: [
          "Update the production environment variable.",
          "Redeploy the latest backend commit.",
          "Run one transactional email smoke test and verify provider logs.",
        ],
        expectedOutcome: {
          userExperienceImprovement: "Transactional emails are actually handed to the provider.",
        },
        evidence: {
          sources: [{ kind: "email", detail: "dryRunEnabled=true" }],
        },
      }),
    );
  }

  if (emailActivationReady === false || emailDnsReady === false) {
    findings.push(
      makeFinding({
        title: "Sending-domain activation is not ready",
        domain: "Email & Notifications",
        severity: "High",
        problem: "Email activation diagnostics report that provider or DNS readiness is incomplete.",
        impact: "Providers may reject live public-recipient email even when queueing succeeds.",
        recommendation: [
          "Complete the provider domain verification and DNS alignment records for the configured sender domain.",
          "Do not treat provider smoke tests from a testing sender as proof that production sender-domain delivery is ready.",
        ],
        implementationSteps: [
          "Open the provider domain page and verify SPF/DKIM/return-path status.",
          "Confirm EMAIL_FROM uses the verified sender domain.",
          "Recheck /api/health until email.activation.ready is true.",
        ],
        expectedOutcome: {
          securityImprovement: "Improves sender authentication and reduces spoofing/rejection risk.",
          userExperienceImprovement: "Public recipients receive confirmation and notification emails reliably.",
        },
        evidence: {
          sources: [{ kind: "email", detail: `activation.ready=${String(emailActivationReady)}; dnsReady=${String(emailDnsReady)}` }],
        },
      }),
    );
  }

  const queueWorkerEnabled = booleanAt(evidence.email?.queueWorker, "enabled");
  const queueWorkerRunning = booleanAt(evidence.email?.queueWorker, "running");
  const cronConfigured = evidence.configSnapshot?.emailQueueCronConfigured === true;
  const vercelRuntime = evidence.configSnapshot?.vercel === true || evidence.runtime?.container.vercel === true;
  if (queueWorkerEnabled === true && queueWorkerRunning === false && !(vercelRuntime && cronConfigured)) {
    findings.push(
      makeFinding({
        title: "Email queue worker is enabled but not running",
        domain: "Email & Notifications",
        severity: "Medium",
        problem: "The email queue worker status says it is enabled but not running, and no Vercel queue-drain cron evidence was supplied.",
        impact: "Retry-scheduled or queued email jobs may remain stuck after an inline provider failure.",
        recommendation: [
          "Run email queue processing through a persistent worker or a scheduled Vercel cron drain.",
          "Keep inline delivery for user-facing transactional routes, then use the drain for retries/backlog.",
        ],
        implementationSteps: [
          "Verify vercel.json contains /api/email/queue/drain if deployed on Vercel.",
          "Verify CRON_SECRET or Vercel Cron authorization for manual/automated drains.",
          "Inspect email_jobs for queued, retry_scheduled, processing, and failed statuses.",
        ],
        expectedOutcome: {
          userExperienceImprovement: "Delayed confirmations recover automatically after provider or network interruptions.",
        },
        evidence: {
          sources: [{ kind: "queue", detail: `enabled=${queueWorkerEnabled}; running=${queueWorkerRunning}; cronConfigured=${cronConfigured}` }],
        },
      }),
    );
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
        domain: "Security",
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
        domain: "Security",
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
        domain: "Security",
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

  const webVitals = evidence.frontend?.webVitals;
  const lcpMs = webVitals?.lcpMs ?? null;
  const inpMs = webVitals?.inpMs ?? null;
  const cls = webVitals?.cls ?? null;
  if ((lcpMs !== null && lcpMs > 2_500) || (inpMs !== null && inpMs > 200) || (cls !== null && cls > 0.1)) {
    findings.push(
      makeFinding({
        title: "Frontend web-vitals evidence is outside target",
        domain: "Frontend",
        severity: (lcpMs ?? 0) > 4_000 || (inpMs ?? 0) > 500 || (cls ?? 0) > 0.25 ? "High" : "Medium",
        problem: `Supplied web-vitals evidence shows LCP=${lcpMs ?? "unknown"}ms, INP=${inpMs ?? "unknown"}ms, CLS=${cls ?? "unknown"}.`,
        impact: "Slow or unstable pages reduce trust and can increase drop-off in subscription, contact, and application flows.",
        recommendation: [
          "Profile the affected page on mobile and desktop before changing UI code.",
          "Optimize the largest render-blocking asset or interaction handler shown by the trace.",
        ],
        implementationSteps: [
          "Capture Lighthouse or Playwright trace evidence for the affected viewport.",
          "Prioritize image sizing, code splitting, hydration work, and blocking request reduction.",
          "Retest the same viewport and compare metrics.",
        ],
        expectedOutcome: {
          performanceGain: "Improves page load and interaction responsiveness.",
          userExperienceImprovement: "Reduces friction in high-intent public flows.",
        },
        evidence: {
          sources: [{ kind: "frontend", detail: `lcpMs=${lcpMs}; inpMs=${inpMs}; cls=${cls}` }],
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
  const highest = [...findings].sort(findingSort)[0];
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

export const buildOperationalSignals = (evidence: MonitoringEvidence, findings: IssueFinding[]): OperationalSignal[] => {
  const byDomain = (domain: NonNullable<IssueFinding["domain"]>) => findings.filter((finding) => finding.domain === domain);
  const parsedMetrics = evidence.metrics?.parsed;
  const activeProviders = evidence.email?.activeProviders ?? stringArrayAt(evidence.email?.raw, "activeProviders");
  const memoryUsedRatio = evidence.runtime?.host.memoryUsedRatio ?? null;
  const heapRatio =
    evidence.runtime && evidence.runtime.process.heapTotalBytes > 0
      ? evidence.runtime.process.heapUsedBytes / evidence.runtime.process.heapTotalBytes
      : null;

  return [
    {
      domain: "Infrastructure",
      label: "Host memory",
      value: formatPercent(memoryUsedRatio),
      status:
        memoryUsedRatio === null
          ? "unknown"
          : memoryUsedRatio >= 0.9
            ? "critical"
            : memoryUsedRatio >= 0.8
              ? "risk"
              : memoryUsedRatio >= 0.7
                ? "watch"
                : "healthy",
      note: evidence.runtime ? `${evidence.runtime.host.cpuCount} CPU core(s), Node ${evidence.runtime.node.version}` : "Runtime evidence was not supplied.",
      evidenceKind: "runtime",
    },
    {
      domain: "Infrastructure",
      label: "Node heap",
      value: formatPercent(heapRatio),
      status:
        heapRatio === null
          ? "unknown"
          : heapRatio >= 0.9
            ? "critical"
            : heapRatio >= 0.8
              ? "risk"
              : heapRatio >= 0.7
                ? "watch"
                : "healthy",
      evidenceKind: "runtime",
    },
    {
      domain: "Backend Services",
      label: "Health endpoint",
      value: evidence.health.ok ? "ready" : "not ready",
      status: evidence.health.ok ? mostSevereStatus(byDomain("Backend Services")) : "risk",
      evidenceKind: "health",
    },
    {
      domain: "Backend Services",
      label: "HTTP error rate",
      value: formatPercent(parsedMetrics?.errorRate),
      status:
        parsedMetrics?.errorRate === null || parsedMetrics?.errorRate === undefined
          ? "unknown"
          : parsedMetrics.errorRate >= 0.05
            ? "risk"
            : parsedMetrics.errorRate >= 0.01
              ? "watch"
              : "healthy",
      note: parsedMetrics ? `${parsedMetrics.serverErrorTotal} server error(s) over ${parsedMetrics.requestTotal} request(s).` : "Metrics evidence was not supplied.",
      evidenceKind: "metrics",
    },
    {
      domain: "Database",
      label: "Database readiness",
      value: evidence.database?.ready === undefined ? "unknown" : evidence.database.ready ? "ready" : "not ready",
      status: evidence.database?.ready === undefined ? "unknown" : evidence.database.ready ? mostSevereStatus(byDomain("Database")) : "critical",
      note: evidence.database?.source ? `Source: ${evidence.database.source}; driver: ${evidence.database.driver ?? "unknown"}` : undefined,
      evidenceKind: "database",
    },
    {
      domain: "Email & Notifications",
      label: "Transactional email",
      value: activeProviders.length ? activeProviders.join(", ") : "no active provider",
      status:
        evidence.email?.ready === undefined
          ? "unknown"
          : evidence.email.ready && activeProviders.length > 0
            ? mostSevereStatus(byDomain("Email & Notifications"))
            : "critical",
      evidenceKind: "email",
    },
    {
      domain: "Email & Notifications",
      label: "Queue drain",
      value: evidence.configSnapshot?.emailQueueCronConfigured === true ? "cron configured" : "cron not confirmed",
      status: evidence.configSnapshot?.emailQueueCronConfigured === true ? "healthy" : "watch",
      note: "Vercel cron or a persistent worker is required for retry/backlog processing.",
      evidenceKind: "queue",
    },
    {
      domain: "Security",
      label: "Metrics access control",
      value: evidence.configSnapshot?.metricsSecretConfigured ? "secret configured" : "secret not confirmed",
      status: evidence.configSnapshot?.metricsSecretConfigured ? mostSevereStatus(byDomain("Security")) : "watch",
      evidenceKind: "config",
    },
    {
      domain: "Frontend",
      label: "Web vitals",
      value: evidence.frontend?.webVitals ? "supplied" : "not supplied",
      status: mostSevereStatus(byDomain("Frontend"), evidence.frontend?.webVitals ? "healthy" : "unknown"),
      evidenceKind: "frontend",
    },
    {
      domain: "Product Intelligence",
      label: "Product analytics",
      value: evidence.productAnalytics?.summary || evidence.productAnalytics?.recentEvents ? "supplied" : "not supplied",
      status: evidence.productAnalytics?.summary || evidence.productAnalytics?.recentEvents ? "healthy" : "unknown",
      note: "Conversion and retention recommendations are stronger when event analytics are supplied.",
      evidenceKind: "product",
    },
    {
      domain: "Deployment",
      label: "Runtime target",
      value: evidence.runtime?.container.vercel ? "Vercel" : "Node process",
      status: "healthy",
      note: evidence.runtime?.container.region ? `Region: ${evidence.runtime.container.region}` : undefined,
      evidenceKind: "runtime",
    },
  ];
};

const insightFromFinding = (finding: IssueFinding): ProductInsight => ({
  area: finding.domain || "Platform",
  observation: finding.problem,
  opportunity: finding.impact,
  recommendedAction: finding.recommendation[0] || "Review and prioritize the finding.",
  expectedImpact:
    finding.expectedOutcome?.revenueImpact ||
    finding.expectedOutcome?.userExperienceImprovement ||
    finding.expectedOutcome?.performanceGain ||
    "Improves platform reliability and user trust.",
  evidence: finding.evidence.sources.map((source) => `${source.kind}: ${source.detail}`).join("; "),
});

export const buildProductIntelligence = (
  evidence: MonitoringEvidence,
  findings: IssueFinding[],
): MonitoringReport["productIntelligence"] => {
  const emailFindings = findings.filter((finding) => finding.domain === "Email & Notifications");
  const frontendFindings = findings.filter((finding) => finding.domain === "Frontend");
  const backendFindings = findings.filter((finding) => finding.domain === "Backend Services");

  const highPerformingFeatures: ProductInsight[] = [];
  if (evidence.productAnalytics?.summary) {
    highPerformingFeatures.push({
      area: "Observed product analytics",
      observation: "A product analytics summary was supplied to this report.",
      opportunity: "Use the supplied analytics as the baseline for daily and weekly growth reporting.",
      recommendedAction: "Attach conversion, retention, and campaign metrics to future report evidence.",
      expectedImpact: "Improves prioritization accuracy for product and revenue decisions.",
      evidence: "productAnalytics.summary",
    });
  }

  const underusedFeatures: ProductInsight[] = [];
  if (!evidence.productAnalytics?.summary && !evidence.productAnalytics?.recentEvents) {
    underusedFeatures.push({
      area: "Product analytics coverage",
      observation: "No product analytics evidence was supplied.",
      opportunity: "Feature adoption, drop-off, and retention decisions are currently limited by telemetry coverage.",
      recommendedAction: "Feed anonymized conversion events for subscriptions, contact, applications, verification, and admin workflows into the report.",
      expectedImpact: "Better targeting for UX improvements and marketing follow-up.",
    });
  }

  return {
    highPerformingFeatures,
    underusedFeatures,
    conversionBottlenecks: [...emailFindings, ...backendFindings].slice(0, 5).map(insightFromFinding),
    retentionSignals: frontendFindings.slice(0, 5).map(insightFromFinding),
    revenueOpportunities: emailFindings.slice(0, 5).map((finding) => ({
      ...insightFromFinding(finding),
      area: "Email-driven conversion",
      expectedImpact: finding.expectedOutcome?.revenueImpact || "Recover lead capture, application follow-up, and newsletter conversion value.",
    })),
  };
};

export const buildOptimizationRoadmap = (findings: IssueFinding[]): OptimizationRoadmapItem[] =>
  [...findings].sort(findingSort).slice(0, 10).map((finding) => ({
    domain: finding.domain || "Backend Services",
    severity: finding.severity,
    action: finding.recommendation[0] || finding.title,
    rationale: finding.impact,
    expectedOutcome:
      finding.expectedOutcome?.performanceGain ||
      finding.expectedOutcome?.securityImprovement ||
      finding.expectedOutcome?.userExperienceImprovement ||
      finding.expectedOutcome?.revenueImpact ||
      "Improves operational resilience.",
    sourceFindingIds: [finding.id],
  }));

export const buildExecutiveSummary = (
  evidence: MonitoringEvidence,
  findings: IssueFinding[],
  systemHealthScore: number,
  productIntelligence: MonitoringReport["productIntelligence"],
  roadmap: OptimizationRoadmapItem[],
): MonitoringReport["executiveSummary"] => {
  const prioritized = [...findings].sort(findingSort);
  const healthNarrative =
    systemHealthScore >= 90
      ? "The supplied evidence shows a mostly healthy platform posture for this pass."
      : systemHealthScore >= 70
        ? "The supplied evidence shows operational risks that should be handled before scaling traffic."
        : "The supplied evidence shows material reliability or readiness issues that need immediate attention.";

  const businessOpportunities = [
    ...productIntelligence.revenueOpportunities.map((item) => item.opportunity),
    !evidence.productAnalytics?.summary ? "Add product analytics evidence to turn UX observations into conversion and retention priorities." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    healthNarrative,
    topRisks: prioritized.slice(0, 5).map((finding) => `${finding.severity}: ${finding.title}`),
    recommendedNextActions: roadmap.slice(0, 5).map((item) => item.action),
    businessOpportunities: businessOpportunities.slice(0, 5),
  };
};
