import fs from "fs";
import os from "os";
import path from "path";

import { type HttpMetricsSummary, type MonitoringEvidence } from "./types";
import { env } from "../env";

/**
 * Evidence collection strategy:
 * - health: call /api/health is done by the CLI (HTTP). Here we just shape the data.
 * - metrics: call /api/metrics is done by the CLI (HTTP). Here we just shape the text.
 * - security audit JSONL: read from local filesystem if present.
 *
 * This module focuses on filesystem reading + shaping evidence.
 */
export const guessSecurityAuditJsonlPath = (): string | null => {
  try {
    // In server/index.ts this path is built roughly as:
    // resolveWritableRuntimePath("data") + "security-audit.jsonl"
    // We don't import runtime-paths here to keep it lightweight.
    const candidates: string[] = [];

    // Common local dev candidate (repo root)
    candidates.push(path.resolve(process.cwd(), "data", "security-audit.jsonl"));

    // If runtime path resolves to ./data inside working directory, candidate above should hit.
    // Also try ./server/data and ./dist/data variants.
    candidates.push(path.resolve(process.cwd(), "server", "data", "security-audit.jsonl"));
    candidates.push(path.resolve(process.cwd(), "dist", "data", "security-audit.jsonl"));

    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }

    return null;
  } catch {
    return null;
  }
};

export const readRecentSecurityAuditEvents = async (jsonlPath: string, max = 50) => {
  const exists = fs.existsSync(jsonlPath);
  if (!exists) return [];

  const raw = await fs.promises.readFile(jsonlPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const recent = lines.slice(Math.max(0, lines.length - max)).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  });

  return recent.filter(Boolean) as Array<Record<string, unknown>>;
};

export type MonitoringEvidenceInput = {
  securityAuditJsonlPath?: string | null;
  health?: { ok: boolean; raw?: unknown };
  metrics?: { promText?: string; raw?: unknown; parsed?: HttpMetricsSummary };
  database?: MonitoringEvidence["database"];
  email?: MonitoringEvidence["email"];
  communication?: MonitoringEvidence["communication"];
  frontend?: MonitoringEvidence["frontend"];
  productAnalytics?: MonitoringEvidence["productAnalytics"];
  configSnapshot?: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getRecord = (value: unknown, key: string) => {
  if (!isRecord(value)) return undefined;
  const child = value[key];
  return isRecord(child) ? child : undefined;
};

const stringValue = (value: unknown) => (typeof value === "string" ? value : null);

const booleanValue = (value: unknown) => (typeof value === "boolean" ? value : undefined);

const numberValue = (value: unknown) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

const unescapePrometheusLabel = (value: string) =>
  value.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");

const parsePrometheusLabels = (labelBlock: string | undefined) => {
  const labels: Record<string, string> = {};
  if (!labelBlock) return labels;

  const labelPattern = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = labelPattern.exec(labelBlock))) {
    labels[match[1]] = unescapePrometheusLabel(match[2]);
  }

  return labels;
};

