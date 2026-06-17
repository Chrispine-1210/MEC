import fs from "fs";
import path from "path";

import { type MonitoringEvidence } from "./types";
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

export const buildLocalEvidence = async (
  input: {
    securityAuditJsonlPath?: string | null;
    health?: { ok: boolean; raw?: unknown };
    metrics?: { promText?: string; raw?: unknown };
    configSnapshot?: Record<string, unknown>;
  },
): Promise<MonitoringEvidence> => {
  const collectedAt = new Date().toISOString();

  const jsonlPath = input.securityAuditJsonlPath ?? guessSecurityAuditJsonlPath();

  let securityAudit: MonitoringEvidence["securityAudit"] | undefined = undefined;
  if (jsonlPath && fs.existsSync(jsonlPath)) {
    const recentEvents = await readRecentSecurityAuditEvents(jsonlPath, 75);
    securityAudit = { jsonlPath, recentEvents };
  }

  return {
    collectedAt,
    health: input.health ?? { ok: false },
    metrics: input.metrics,
    securityAudit,
    configSnapshot: input.configSnapshot ?? {
      nodeEnv: env.NODE_ENV,
      metricsSecretConfigured: Boolean(env.METRICS_SECRET),
      sentryConfigured: Boolean(env.SENTRY_DSN),
      recaptchaConfigured: Boolean(env.RECAPTCHA_SECRET_KEY),
    },
  };
};
