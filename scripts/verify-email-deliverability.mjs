import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next) return null;
  return next;
};

const parseCsvArg = (name) => {
  const v = parseArg(name);
  if (!v) return [];
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ensureDir = (p) => {
  fs.mkdirSync(p, { recursive: true });
};

const writeText = (p, content) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
};

const writeJson = (p, obj) => writeText(p, JSON.stringify(obj, null, 2));

const formatMs = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return `${h}h`;
};

const main = async () => {
const {
    EMAIL_MODULE_PATH = "./server/index.ts",
  } = process.env;




  const outDirArg = parseArg("--out") || "data";
  const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.resolve(process.cwd(), outDirArg);

  const to = parseCsvArg("--to");
  const category = parseArg("--category") || "account_verification";
  const maxWaitMs = toInt(parseArg("--max-wait-ms"), 10 * 60 * 1000);
  const pollMs = toInt(parseArg("--poll-ms"), 10_000);
  const drainMode = parseArg("--drain-mode") || "http"; // http | direct
  const useQueueDrainEndpoint = drainMode === "http";

  if (!to.length) {
    console.error("Missing required --to recipient(s). Example: --to peterschrispine@gmail.com");
    process.exit(1);
  }

  const startedAt = Date.now();
  const runId = `deliverability-${Date.now()}-${randomUUID().slice(0, 8)}`;

  // Import from TS directly using tsx/Node ESM.
  // Always convert absolute filesystem paths to proper file:// URLs on Windows.
  const resolved = path.isAbsolute(EMAIL_MODULE_PATH)
    ? EMAIL_MODULE_PATH
    : path.resolve(process.cwd(), EMAIL_MODULE_PATH);
  const emailMod = await import(`file://${resolved.replace(/\\/g, "/")}`);






  const {
    enqueueEmail,
    getEmailDeliveryDiagnostics,
    getTransactionalEmailActivationReadiness,
    getEmailProductionReadinessReport,
  } = emailMod;

  // Some environments may not surface TS re-exports depending on module entry.
  // If enqueueEmail is missing, re-import the email module directly.
  if (typeof enqueueEmail !== "function" || typeof getEmailDeliveryDiagnostics !== "function") {
    const directEmailMod = await import(path.resolve(process.cwd(), "server/email.ts"));
    if (typeof enqueueEmail !== "function" && typeof directEmailMod.enqueueEmail === "function") {
      // eslint-disable-next-line no-param-reassign
      emailMod.enqueueEmail = directEmailMod.enqueueEmail;
    }
  }



  // NOTE: This script runs in Node (not TS). Ensure the server TS module loader is available.
  // In this repo, the correct way is to run this script via `node --import tsx` or similar.
  // If you see MODULE_NOT_FOUND for `server/env`, re-run using the updated package script below.


  const maybeQueueDrain = async () => {
    // Attempt to drain via HTTP endpoint if the app server is running.
    if (!useQueueDrainEndpoint) return null;

    const baseUrl = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || "";
    const health = parseArg("--health-url");
  const drainUrl = parseArg("--drain-url") || (process.env.EMAIL_DRAIN_URL || `${baseUrl}/api/email/queue/drain`);

    if (!drainUrl || drainUrl.includes("/api/email/queue/drain") === false) {
      return { skipped: true, reason: "drain endpoint not configured", drainUrl };
    }

    try {
      const res = await fetch(drainUrl, {
        method: "POST",
        headers: {
          ...(process.env.CRON_SECRET ? { Authorization: process.env.CRON_SECRET.startsWith("Bearer ") ? process.env.CRON_SECRET : `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body: json };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  };

  const report = {
    runId,
    startedAt: new Date().toISOString(),
    params: { to, category, maxWaitMs, pollMs, drainMode },
    authenticationChecks: null,
    smtpChecks: null,
    providerActivation: null,
    emailJobs: [],
    deliveryEvents: {
      delivered: [],
      deferred: [],
      bounced: [],
      spamComplaint: [],
      failed: [],
      other: [],
    },
    gate: {
      providerDeliveredConfirmed: false,
      mailboxInboxConfirmed: "not_automated_in_repo",
      pass: false,
      failReasons: [],
      elapsedMs: 0,
    },
    remainingIssues: [],
  };

  // 1) Authentication + SMTP + provider readiness diagnostics
  const diagnostics = getEmailDeliveryDiagnostics();
  report.authenticationChecks = {
    domain: diagnostics.domain,
    dryRunEnabled: diagnostics.dryRunEnabled,
    providerCircuitBreakers: diagnostics.providerCircuitBreakers,
    deliverabilityReadyInDiagnostics: diagnostics.ready,
    summary: diagnostics,
  };

  report.smtpChecks = diagnostics.smtp;

  const activation = await getTransactionalEmailActivationReadiness({ cacheTtlMs: 0, timeoutMs: 2_000 });
  report.providerActivation = {
    ready: activation.ready,
    providerReady: activation.providerReady,
    dnsReady: activation.dnsReady,
    blockingReasons: activation.blockingReasons,
    checkedAt: activation.checkedAt,
  };

  const productionReadiness = await getEmailProductionReadinessReport(7).catch(() => null);
  report.productionReadiness = productionReadiness;

  if (!activation.ready) {
    report.gate.failReasons.push("Transactional email activation readiness failed.");
    report.gate.elapsedMs = Date.now() - startedAt;
    const outJson = path.join(outDir, `deliverability-report-${Date.now()}.json`);
    writeJson(outJson, report);
    console.error("Activation readiness failed. Deliverability verification aborted.");
    process.exit(1);
  }

  // 2) Enqueue test messages
  const template = {
    subject: `Mtendere deliverability test (${runId})`,
    html: `<!doctype html><html><body><p>Hello,</p><p>This is a deliverability verification test for run <strong>${runId}</strong>.</p><p>If you received it, please mark it as inbox.</p></body></html>`,
    text: `Hello. This is a deliverability verification test for run ${runId}.`,
  };

  for (const recipient of to) {
    const enq = await enqueueEmail(
      {
        to: recipient,
        subject: template.subject,
        html: template.html,
        text: template.text,
        category,
        metadata: { deliverability_test_run_id: runId, deliverability_test: true },
      },
      { awaitDelivery: false },
    );

    report.emailJobs.push({ recipient, jobId: enq.id, enqueueResult: enq });
  }

  // Drain queue so jobs are sent
  const drainResult = await maybeQueueDrain();
  report.queueDrain = drainResult;

  // Poll until delivery webhooks mark events.
  // We don't have direct DB reads in this script; rely on provider delivery events via email module stats endpoint.
  // We'll use /api/admin/email/stats if server is up; otherwise we fall back to local email-events.jsonl.

  const tryLoadEmailEventsFromJsonl = () => {
    const dataDir = path.resolve(process.cwd(), "data");
    const eventsPath = path.join(dataDir, "email-events.jsonl");
    if (!fs.existsSync(eventsPath)) return [];
    const lines = fs.readFileSync(eventsPath, "utf8").split(/\r?\n/).filter(Boolean);
    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  };

  const correlation = { category, runId };

  const endAt = Date.now() + maxWaitMs;
  let lastEvidence = null;

  while (Date.now() < endAt) {
    // Best-effort evidence collection
    const eventsJsonl = tryLoadEmailEventsFromJsonl();

    // Filter to our jobs by runId in metadata OR by headers/test subject markers.
    const relevant = eventsJsonl.filter((e) => {
      // email.ts records many event types; we treat delivered/spam/bounce/failed as provider webhook events
      const type = String(e.eventType || "");
      const hasDeliverabilityMarker = e.metadata && (e.metadata.deliverability_test_run_id === runId);
      const hasJobCorrelation = e.jobId && report.emailJobs.some((j) => j.jobId === e.jobId);
      const hasRecipientCorrelation = e.recipient && to.some((r) => String(r).toLowerCase() === String(e.recipient).toLowerCase());
      return Boolean(type) && (hasDeliverabilityMarker || hasJobCorrelation || hasRecipientCorrelation);
    });

    const byType = relevant.reduce((acc, e) => {
      const t = String(e.eventType || "");
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    lastEvidence = { count: relevant.length, byType, snapshotAt: new Date().toISOString() };

    // Determine delivery states from recorded eventType
    const eventTypes = new Set(relevant.map((e) => String(e.eventType || "")));

    const hasDelivered = Array.from(eventTypes).some((t) => t === "delivered" || t === "provider_delivered");
    const hasBounced = eventTypes.has("bounced") || Array.from(eventTypes).some((t) => t.includes("bounced"));
    const hasSpam = eventTypes.has("spam_complaint") || Array.from(eventTypes).some((t) => t.includes("spam"));
    const hasFailed = eventTypes.has("failed") || eventTypes.has("provider_failed") || Array.from(eventTypes).some((t) => t.includes("failed"));

    // If we have any terminal failure/bounce/spam, fail early but still record evidence.
    if (hasBounced || hasSpam || hasFailed) {
      report.deliveryEvents.bounced = relevant.filter((e) => String(e.eventType || "").includes("bounced"));
      report.deliveryEvents.spamComplaint = relevant.filter((e) => String(e.eventType || "").includes("spam"));
      report.deliveryEvents.failed = relevant.filter((e) => {
        const t = String(e.eventType || "");
        return t === "failed" || t === "provider_failed";
      });
      report.deliveryEvents.other = relevant.slice(0, 200);
      report.gate.failReasons.push("Delivery did not reach delivered state (bounced/spam/failed evidence observed). Evidence captured from email events log.");
      break;
    }

    if (hasDelivered) {
      report.gate.providerDeliveredConfirmed = true;
      break;
    }

    await sleep(pollMs);
  }

  report.deliveryEvidence = lastEvidence;
  report.gate.elapsedMs = Date.now() - startedAt;

  if (report.gate.providerDeliveredConfirmed) {
    // mailbox checks are not automated in repo; mark pending
    report.gate.mailboxInboxConfirmed = "pending_manual_inbox_check";
    report.gate.pass = true;
  } else {
    report.gate.pass = false;
    report.gate.failReasons.push("Timed out waiting for provider-delivered evidence.");
    report.remainingIssues.push("No delivered webhook/provider event detected during the verification window.");
  }

  // Generate artifacts
  const ts = Date.now();
  const outJson = path.join(outDir, `deliverability-report-${ts}.json`);
  const outMd = path.join(outDir, `deliverability-report-${ts}.md`);

  writeJson(outJson, report);

  const md = `# Deliverability Verification Report

- **Run ID:** ${runId}
- **Started:** ${report.startedAt}
- **Elapsed:** ${formatMs(report.gate.elapsedMs)}

## Gate Outcome
- **Provider delivered confirmed:** ${report.gate.providerDeliveredConfirmed}
- **Mailbox inbox confirmed:** ${report.gate.mailboxInboxConfirmed}
- **PASS:** ${report.gate.pass}
- **Fail reasons:** ${report.gate.failReasons.length ? report.gate.failReasons.map((x) => `\n  - ${x}`).join('') : 'None'}

## Authentication & Readiness
- **Diagnostics ready (DNS):** ${report.authenticationChecks?.deliverabilityReadyInDiagnostics}
- **Provider activation:** ${JSON.stringify(report.providerActivation?.ready)}
- **Blocking reasons:**
${report.providerActivation?.blockingReasons?.length ? report.providerActivation.blockingReasons.map((r) => `\n  - **${r.code}**: ${r.message}`).join('') : '\n  - None'}

## SMTP Checks
- ${JSON.stringify(report.smtpChecks, null, 2)}

## Test Emails
${report.emailJobs.map((j) => `- Recipient: **${j.recipient}**\n  - Job ID: ${j.jobId}\n  - Enqueue status: ${j.enqueueResult?.status}\n`).join('')}

## Evidence
- Last evidence snapshot: ${JSON.stringify(report.deliveryEvidence, null, 2)}

## Remaining issues & recommendations
${report.remainingIssues.length ? report.remainingIssues.map((x) => `- ${x}`).join('\n') : "- None"}
`;

  writeText(outMd, md);

  console.log(JSON.stringify({ ok: report.gate.pass, reportJson: outJson, reportMd: outMd, runId }, null, 2));

  process.exit(report.gate.pass ? 0 : 2);
};

main().catch((e) => {
  console.error("Deliverability verification failed:", e);
  process.exit(1);
});