export const parseHttpMetricsSummary = (promText: string): HttpMetricsSummary => {
  const routeStats = new Map<
    string,
    {
      method: string;
      path: string;
      requests: number;
      serverErrors: number;
      durationCount: number;
      durationSumMs: number;
      maxDurationMs: number | null;
    }
  >();
  let uptimeSeconds: number | null = null;
  let requestTotal = 0;
  let serverErrorTotal = 0;
  let standaloneErrorCounterTotal = 0;
  let durationCountTotal = 0;
  let durationSumTotal = 0;
  let maxDurationMs: number | null = null;

  const getRoute = (method: string, metricPath: string) => {
    const key = `${method}|${metricPath}`;
    const existing = routeStats.get(key);
    if (existing) return existing;

    const created = {
      method,
      path: metricPath,
      requests: 0,
      serverErrors: 0,
      durationCount: 0,
      durationSumMs: 0,
      maxDurationMs: null as number | null,
    };
    routeStats.set(key, created);
    return created;
  };

  for (const rawLine of promText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)$/i);
    if (!match) continue;

    const [, metric, labelBlock, rawValue] = match;
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    const labels = parsePrometheusLabels(labelBlock);
    if (metric === "app_uptime_seconds") {
      uptimeSeconds = value;
      continue;
    }

    if (metric === "app_http_requests_total") {
      const method = labels.method || "UNKNOWN";
      const metricPath = labels.path || "unknown";
      const status = Number(labels.status);
      const route = getRoute(method, metricPath);
      route.requests += value;
      requestTotal += value;
      if (Number.isFinite(status) && status >= 500) {
        route.serverErrors += value;
        serverErrorTotal += value;
      }
      continue;
    }

    if (metric === "app_http_errors_total") {
      const status = Number(labels.status);
      if (!Number.isFinite(status) || status >= 500) {
        standaloneErrorCounterTotal += value;
      }
      continue;
    }

    if (metric === "app_http_request_duration_ms_count") {
      const route = getRoute(labels.method || "UNKNOWN", labels.path || "unknown");
      route.durationCount += value;
      durationCountTotal += value;
      continue;
    }

    if (metric === "app_http_request_duration_ms_sum") {
      const route = getRoute(labels.method || "UNKNOWN", labels.path || "unknown");
      route.durationSumMs += value;
      durationSumTotal += value;
      continue;
    }

    if (metric === "app_http_request_duration_ms_max") {
      const route = getRoute(labels.method || "UNKNOWN", labels.path || "unknown");
      route.maxDurationMs = Math.max(route.maxDurationMs ?? 0, value);
      maxDurationMs = Math.max(maxDurationMs ?? 0, value);
    }
  }

  const routes = [...routeStats.values()].map((route) => ({
    method: route.method,
    path: route.path,
    requests: route.requests,
    serverErrors: route.serverErrors,
    averageDurationMs: route.durationCount > 0 ? route.durationSumMs / route.durationCount : null,
    maxDurationMs: route.maxDurationMs,
  }));

  const effectiveServerErrorTotal = serverErrorTotal > 0 ? serverErrorTotal : standaloneErrorCounterTotal;

  return {
    uptimeSeconds,
    requestTotal,
    serverErrorTotal: effectiveServerErrorTotal,
    errorRate: requestTotal > 0 ? effectiveServerErrorTotal / requestTotal : null,
    averageDurationMs: durationCountTotal > 0 ? durationSumTotal / durationCountTotal : null,
    maxDurationMs,
    slowestRoutes: [...routes]
      .filter((route) => route.averageDurationMs !== null || route.maxDurationMs !== null)
      .sort((left, right) => (right.maxDurationMs ?? right.averageDurationMs ?? 0) - (left.maxDurationMs ?? left.averageDurationMs ?? 0))
      .slice(0, 5),
    highestErrorRoutes: [...routes]
      .filter((route) => route.serverErrors > 0)
      .sort((left, right) => right.serverErrors - left.serverErrors)
      .slice(0, 5),
  };
};

const readVercelCronConfigured = () => {
  try {
    const vercelPath = path.resolve(process.cwd(), "vercel.json");
    if (!fs.existsSync(vercelPath)) return false;
    const raw = JSON.parse(fs.readFileSync(vercelPath, "utf8")) as { crons?: Array<{ path?: unknown }> };
    return Array.isArray(raw.crons) && raw.crons.some((cron) => cron.path === "/api/email/queue/drain");
  } catch {
    return false;
  }
};

