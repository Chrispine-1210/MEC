import fs from "fs";
import path from "path";

import {
  type IssueFinding,
  type MonitoringEvidence,
  type MonitoringReport,
} from "./types";
import {
  analyzeEvidence,
  buildExecutiveSummary,
  buildIceBreaker,
  buildOperationalSignals,
  buildOptimizationRoadmap,
  buildProductIntelligence,
  computeSystemHealthScore,
} from "./analyzer";

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

  const signalsMd = report.operationalSignals
    .map((signal) => {
      const note = signal.note ? ` - ${signal.note}` : "";
      return `- **${signal.domain} / ${signal.label}:** ${signal.value} (${signal.status})${note}`;
    })
    .join("\n");

  const roadmapMd = report.optimizationRoadmap
    .map((item, idx) => `${idx + 1}. **${item.domain} [${item.severity}]** ${item.action}\n   - ${item.expectedOutcome}`)
    .join("\n");

  const productMd = Object.entries(report.productIntelligence)
    .map(([section, insights]) => {
      const list = insights.length
        ? insights
            .map((insight) => `- **${insight.area}:** ${insight.observation} Recommendation: ${insight.recommendedAction}`)
            .join("\n")
        : "- _No evidence-backed insights for this section._";
      return `### ${section}\n${list}`;
    })
    .join("\n\n");

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

      return `### ${idx + 1}. ${f.title}  \n**Domain:** ${f.domain ?? "Unclassified"}  \n**Severity:** ${f.severity}\n\n**Problem**\n${f.problem}\n\n**Impact**\n${f.impact}\n\n**Recommendations**\n${f.recommendation.map((r) => `- ${r}`).join("\n")}${impl}${outcome}${evidence}`;
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
    `## Executive summary\n` +
    `${report.executiveSummary.healthNarrative}\n\n` +
    `**Top risks**\n${report.executiveSummary.topRisks.map((risk) => `- ${risk}`).join("\n") || "- _None._"}\n\n` +
    `**Recommended next actions**\n${report.executiveSummary.recommendedNextActions.map((action) => `- ${action}`).join("\n") || "- _None._"}\n\n` +
    `**Business opportunities**\n${report.executiveSummary.businessOpportunities.map((item) => `- ${item}`).join("\n") || "- _None._"}\n\n` +
    `## Daily summary\n` +
    `- New issues: ${report.daily.newIssues.length}\n` +
    `- Resolved issues: ${report.daily.resolvedIssues.length}\n` +
    `- Security alerts: ${report.daily.securityAlerts.length}\n\n` +
    `## Operational signals\n\n${signalsMd || "_No operational signals._"}\n\n` +
    `## Product intelligence\n\n${productMd}\n\n` +
    `## Optimization roadmap\n\n${roadmapMd || "_No roadmap actions._"}\n\n` +
    `## Findings (prioritized)\n\n${findingsMd || "_No findings._"}\n`;
};

export const buildReportFromEvidence = async (evidence: MonitoringEvidence): Promise<MonitoringReport> => {
  const findings = await analyzeEvidence(evidence);
  const systemHealthScore = computeSystemHealthScore(evidence, findings);
  const iceBreaker = buildIceBreaker(findings);
  const operationalSignals = buildOperationalSignals(evidence, findings);
  const productIntelligence = buildProductIntelligence(evidence, findings);
  const optimizationRoadmap = buildOptimizationRoadmap(findings);
  const executiveSummary = buildExecutiveSummary(
    evidence,
    findings,
    systemHealthScore,
    productIntelligence,
    optimizationRoadmap,
  );

  const prioritizedFindings = [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const dailyNewIssues = prioritizedFindings
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
      technicalDebt: prioritizedFindings
        .slice(0, 5)
        .map((f) => ({ label: f.title, severity: f.severity, note: f.problem })),
      recommendedPriorities: prioritizedFindings
        .slice(0, 5)
        .map((f) => ({ priority: f.severity, rationale: f.recommendation[0] ?? f.problem })),
    },
    findings,
    operationalSignals,
    executiveSummary,
    productIntelligence,
    optimizationRoadmap,
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

