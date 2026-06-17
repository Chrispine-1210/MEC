export type Severity = "Critical" | "High" | "Medium" | "Low";

export type IssueFinding = {
  id: string;
  title: string;

  problem: string;
  impact: string;
  severity: Severity;

  recommendation: string[];
  implementationSteps?: string[];

  expectedOutcome?: {
    performanceGain?: string;
    costReduction?: string;
    securityImprovement?: string;
    userExperienceImprovement?: string;
    revenueImpact?: string;
  };

  evidence: {
    sources: Array<{
      kind:
        | "health"
        | "metrics"
        | "security_audit_jsonl"
        | "prometheus_metrics_text"
        | "manual"
        | "config";
      path?: string;
      detail: string;
    }>;
  };
};

export type MonitoringEvidence = {
  collectedAt: string;

  health: {
    ok: boolean;
    // Keep raw optional so evidence collectors can stash /api/health payload details.
    raw?: unknown;
  };

  metrics?: {
    promText?: string;
    raw?: unknown;
    // Parsed counters/durations may go here later.
  };

  securityAudit?: {
    jsonlPath?: string;
    recentEvents?: Array<Record<string, unknown>>;
  };

  configSnapshot?: Record<string, unknown>;
};

export type MonitoringReport = {
  reportId: string;
  generatedAt: string;

  // Daily-style summary (can expand later)
  systemHealthScore: number; // 0-100

  daily: {
    newIssues: IssueFinding[];
    resolvedIssues: IssueFinding[];
    securityAlerts: IssueFinding[];
    performanceTrends: Array<{
      metric: string;
      observation: string;
    }>;
  };

  weeklyExecutive: {
    growthMetrics: Array<{ label: string; value: string; note?: string }>;
    infrastructureStatus: Array<{ label: string; value: string; note?: string }>;
    technicalDebt: Array<{ label: string; severity: Severity; note: string }>;
    recommendedPriorities: Array<{ priority: string; rationale: string }>;
  };

  findings: IssueFinding[];

  iceBreaker: {
    opener: string;
    tone: "friendly-technical";
    nextAction: string;
  };

  evidence: MonitoringEvidence;
};
