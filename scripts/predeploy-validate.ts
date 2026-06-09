process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://predeploy:predeploy@127.0.0.1:5432/predeploy";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const { getEmailDeliveryDiagnostics, getTransactionalEmailActivationReadiness } = await import("../server/email");
const { env } = await import("../server/env");

const strictMode = process.env.PREDEPLOY_STRICT === "true" || env.NODE_ENV === "production";
const allowDryRun = process.env.PREDEPLOY_ALLOW_DRY_RUN === "true";
const requireHybridEmail =
  process.env.PREDEPLOY_REQUIRE_HYBRID_EMAIL === "true" || env.NODE_ENV === "production";

const fail = (message: string, details?: unknown) => {
  console.error(`[predeploy] ${message}`);
  if (details) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exitCode = 1;
};

const diagnostics = getEmailDeliveryDiagnostics();
const activation = await getTransactionalEmailActivationReadiness({ cacheTtlMs: 0, timeoutMs: 2_000 });
const activeProviders = diagnostics.activeProviders.filter((provider) => provider !== "dry_run");

if (strictMode && diagnostics.dryRunEnabled && !allowDryRun) {
  fail("EMAIL_DRY_RUN is enabled. Live deployment requires real transactional delivery.");
}

if (strictMode && !activation.ready) {
  fail("Transactional email activation is not ready.", activation.blockingReasons);
}

if (requireHybridEmail) {
  const missing = ["sendgrid", "ses"].filter((provider) => !activeProviders.includes(provider));
  if (missing.length > 0) {
    fail("Hybrid SendGrid + SES delivery is not fully active.", {
      missing,
      activeProviders,
      configuredProviders: diagnostics.providerConfigured,
    });
  }
}

if (strictMode && activeProviders.length === 0) {
  fail("No live transactional email provider is active.");
}

if (process.exitCode) {
  process.exit();
}

console.log("[predeploy] Platform validation passed.");
console.log(
  JSON.stringify(
    {
      strictMode,
      allowDryRun,
      requireHybridEmail,
      activeProviders: diagnostics.activeProviders,
      activation: {
        ready: activation.ready,
        providerReady: activation.providerReady,
        dnsReady: activation.dnsReady,
        blockingReasons: activation.blockingReasons,
      },
    },
    null,
    2,
  ),
);
