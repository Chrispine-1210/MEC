import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export const detectMailboxProvider = (email) => {
  const domain = normalizeEmail(email).split("@")[1] || "";
  if (["gmail.com", "googlemail.com"].includes(domain)) return "gmail";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) return "outlook";
  if (["yahoo.com", "ymail.com", "rocketmail.com"].includes(domain)) return "yahoo";
  return domain ? "custom" : "unknown";
};

const normalizeProvider = (value, recipient) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["gmail", "outlook", "yahoo", "custom"].includes(normalized)) return normalized;
  return detectMailboxProvider(recipient);
};

const confirmationPlacement = (record) => {
  const placement = String(record.placement || record.folder || record.status || "").trim().toLowerCase();
  if (placement) return placement;
  if (record.inbox === true || record.confirmed === true) return "inbox";
  return "";
};

const confirmationMatchesRun = (record, runId) => {
  if (!runId) return true;
  const candidates = [
    record.runId,
    record.run_id,
    record.subject,
    record.messageSubject,
    record.notes,
  ].filter(Boolean).map(String);
  return candidates.some((value) => value.includes(runId));
};

export const normalizeInboxConfirmations = (input) => {
  const raw = Array.isArray(input)
    ? input
    : Array.isArray(input?.confirmations)
      ? input.confirmations
      : input && typeof input === "object"
        ? Object.entries(input).map(([recipient, value]) =>
            value && typeof value === "object" ? { recipient, ...value } : { recipient, placement: value })
        : [];

  return raw
    .map((record) => {
      const recipient = normalizeEmail(record.recipient || record.email || record.to);
      return {
        recipient,
        mailboxProvider: normalizeProvider(record.mailboxProvider || record.provider, recipient),
        placement: confirmationPlacement(record),
        receivedAt: record.receivedAt || record.received_at || null,
        verifiedAt: record.verifiedAt || record.verified_at || new Date().toISOString(),
        verifiedBy: record.verifiedBy || record.verified_by || null,
        runId: record.runId || record.run_id || null,
        subject: record.subject || record.messageSubject || null,
        messageId: record.messageId || record.message_id || null,
        notes: record.notes || null,
        raw: record,
      };
    })
    .filter((record) => record.recipient);
};

export const evaluateInboxPlacementGate = ({
  recipients,
  confirmations,
  runId,
  requireInboxConfirmation = true,
  requireProviderCoverage = true,
  requireConfirmationRunId = true,
  requiredMailboxProviders = ["gmail", "outlook", "yahoo", "custom"],
}) => {
  const normalizedRecipients = recipients.map(normalizeEmail).filter(Boolean);
  const recipientProviders = Object.fromEntries(
    normalizedRecipients.map((recipient) => [recipient, detectMailboxProvider(recipient)]),
  );
  const normalizedConfirmations = normalizeInboxConfirmations(confirmations);
  const validConfirmations = normalizedConfirmations.filter((confirmation) => {
    if (!normalizedRecipients.includes(confirmation.recipient)) return false;
    if (confirmation.placement !== "inbox") return false;
    if (requireConfirmationRunId && !confirmationMatchesRun(confirmation, runId)) return false;
    return true;
  });
  const confirmedRecipients = new Set(validConfirmations.map((confirmation) => confirmation.recipient));
  const confirmedProviders = new Set(validConfirmations.map((confirmation) => confirmation.mailboxProvider));
  const testedProviders = new Set(Object.values(recipientProviders));
  const missingRecipients = normalizedRecipients.filter((recipient) => !confirmedRecipients.has(recipient));
  const missingTestMailboxProviders = requireProviderCoverage
    ? requiredMailboxProviders.filter((provider) => !testedProviders.has(provider))
    : [];
  const missingConfirmedMailboxProviders = requireProviderCoverage
    ? requiredMailboxProviders.filter((provider) => !confirmedProviders.has(provider))
    : [];
  const placementFailures = normalizedConfirmations.filter(
    (confirmation) =>
      normalizedRecipients.includes(confirmation.recipient) &&
      confirmation.placement &&
      confirmation.placement !== "inbox",
  );
  const runIdMismatches = requireConfirmationRunId
    ? normalizedConfirmations.filter(
        (confirmation) =>
          normalizedRecipients.includes(confirmation.recipient) &&
          confirmation.placement === "inbox" &&
          !confirmationMatchesRun(confirmation, runId),
      )
    : [];
  const failReasons = [];

  if (requireInboxConfirmation && missingRecipients.length > 0) {
    failReasons.push(`Missing inbox confirmation for: ${missingRecipients.join(", ")}.`);
  }
  if (missingTestMailboxProviders.length > 0) {
    failReasons.push(`Missing test recipients for mailbox providers: ${missingTestMailboxProviders.join(", ")}.`);
  }
  if (missingConfirmedMailboxProviders.length > 0) {
    failReasons.push(`Missing confirmed inbox placement for mailbox providers: ${missingConfirmedMailboxProviders.join(", ")}.`);
  }
  if (placementFailures.length > 0) {
    failReasons.push("One or more confirmations reported spam, junk, promotions, missing, or another non-inbox placement.");
  }
  if (runIdMismatches.length > 0) {
    failReasons.push("One or more inbox confirmations did not include the current run ID in runId, subject, or notes.");
  }
  if (requireInboxConfirmation && normalizedConfirmations.length === 0) {
    failReasons.push("No manual inbox confirmations were supplied.");
  }

  return {
    required: requireInboxConfirmation,
    requireProviderCoverage,
    requireConfirmationRunId,
    requiredMailboxProviders,
    recipientProviders,
    confirmations: normalizedConfirmations,
    validConfirmations,
    confirmedRecipients: Array.from(confirmedRecipients),
    confirmedMailboxProviders: Array.from(confirmedProviders),
    missingRecipients,
    missingTestMailboxProviders,
    missingConfirmedMailboxProviders,
    placementFailures,
    runIdMismatches,
    pass: !requireInboxConfirmation ? true : failReasons.length === 0,
    failReasons,
  };
};

