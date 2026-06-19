export type Severity = "Critical" | "High" | "Medium" | "Low";

export type MonitoringDomain =
  | "Infrastructure"
  | "Backend Services"
  | "Database"
  | "Security"
  | "Frontend"
  | "Email & Notifications"
  | "Product Intelligence"
  | "Deployment";

export type SignalStatus = "healthy" | "watch" | "risk" | "critical" | "unknown";

export type EvidenceSourceKind =
  | "health"
  | "metrics"
  | "security_audit_jsonl"
  | "prometheus_metrics_text"
  | "manual"
  | "config"
  | "runtime"
  | "database"
  | "email"
  | "communication"
  | "frontend"
  | "product"
  | "queue"
  | "observability";

export type IssueFinding = {
  id: string;
  title: string;
  domain?: MonitoringDomain;

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
      kind: EvidenceSourceKind;
      path?: string;
      detail: string;
    }>;
  };
};

export type OperationalSignal = {
  domain: MonitoringDomain;
  label: string;
  value: string;
  status: SignalStatus;
  note?: string;
  evidenceKind?: EvidenceSourceKind;
};

export type HttpRouteMetric = {
  method: string;
  path: string;
  requests: number;
  serverErrors: number;
  averageDurationMs: number | null;
  maxDurationMs: number | null;
};

export type HttpMetricsSummary = {
  uptimeSeconds: number | null;
  requestTotal: number;
  serverErrorTotal: number;
  errorRate: number | null;
  averageDurationMs: number | null;
  maxDurationMs: number | null;
  slowestRoutes: HttpRouteMetric[];
  highestErrorRoutes: HttpRouteMetric[];
};

export type ProductInsight = {
  area: string;
  observation: string;
  opportunity: string;
  recommendedAction: string;
  expectedImpact: string;
  evidence?: string;
};

export type OptimizationRoadmapItem = {
  domain: MonitoringDomain;
  severity: Severity;
  action: string;
  rationale: string;
  expectedOutcome: string;
  sourceFindingIds: string[];
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
    parsed?: HttpMetricsSummary;
  };

  securityAudit?: {
    jsonlPath?: string;
    recentEvents?: Array<Record<string, unknown>>;
  };

  runtime?: {
    node: {
      version: string;
      env: string;
      uptimeSeconds: number;
    };
    process: {
      pid: number;
      platform: NodeJS.Platform;
      arch: string;
      rssBytes: number;
      heapUsedBytes: number;
      heapTotalBytes: number;
      externalBytes: number;
      cpuUserMicros: number;
      cpuSystemMicros: number;
    };
    host: {
      cpuCount: number;
      loadAverage1m: number | null;
      loadAverage5m: number | null;
      loadAverage15m: number | null;
      totalMemoryBytes: number;
      freeMemoryBytes: number;
      memoryUsedRatio: number | null;
    };
    container: {
      vercel: boolean;
      region?: string | null;
      deploymentUrl?: string | null;
    };
  };

  database?: {
    ready?: boolean;
    source?: string | null;
    driver?: string | null;
    error?: unknown;
    slowQueries?: Array<Record<string, unknown>>;
    locks?: Array<Record<string, unknown>>;
    backup?: Record<string, unknown>;
    raw?: unknown;
  };

  email?: {
    ready?: boolean;
    activeProviders?: string[];
    queueWorker?: Record<string, unknown>;
    platformHealth?: unknown;
    diagnostics?: unknown;
    raw?: unknown;
  };

  communication?: {
    diagnostics?: unknown;
    analytics?: unknown;
    raw?: unknown;
  };

  frontend?: {
    webVitals?: {
      lcpMs?: number | null;
      inpMs?: number | null;
      cls?: number | null;
      fcpMs?: number | null;
      ttfbMs?: number | null;
    };
    javascriptErrors?: Array<Record<string, unknown>>;
    browserCompatibility?: Record<string, unknown>;
    raw?: unknown;
  };

  productAnalytics?: {
    summary?: Record<string, unknown>;
    recentEvents?: Array<Record<string, unknown>>;
    raw?: unknown;
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

  operationalSignals: OperationalSignal[];

  executiveSummary: {
    healthNarrative: string;
    topRisks: string[];
    recommendedNextActions: string[];
    businessOpportunities: string[];
  };

  productIntelligence: {
    highPerformingFeatures: ProductInsight[];
    underusedFeatures: ProductInsight[];
    conversionBottlenecks: ProductInsight[];
    retentionSignals: ProductInsight[];
    revenueOpportunities: ProductInsight[];
  };

  optimizationRoadmap: OptimizationRoadmapItem[];

  iceBreaker: {
    opener: string;
    tone: "friendly-technical";
    nextAction: string;
  };

  evidence: MonitoringEvidence;
};
