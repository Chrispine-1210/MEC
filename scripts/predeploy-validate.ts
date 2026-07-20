process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://predeploy:predeploy@127.0.0.1:5432/predeploy";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const { getEmailDeliveryDiagnostics, getTransactionalEmailActivationReadiness } = await import("../server/email");
const { getAiActivationReadiness } = await import("../server/ai");
const { getPaymentActivationReadiness } = await import("../server/referral-payments");
const { env } = await import("../server/env");

const strictMode = process.env.PREDEPLOY_STRICT === "true" || env.NODE_ENV === "production";
const allowDryRun = process.env.PREDEPLOY_ALLOW_DRY_RUN === "true";
const legacyHybridEmailRequired = process.env.PREDEPLOY_REQUIRE_HYBRID_EMAIL === "true";
const requiredEmailProviders = (
  process.env.PREDEPLOY_REQUIRED_EMAIL_PROVIDERS ??
  (legacyHybridEmailRequired ? "sendgrid,ses" : env.NODE_ENV === "production" ? "resend" : "")
)
  .split(",")
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);

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
const [paymentActivation, aiActivation] = await Promise.all([
  getPaymentActivationReadiness({ cacheTtlMs: 5_000 }),
  getAiActivationReadiness({ verifyProvider: true, cacheTtlMs: 5_000 }),
]);

if (strictMode && diagnostics.dryRunEnabled && !allowDryRun) {
  fail("EMAIL_DRY_RUN is enabled. Live deployment requires real transactional delivery.");
}

if (strictMode && !activation.ready) {
  fail("Transactional email activation is not ready.", activation.blockingReasons);
}

if (requiredEmailProviders.length > 0) {
  const missing = requiredEmailProviders.filter((provider) => !activeProviders.includes(provider));
  if (missing.length > 0) {
    fail("Required email provider delivery is not fully active.", {
      missing,
      requiredProviders: requiredEmailProviders,
      activeProviders,
      configuredProviders: diagnostics.providerConfigured,
    });
  }
}

if (strictMode && activeProviders.length === 0) {
  fail("No live transactional email provider is active.");
}

if (strictMode && env.PAYMENTS_ENABLED !== false && !paymentActivation.ready) {
  fail("Production payment activation is not ready.", paymentActivation.blockingReasons);
}

if (strictMode && env.AI_CHAT_ENABLED !== false && !aiActivation.ready) {
  fail("Production AI activation is not ready.", aiActivation.blockingReasons);
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
      requiredEmailProviders,
      activeProviders: diagnostics.activeProviders,
      activation: {
        ready: activation.ready,
        providerReady: activation.providerReady,
        dnsReady: activation.dnsReady,
        blockingReasons: activation.blockingReasons,
      },
      payments: {
        enabled: paymentActivation.enabled,
        ready: paymentActivation.ready,
        mode: paymentActivation.mode,
        providerReachable: paymentActivation.providerReachable,
        webhookEndpointVerified: paymentActivation.webhookEndpointVerified,
        blockingReasons: paymentActivation.blockingReasons,
      },
      ai: {
        enabled: aiActivation.enabled,
        ready: aiActivation.ready,
        provider: aiActivation.provider,
        model: aiActivation.model,
        providerReachable: aiActivation.providerReachable,
        blockingReasons: aiActivation.blockingReasons,
      },
    },
    null,
    2,
  ),
);
