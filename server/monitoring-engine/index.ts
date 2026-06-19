
import { buildLocalEvidence, type MonitoringEvidenceInput } from "./evidence";
import { buildReportFromEvidence, writeReportArtifacts } from "./report";
import { type MonitoringReport } from "./types";

export const generateMonitoringReport = async (params: {
  outputDir: string;
  evidence?: MonitoringEvidenceInput;
}): Promise<MonitoringReport & { artifacts: { jsonPath: string; mdPath: string } }> => {
  const evidence = await buildLocalEvidence(params.evidence ?? {});
  const report = await buildReportFromEvidence(evidence);
  const artifacts = await writeReportArtifacts({ report, outputDir: params.outputDir });
  return { ...report, artifacts };
};

