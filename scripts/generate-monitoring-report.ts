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

const main = async () => {
  const outputDirArg = parseArg("--out") || "data/monitoring-reports";
  const outDir = path.isAbsolute(outputDirArg)
    ? outputDirArg
    : path.resolve(process.cwd(), outputDirArg);

  fs.mkdirSync(outDir, { recursive: true });

  // This generator currently focuses on local evidence:
  // - security audit JSONL (if present)
  // - (optionally) config snapshot from env
  // If you want HTTP collection from /api/health and /api/metrics, extend later.

  const report = await generateMonitoringReport({
    outputDir: outDir,
    evidence: {
      securityAuditJsonlPath: env.SECURITY_AUDIT_JSONL_PATH ?? null,
    },
  });

  // Print a short summary for CLI use
  console.log("Monitoring report generated:");
  console.log(`- reportId: ${report.reportId}`);
  console.log(`- systemHealthScore: ${report.systemHealthScore}/100`);
  console.log(`- json: ${report.artifacts.jsonPath}`);
  console.log(`- md: ${report.artifacts.mdPath}`);
};
