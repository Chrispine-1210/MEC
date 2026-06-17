import fs from "fs";
import path from "path";

import {
  type IssueFinding,
  type MonitoringEvidence,
  type MonitoringReport,
  type MonitoringReport as ReportType,
} from "./types";
import { analyzeEvidence, buildIceBreaker, computeSystemHealthScore } from "./analyzer";

const ensureDir = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
};

const stableStringify = (value: unknown) =>
  JSON.stringify(
    value,
    (_k, v) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.keys(v as Record<string, unknown>)
          .sort()
          .reduce((acc, key) => {
            acc[key] = (v as Record<string, unknown>)[key];
            return acc;
          }, {} as Record<string, unknown>);
      }
      return v;
    },
    2,
  );

const severityRank = (s: IssueFinding["severity"]) =>
  s === "Critical" ? 4 : s === "High" ? 3 : s === "Medium" ? 2 : 1;

const renderMarkdownReport = (report: MonitoringReport) => {
  const sortedFindings = [...report.findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const findingsMd = sortedFindings
    .map((f, idx) => {
      const impl = f.implementationSteps?.length
        ? `\n\n**Implementation steps**\n${f.implementationSteps.map((s) => `- ${s}`).join("\n")}`
        : "";

      const outcome = f.expectedOutcome
        ? `\n\n**Expected outcome**\n${Object.entries(f.expectedOutcome)
            .filter(([, v]) => Boolean(v))
            .map(([k, v]) => `- ${k}: ${String(v)}`)
            .join("\n")}`
        : "";

      const evidence = `\n\n**Evidence**\n${f.evidence.sources
        .map((src) => `- ${src.kind}${src.path ? ` (${src.path})` : ""}: ${src.detail}`)
        .join("\n")}`;

      return `### ${idx + 1}. ${f.title}  \n**Severity:** ${f.severity}\n\n**Problem**\n${f.problem}\n\n**Impact**\n${f.impact}\n\n**Recommendations**\n${f.recommendation.map((r) => `- ${r}`).join("\n")}${impl}${outcome}${evidence}`;
    })
    .join("\n\n---\n\n");

  return `# MEC AI System Monitoring Report\n\n` +
    `- **Report ID:** ${report.reportId}\n` +
    `- **Generated at:** ${report.generatedAt}\n` +
    `- **System health score:** ${report.systemHealthScore}/100\n\n` +
    `## Ice-breaker\n` +
    `Tone: ${report.iceBreaker.tone}\n` +
    `**Opener:** ${report.iceBreaker.opener}\n\n` +
    `**Next action:** ${report.iceBreaker.nextAction}\n\n` +
    `## Daily summary\n` +
    `- New issues: ${report.daily.newIssues.length}\n` +
    `- Resolved issues: ${report.daily.resolvedIssues.length}\n` +
    `- Security alerts: ${report.daily.securityAlerts.length}\n\n` +
    `## Findings (prioritized)\n\n${findingsMd || "_No findings._"}\n`;
};

export const buildReportFromEvidence = async (evidence: MonitoringEvidence): Promise<MonitoringReport> => {
  const findings = await analyzeEvidence(evidence);
  const systemHealthScore = computeSystemHealthScore(evidence, findings);
  const iceBreaker = buildIceBreaker(findings);

  const dailyNewIssues = findings
    .slice(0, 10)
    .filter((f) => f.severity === "Critical" || f.severity === "High");

  return {
    reportId: `mon-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    generatedAt: new Date().toISOString(),
    systemHealthScore,
    daily: {
      newIssues: dailyNewIssues,
      resolvedIssues: [],
      securityAlerts: findings.filter((f) => f.title.toLowerCase().includes("security")),
      performanceTrends: [
        ...(evidence.metrics?.promText
          ? [
              {
                metric: "app_http_errors_total",
                observation: "Derived from /api/metrics text (needs alerting thresholds in future).",
              },
            ]
          : []),
      ],
    },
    weeklyExecutive: {
      growthMetrics: [],
      infrastructureStatus: [
        { label: "Metrics endpoint", value: evidence.configSnapshot?.metricsSecretConfigured ? "secured" : "unknown" },
      ],
      technicalDebt: findings
        .slice(0, 5)
        .map((f) => ({ label: f.title, severity: f.severity, note: f.problem })),
      recommendedPriorities: findings
        .slice(0, 5)
        .map((f) => ({ priority: f.severity, rationale: f.recommendation[0] ?? f.problem })),
    },
    findings,
    iceBreaker,
    evidence,
  };
};

export const writeReportArtifacts = async (params: {
  report: MonitoringReport;
  outputDir: string;
}): Promise<{ jsonPath: string; mdPath: string }> => {
  const { report, outputDir } = params;
  ensureDir(outputDir);

  const jsonPath = path.join(outputDir, `${report.reportId}.json`);
  const mdPath = path.join(outputDir, `${report.reportId}.md`);

  fs.writeFileSync(jsonPath, stableStringify(report), "utf8");
  fs.writeFileSync(mdPath, renderMarkdownReport(report), "utf8");

  return { jsonPath, mdPath };
};