const parseArg = (name) => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith("--")) return null;
  return next;
};

const parseCsvArg = (name) => {
  const value = parseArg(name);
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseBoolArg = (name, fallback) => {
  const value = parseArg(name);
  if (value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const writeText = (targetPath, content) => {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
};

const writeJson = (targetPath, obj) => writeText(targetPath, JSON.stringify(obj, null, 2));

const formatMs = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
};

const loadJsonFile = (targetPath) => {
  if (!targetPath || !fs.existsSync(targetPath)) return null;
  return JSON.parse(fs.readFileSync(targetPath, "utf8"));
};

const parseInlineConfirmations = (values) =>
  values.flatMap((value) =>
    String(value)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [providerOrRecipient, maybeRecipient, maybePlacement] = entry.split(":").map((part) => part.trim());
        if (providerOrRecipient.includes("@")) {
          return {
            recipient: providerOrRecipient,
            placement: maybeRecipient || "inbox",
          };
        }
        return {
          mailboxProvider: providerOrRecipient,
          recipient: maybeRecipient,
          placement: maybePlacement || "inbox",
        };
      }),
  );

const readInboxConfirmations = (confirmationPath, inlineConfirmations) => {
  const filePayload = loadJsonFile(confirmationPath);
  return [
    ...normalizeInboxConfirmations(filePayload),
    ...normalizeInboxConfirmations(inlineConfirmations),
  ];
};

