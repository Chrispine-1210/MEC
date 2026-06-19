import path from "path";
import fs from "fs";

import { generateMonitoringReport } from "../server/monitoring-engine/index.ts";
import { env } from "../server/env";

const parseArg = (name: string) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next) return null;
  return next;
};

const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJsonEvidence = async (url: string) => {
  try {
    const response = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
    const raw = await response.json().catch(() => null);
    return {
      ok: response.ok,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      raw: {
        collectionError: error instanceof Error ? error.message : "Unknown health collection error",
      },
    };
  }
};

const fetchMetricsEvidence = async (url: string, secret?: string | null) => {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: "text/plain",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
    });
    const promText = await response.text();
    return {
      raw: {
        ok: response.ok,
        status: response.status,
      },
      promText: response.ok ? promText : undefined,
    };
  } catch (error) {
    return {
      raw: {
        ok: false,
        collectionError: error instanceof Error ? error.message : "Unknown metrics collection error",
      },
    };
  }
};

const main = async () => {
  const outputDirArg = parseArg("--out") || "data/monitoring-reports";
  const healthUrl = parseArg("--health-url") || process.env.MONITORING_HEALTH_URL || null;
  const metricsUrl = parseArg("--metrics-url") || process.env.MONITORING_METRICS_URL || null;
  const metricsSecret = parseArg("--metrics-secret") || process.env.MONITORING_METRICS_SECRET || env.METRICS_SECRET || null;
  const outDir = path.isAbsolute(outputDirArg)
    ? outputDirArg
    : path.resolve(process.cwd(), outputDirArg);

  fs.mkdirSync(outDir, { recursive: true });

  const [health, metrics] = await Promise.all([
    healthUrl ? fetchJsonEvidence(healthUrl) : Promise.resolve(undefined),
    metricsUrl ? fetchMetricsEvidence(metricsUrl, metricsSecret) : Promise.resolve(undefined),
  ]);

  const report = await generateMonitoringReport({
    outputDir: outDir,
    evidence: {
      securityAuditJsonlPath: process.env.SECURITY_AUDIT_JSONL_PATH ?? null,
      health,
      metrics,
    },
  });

  // Print a short summary for CLI use
  console.log("Monitoring report generated:");
  console.log(`- reportId: ${report.reportId}`);
  console.log(`- systemHealthScore: ${report.systemHealthScore}/100`);
  console.log(`- json: ${report.artifacts.jsonPath}`);
  console.log(`- md: ${report.artifacts.mdPath}`);
};

main().catch((error) => {
  console.error("Monitoring report generation failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
