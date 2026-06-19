import assert from "node:assert/strict";
import test from "node:test";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "monitoring-engine-test-secret-with-enough-length";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const sampleMetrics = [
  "# HELP app_uptime_seconds Application uptime in seconds.",
  "# TYPE app_uptime_seconds gauge",
  "app_uptime_seconds 120",
  "# HELP app_http_requests_total Total HTTP requests processed.",
  "# TYPE app_http_requests_total counter",
  'app_http_requests_total{method="GET",path="/api/health",status="200"} 10',
  'app_http_requests_total{method="POST",path="/api/subscribers",status="500"} 2',
  "# HELP app_http_request_duration_ms_count Total number of request duration samples.",
  "# TYPE app_http_request_duration_ms_count counter",
  'app_http_request_duration_ms_count{method="POST",path="/api/subscribers"} 2',
  "# HELP app_http_request_duration_ms_sum Total sum of request durations in milliseconds.",
  "# TYPE app_http_request_duration_ms_sum counter",
  'app_http_request_duration_ms_sum{method="POST",path="/api/subscribers"} 6200',
  "# HELP app_http_request_duration_ms_max Max observed request duration in milliseconds.",
  "# TYPE app_http_request_duration_ms_max gauge",
  'app_http_request_duration_ms_max{method="POST",path="/api/subscribers"} 4200',
].join("\n");

test("monitoring report builds domain signals, product intelligence, and roadmap from real evidence", async () => {
  const { buildLocalEvidence } = await import("../../server/monitoring-engine/evidence");
  const { buildReportFromEvidence } = await import("../../server/monitoring-engine/report");

  const evidence = await buildLocalEvidence({
    health: {
      ok: false,
      raw: {
        database: {
          ready: false,
          source: "POSTGRES_URL_NON_POOLING",
          driver: "neon",
          error: { type: "connectivity_failed" },
        },
        email: {
          ready: false,
          activeProviders: [],
          dryRunEnabled: false,
          queueWorker: {
            enabled: true,
            running: false,
          },
          activation: {
            ready: false,
            dnsReady: false,
          },
        },
      },
    },
    metrics: {
      promText: sampleMetrics,
    },
    configSnapshot: {
      metricsSecretConfigured: false,
      recaptchaConfigured: true,
      emailQueueCronConfigured: true,
      vercel: true,
    },
  });

  assert.equal(evidence.metrics?.parsed?.serverErrorTotal, 2);
  assert.equal(evidence.database?.ready, false);
  assert.equal(evidence.email?.activeProviders?.length, 0);

  const report = await buildReportFromEvidence(evidence);
  const findingTitles = report.findings.map((finding) => finding.title);

  assert.equal(report.operationalSignals.some((signal) => signal.domain === "Email & Notifications"), true);
  assert.equal(report.operationalSignals.some((signal) => signal.domain === "Database"), true);
  assert.equal(findingTitles.includes("No live transactional email provider is active"), true);
  assert.equal(findingTitles.includes("Database readiness check is failing"), true);
  assert.equal(findingTitles.includes("HTTP request metrics show server-side failures"), true);
  assert.equal(report.productIntelligence.conversionBottlenecks.length > 0, true);
  assert.equal(report.optimizationRoadmap.some((item) => item.domain === "Email & Notifications"), true);
  assert.equal(report.executiveSummary.topRisks.length > 0, true);
});