const tryLoadEmailEventsFromJsonl = () => {
  const eventsPath = path.resolve(process.cwd(), "data", "email-events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  const lines = fs.readFileSync(eventsPath, "utf8").split(/\r?\n/).filter(Boolean);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const collectRelevantEvents = (events, recipients, jobs, runId) => {
  const normalizedRecipients = recipients.map(normalizeEmail);
  return events.filter((event) => {
    const type = String(event.eventType || "");
    const hasDeliverabilityMarker = event.metadata && event.metadata.deliverability_test_run_id === runId;
    const hasJobCorrelation = event.jobId && jobs.some((job) => job.jobId === event.jobId);
    const hasRecipientCorrelation =
      event.recipient && normalizedRecipients.includes(normalizeEmail(event.recipient));
    return Boolean(type) && (hasDeliverabilityMarker || hasJobCorrelation || hasRecipientCorrelation);
  });
};

const maybeWriteEarlyReport = (outDir, report, startedAt) => {
  report.gate.elapsedMs = Date.now() - startedAt;
  const outJson = path.join(outDir, `deliverability-report-${Date.now()}.json`);
  writeJson(outJson, report);
  return outJson;
};

const loadEmailModule = async () => {
  const modulePath = process.env.EMAIL_MODULE_PATH || "./server/index.ts";
  const resolved = path.isAbsolute(modulePath) ? modulePath : path.resolve(process.cwd(), modulePath);
  const emailMod = await import(pathToFileURL(resolved).href);
  const directEmailMod = await import(new URL("../server/email.ts", import.meta.url));

  return {
    enqueueEmail: emailMod.enqueueEmail || directEmailMod.enqueueEmail,
    getEmailDeliveryDiagnostics: emailMod.getEmailDeliveryDiagnostics || directEmailMod.getEmailDeliveryDiagnostics,
    getTransactionalEmailActivationReadiness:
      emailMod.getTransactionalEmailActivationReadiness || directEmailMod.getTransactionalEmailActivationReadiness,
    getEmailProductionReadinessReport:
      emailMod.getEmailProductionReadinessReport || directEmailMod.getEmailProductionReadinessReport,
    processEmailQueue: emailMod.processEmailQueue || directEmailMod.processEmailQueue,
  };
};

export const main = async () => {
  const outDirArg = parseArg("--out") || "data";
  const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.resolve(process.cwd(), outDirArg);
  const to = parseCsvArg("--to");
  const category = parseArg("--category") || "account_verification";
  const maxWaitMs = toInt(parseArg("--max-wait-ms"), 10 * 60 * 1000);
  const pollMs = toInt(parseArg("--poll-ms"), 10_000);
  const inboxWaitMs = toInt(parseArg("--inbox-wait-ms"), maxWaitMs);
  const drainMode = parseArg("--drain-mode") || "http";
  const useQueueDrainEndpoint = drainMode === "http";
  const requireInboxConfirmation = parseBoolArg("--require-inbox-confirmation", true);
  const requireProviderCoverage = parseBoolArg("--require-provider-coverage", true);
  const requireConfirmationRunId = parseBoolArg("--require-confirmation-run-id", true);
  const requiredMailboxProviders = parseCsvArg("--required-mailbox-providers");
  const inboxConfirmationPathArg = parseArg("--inbox-confirmations");
  const inboxConfirmationPath = inboxConfirmationPathArg
    ? path.resolve(process.cwd(), inboxConfirmationPathArg)
    : null;
  const inlineConfirmations = parseInlineConfirmations(parseCsvArg("--confirm-inbox"));

  if (!to.length) {
    console.error("Missing required --to recipient(s). Include Gmail, Outlook, Yahoo, and custom-domain recipients.");
    process.exit(1);
  }

  const startedAt = Date.now();
  const runId = `deliverability-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const {
    enqueueEmail,
    getEmailDeliveryDiagnostics,
    getTransactionalEmailActivationReadiness,
    getEmailProductionReadinessReport,
    processEmailQueue,
  } = await loadEmailModule();

  if (
    typeof enqueueEmail !== "function" ||
    typeof getEmailDeliveryDiagnostics !== "function" ||
    typeof getTransactionalEmailActivationReadiness !== "function"
  ) {
    throw new Error("Email module exports are not available. Run with `node --import tsx scripts/verify-email-deliverability.mjs`.");
  }

  const maybeQueueDrain = async () => {
    if (drainMode === "direct") {
      if (typeof processEmailQueue !== "function") {
        return { ok: false, error: "processEmailQueue export is unavailable" };
      }
      return { ok: true, body: await processEmailQueue() };
    }

    if (!useQueueDrainEndpoint) return { skipped: true, reason: `Unsupported drain mode: ${drainMode}` };

    const baseUrl = process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || "";
    const drainUrl = parseArg("--drain-url") || (process.env.EMAIL_DRAIN_URL || `${baseUrl}/api/email/queue/drain`);
    if (!drainUrl || !drainUrl.includes("/api/email/queue/drain")) {
      return { skipped: true, reason: "drain endpoint not configured", drainUrl };
    }

    try {
      const res = await fetch(drainUrl, {
        method: "POST",
        headers: {
          ...(process.env.CRON_SECRET
            ? { Authorization: process.env.CRON_SECRET.startsWith("Bearer ") ? process.env.CRON_SECRET : `Bearer ${process.env.CRON_SECRET}` }
            : {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body: json };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  };

  const report = {
    runId,
    startedAt: new Date().toISOString(),
    params: {
      to,
      category,
      maxWaitMs,
      pollMs,
      inboxWaitMs,
      drainMode,
      inboxConfirmationPath,
      requireInboxConfirmation,
      requireProviderCoverage,
      requireConfirmationRunId,
      requiredMailboxProviders: requiredMailboxProviders.length
        ? requiredMailboxProviders
        : ["gmail", "outlook", "yahoo", "custom"],
      senderIsPublicRecipientRestricted: null,
      // Guard: prevent a misleading production deliverability report when using known provider test senders.
      senderAppearsToBeProviderTestSender: null,
    },
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
    inboxPlacement: null,
    gate: {
      providerDeliveredConfirmed: false,
      mailboxInboxConfirmed: "pending_manual_inbox_check",
      pass: false,
      failReasons: [],
      elapsedMs: 0,
    },
    remainingIssues: [],
  };

  const diagnostics = getEmailDeliveryDiagnostics();
  report.authenticationChecks = {
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

  const computeSenderAppearsToBeProviderTestSender = (senderAddress) => {
    const sender = normalizeEmail(senderAddress || "");
    // Resend known testing sender.
    if (/^(.+@)?resend\.dev$/i.test(sender.split("@")[1] || "")) return true;
    if (/resend\.dev/i.test(sender)) return true;
    return false;
  };
  report.senderIsPublicRecipientRestricted = activation?.diagnostics?.sender?.publicRecipientRestricted ?? null;
  const configuredFrom = process.env.EMAIL_FROM || activation?.diagnostics?.smtp?.senderDomain || null;
  const senderAppearsToBeProviderTestSender = computeSenderAppearsToBeProviderTestSender(configuredFrom);
  report.params.senderAppearsToBeProviderTestSender = senderAppearsToBeProviderTestSender;

  if (report.senderIsPublicRecipientRestricted) {
    report.gate.failReasons.push(
      "EMAIL_FROM is restricted to verified Mtendere sender domains (resend_test_sender_restricted/publicRecipientRestricted). Inbox placements may be misleading unless a verified sender domain is configured.",
    );
  }

  if (senderAppearsToBeProviderTestSender) {
    report.gate.failReasons.push(
      "Configured sender appears to be a provider testing sender (e.g., resend.dev). Refusing to generate a misleading production deliverability PASS without real verified sender domain usage.",
    );
  }
  report.productionReadiness = typeof getEmailProductionReadinessReport === "function"
    ? await getEmailProductionReadinessReport(7).catch(() => null)
    : null;

  if (!activation.ready) {
    report.gate.failReasons.push("Transactional email activation readiness failed.");
    const outJson = maybeWriteEarlyReport(outDir, report, startedAt);
    console.error(`Activation readiness failed. Deliverability verification aborted. Report: ${outJson}`);
    process.exit(1);
  }

  const template = {
    subject: `Mtendere deliverability test (${runId})`,
    html: `<!doctype html><html><body><p>Hello,</p><p>This is a deliverability verification test for run <strong>${runId}</strong>.</p><p>If you received it, confirm inbox placement in the verification report.</p></body></html>`,
    text: `Hello. This is a deliverability verification test for run ${runId}. Confirm inbox placement in the verification report.`,
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
    report.emailJobs.push({ recipient, mailboxProvider: detectMailboxProvider(recipient), jobId: enq.id, enqueueResult: enq });
  }

  report.queueDrain = await maybeQueueDrain();

  const providerEvidenceEndAt = Date.now() + maxWaitMs;
  let lastEvidence = null;

  while (Date.now() < providerEvidenceEndAt) {
    const relevant = collectRelevantEvents(tryLoadEmailEventsFromJsonl(), to, report.emailJobs, runId);
    const byType = relevant.reduce((acc, event) => {
      const type = String(event.eventType || "");
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    lastEvidence = { count: relevant.length, byType, snapshotAt: new Date().toISOString() };
    const eventTypes = new Set(relevant.map((event) => String(event.eventType || "")));
    const hasDelivered = Array.from(eventTypes).some((type) => type === "delivered" || type === "provider_delivered");
    const hasBounced = eventTypes.has("bounced") || Array.from(eventTypes).some((type) => type.includes("bounced"));
    const hasSpam = eventTypes.has("spam_complaint") || Array.from(eventTypes).some((type) => type.includes("spam"));
    const hasFailed = eventTypes.has("failed") || Array.from(eventTypes).some((type) => type.includes("failed"));

    if (hasBounced || hasSpam || hasFailed) {
      report.deliveryEvents.bounced = relevant.filter((event) => String(event.eventType || "").includes("bounced"));
      report.deliveryEvents.spamComplaint = relevant.filter((event) => String(event.eventType || "").includes("spam"));
      report.deliveryEvents.failed = relevant.filter((event) => String(event.eventType || "").includes("failed"));
      report.deliveryEvents.other = relevant.slice(0, 200);
      report.gate.failReasons.push("Delivery did not reach delivered state because bounced, spam, or failed evidence was observed.");
      break;
    }

    if (hasDelivered) {
      report.gate.providerDeliveredConfirmed = true;
      report.deliveryEvents.delivered = relevant.filter((event) => ["delivered", "provider_delivered"].includes(String(event.eventType || "")));
      break;
    }

    await sleep(pollMs);
  }

  report.deliveryEvidence = lastEvidence;

  if (!report.gate.providerDeliveredConfirmed) {
    report.gate.failReasons.push("Timed out waiting for provider-delivered evidence.");
    report.remainingIssues.push("No delivered webhook/provider event detected during the verification window.");
  }

  const inboxEndAt = Date.now() + Math.max(0, inboxWaitMs);
  const evaluateInbox = () => evaluateInboxPlacementGate({
    recipients: to,
    confirmations: readInboxConfirmations(inboxConfirmationPath, inlineConfirmations),
    runId,
    requireInboxConfirmation,
    requireProviderCoverage,
    requireConfirmationRunId,
    requiredMailboxProviders: requiredMailboxProviders.length
      ? requiredMailboxProviders
      : ["gmail", "outlook", "yahoo", "custom"],
  });

  report.inboxPlacement = evaluateInbox();
  while (requireInboxConfirmation && !report.inboxPlacement.pass && Date.now() < inboxEndAt) {
    await sleep(pollMs);
    report.inboxPlacement = evaluateInbox();
  }

  if (report.inboxPlacement.pass) {
    report.gate.mailboxInboxConfirmed = requireInboxConfirmation ? "confirmed" : "not_required";
  } else {
    // When failing, include inbox gate details for clarity in the report.
    report.gate.mailboxInboxConfirmed = "not_confirmed";
    report.gate.failReasons.push(...report.inboxPlacement.failReasons);
    report.remainingIssues.push("Real inbox placement was not confirmed for every required recipient/provider.");
  }


  report.gate.elapsedMs = Date.now() - startedAt;
  // Tighten pass criteria: in production readiness we require both provider-delivered evidence
  // and confirmed inbox placement (inbox) for every required recipient/provider.
  // If inbox confirmations are missing or not 'inbox', the gate must fail.
  report.gate.pass = Boolean(report.gate.providerDeliveredConfirmed && report.inboxPlacement.pass && !senderAppearsToBeProviderTestSender);



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
- **Fail reasons:** ${report.gate.failReasons.length ? report.gate.failReasons.map((reason) => `\n  - ${reason}`).join("") : "None"}

## Authentication & Readiness
- **Diagnostics ready:** ${report.authenticationChecks?.deliverabilityReadyInDiagnostics}
- **Provider activation:** ${JSON.stringify(report.providerActivation?.ready)}
- **Blocking reasons:**${report.providerActivation?.blockingReasons?.length ? report.providerActivation.blockingReasons.map((reason) => `\n  - **${reason.code}**: ${reason.message}`).join("") : "\n  - None"}

## SMTP Checks
\`\`\`json
${JSON.stringify(report.smtpChecks, null, 2)}
\`\`\`

## Test Emails
${report.emailJobs.map((job) => `- Recipient: **${job.recipient}** (${job.mailboxProvider})\n  - Job ID: ${job.jobId}\n  - Enqueue status: ${job.enqueueResult?.status}\n`).join("")}

## Inbox Placement
- **Required:** ${report.inboxPlacement.required}
- **Confirmed recipients:** ${report.inboxPlacement.confirmedRecipients.join(", ") || "None"}
- **Missing recipients:** ${report.inboxPlacement.missingRecipients.join(", ") || "None"}
- **Missing provider tests:** ${report.inboxPlacement.missingTestMailboxProviders.join(", ") || "None"}
- **Missing provider confirmations:** ${report.inboxPlacement.missingConfirmedMailboxProviders.join(", ") || "None"}

## Evidence
\`\`\`json
${JSON.stringify(report.deliveryEvidence, null, 2)}
\`\`\`

## Remaining Issues And Recommendations
${report.remainingIssues.length ? report.remainingIssues.map((issue) => `- ${issue}`).join("\n") : "- None"}
`;

  writeText(outMd, md);
  console.log(JSON.stringify({ ok: report.gate.pass, reportJson: outJson, reportMd: outMd, runId }, null, 2));
  process.exit(report.gate.pass ? 0 : 2);
};

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] || "")).href) {
  main().catch((error) => {
    console.error("Deliverability verification failed:", error);
    process.exit(1);
  });
}