const buildRuntimeEvidence = (): MonitoringEvidence["runtime"] => {
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const loadAverage = os.loadavg();
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();

  return {
    node: {
      version: process.version,
      env: env.NODE_ENV,
      uptimeSeconds: process.uptime(),
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      cpuUserMicros: cpu.user,
      cpuSystemMicros: cpu.system,
    },
    host: {
      cpuCount: os.cpus().length,
      loadAverage1m: numberValue(loadAverage[0]),
      loadAverage5m: numberValue(loadAverage[1]),
      loadAverage15m: numberValue(loadAverage[2]),
      totalMemoryBytes,
      freeMemoryBytes,
      memoryUsedRatio: totalMemoryBytes > 0 ? (totalMemoryBytes - freeMemoryBytes) / totalMemoryBytes : null,
    },
    container: {
      vercel: process.env.VERCEL === "1" || process.env.VERCEL === "true",
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || null,
      deploymentUrl: process.env.VERCEL_URL || null,
    },
  };
};

const deriveDatabaseEvidence = (healthRaw: unknown): MonitoringEvidence["database"] | undefined => {
  const database = getRecord(healthRaw, "database");
  if (!database) return undefined;

  return {
    ready: booleanValue(database.ready),
    source: stringValue(database.source),
    driver: stringValue(database.driver),
    error: database.error ?? null,
    raw: database,
  };
};

const deriveEmailEvidence = (healthRaw: unknown): MonitoringEvidence["email"] | undefined => {
  const email = getRecord(healthRaw, "email");
  if (!email) return undefined;

  return {
    ready: booleanValue(email.ready),
    activeProviders: Array.isArray(email.activeProviders)
      ? email.activeProviders.filter((provider): provider is string => typeof provider === "string")
      : undefined,
    queueWorker: getRecord(email, "queueWorker"),
    diagnostics: {
      dryRunEnabled: email.dryRunEnabled,
      providerConfigured: email.providerConfigured,
      activation: email.activation,
      fromConfigured: email.fromConfigured,
      linkBaseUrlConfigured: email.linkBaseUrlConfigured,
    },
    raw: email,
  };
};

export const buildLocalEvidence = async (
  input: MonitoringEvidenceInput,
): Promise<MonitoringEvidence> => {
  const collectedAt = new Date().toISOString();

  const jsonlPath = input.securityAuditJsonlPath ?? guessSecurityAuditJsonlPath();

  let securityAudit: MonitoringEvidence["securityAudit"] | undefined = undefined;
  if (jsonlPath && fs.existsSync(jsonlPath)) {
    const recentEvents = await readRecentSecurityAuditEvents(jsonlPath, 75);
    securityAudit = { jsonlPath, recentEvents };
  }

  const metrics = input.metrics
    ? {
        ...input.metrics,
        parsed: input.metrics.parsed ?? (input.metrics.promText ? parseHttpMetricsSummary(input.metrics.promText) : undefined),
      }
    : undefined;

  const derivedDatabase = input.database ?? deriveDatabaseEvidence(input.health?.raw);
  const derivedEmail = input.email ?? deriveEmailEvidence(input.health?.raw);
  const configSnapshot = {
    nodeEnv: env.NODE_ENV,
    metricsSecretConfigured: Boolean(env.METRICS_SECRET),
    sentryConfigured: Boolean(env.SENTRY_DSN),
    recaptchaConfigured: Boolean(env.RECAPTCHA_SECRET_KEY),
    emailQueueCronConfigured: readVercelCronConfigured(),
    vercel: process.env.VERCEL === "1" || process.env.VERCEL === "true",
    cronSecretConfigured: Boolean(env.CRON_SECRET),
    emailWebhookSigningConfigured: Boolean(env.EMAIL_WEBHOOK_SIGNING_SECRET),
    ...(input.configSnapshot ?? {}),
  };

  return {
    collectedAt,
    health: input.health ?? { ok: false },
    metrics,
    securityAudit,
    runtime: buildRuntimeEvidence(),
    database: derivedDatabase,
    email: derivedEmail,
    communication: input.communication,
    frontend: input.frontend,
    productAnalytics: input.productAnalytics,
    configSnapshot,
  };
};
