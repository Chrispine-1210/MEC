import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { afterEach, test } from "node:test";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.VERCEL = "1";
process.env.VERCEL_ENV = "production";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.JWT_SECRET = "email-platform-test-secret-32-chars";
process.env.PUBLIC_APP_URL = "http://public.example.test";
process.env.API_APP_URL = "http://api.example.test";
process.env.EMAIL_FROM = "Mtendere Education Consult <no-reply@example.test>";
process.env.EMAIL_PROVIDER_ORDER = "resend,sendgrid,ses";
process.env.RESEND_API_KEY = "resend-test-key";
process.env.SENDGRID_API_KEY = "SG.sendgrid-test-key";
process.env.AWS_SES_REGION = "us-east-1";
process.env.AWS_SES_ACCESS_KEY_ID = "AKIAEMAILTESTKEY";
process.env.AWS_SES_SECRET_ACCESS_KEY = "ses-test-secret";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_PORT = "";
process.env.EMAIL_PROVIDER_INLINE_RETRIES = "1";
process.env.EMAIL_PROVIDER_CIRCUIT_FAILURE_THRESHOLD = "2";
process.env.EMAIL_PROVIDER_CIRCUIT_COOLDOWN_MS = "60000";
process.env.EMAIL_DRY_RUN = "false";
delete process.env.EMAIL_ALLOW_LIVE_TEST_SENDS;
process.env.EMAIL_QUEUE_WORKER_ENABLED = "false";
process.env.RECAPTCHA_SECRET_KEY = "";
process.env.CRON_SECRET = "cron-test-secret";

type StoragePatch = Record<string, (...args: any[]) => any>;

const storageModulePromise = import("../../server/storage");
const emailModulePromise = import("../../server/email");
const routesModulePromise = import("../../server/routes");

const restoreCallbacks: Array<() => void> = [];
const originalFetch = globalThis.fetch;

const patchStorage = async (patches: StoragePatch) => {
  const { storage } = await storageModulePromise;
  const mutableStorage = storage as unknown as Record<string, (...args: any[]) => any>;

  for (const [key, value] of Object.entries(patches)) {
    const original = mutableStorage[key];
    mutableStorage[key] = value;
    restoreCallbacks.push(() => {
      mutableStorage[key] = original;
    });
  }
};

afterEach(async () => {
  while (restoreCallbacks.length) {
    restoreCallbacks.pop()?.();
  }
  globalThis.fetch = originalFetch;
  const { resetEmailProviderCircuitBreakers } = await emailModulePromise;
  resetEmailProviderCircuitBreakers();
});

const makeEmailJob = (overrides: Record<string, unknown> = {}) => {
  const now = new Date();
  return {
    id: "email-job-1",
    category: "account_verification",
    recipient: "student@example.test",
    subject: "Verify your Mtendere account",
    payload: {
      from: process.env.EMAIL_FROM,
      to: "student@example.test",
      subject: "Verify your Mtendere account",
      html: '<!doctype html><html><body><a href="https://example.test/verify">Verify account</a></body></html>',
      text: "Verify your account: https://example.test/verify",
      category: "account_verification",
      metadata: { flow: "account_verification" },
      headers: {},
    },
    metadata: { flow: "account_verification" },
    status: "queued",
    priority: 100,
    attempts: 0,
    maxAttempts: 5,
    provider: null,
    providerMessageId: null,
    scheduledFor: new Date(now.getTime() - 1000),
    processingAt: null,
    sentAt: null,
    failedAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as any;
};

test("Vercel production runtime uses configured live email providers", async () => {
  const { getEmailDeliveryDiagnostics } = await emailModulePromise;

  const diagnostics = getEmailDeliveryDiagnostics();

  assert.equal(diagnostics.liveProviderDeliveryAllowed, true);
  assert.equal(diagnostics.configuredDryRunEnabled, false);
  assert.equal(diagnostics.dryRunEnabled, false);
  assert.equal(diagnostics.activeProviders[0], "resend");
});

test("Resend testing sender is not production-ready for public recipients", async () => {
  const { getEmailSenderDiagnosticsForAddress } = await emailModulePromise;

  const diagnostics = getEmailSenderDiagnosticsForAddress(
    "Mtendere Education Consult <onboarding@resend.dev>",
    ["resend"],
    true,
  );

  assert.equal(diagnostics.resendTestSender, true);
  assert.equal(diagnostics.publicRecipientRestricted, true);
  assert.equal(
    diagnostics.recommendedFrom,
    "Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>",
  );
});

test("Resend sender domain readiness requires a verified Resend domain", { concurrency: false }, async () => {
  const { getResendSenderDomainReadiness } = await emailModulePromise;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            name: "notifications.mtendereeducationconsult.com",
            status: "pending",
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    )) as typeof fetch;

  const readiness = await getResendSenderDomainReadiness({
    senderAddress: "Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>",
    activeProviders: ["resend"],
  });

  assert.equal(readiness.required, true);
  assert.equal(readiness.expectedDomain, "notifications.mtendereeducationconsult.com");
  assert.equal(readiness.ready, false);
  assert.equal(readiness.error, "resend_domain_not_verified");
});

const installQueueStorage = async (initialJob: any) => {
  const state = { job: initialJob };
  const deliveryEvents: any[] = [];
  const failedUpdates: any[] = [];

  await patchStorage({
    recoverStaleProcessingEmailJobs: async () => 0,
    getDueEmailJobs: async () =>
      ["queued", "retry_scheduled"].includes(state.job.status) ? [state.job] : [],
    markEmailJobProcessing: async () => {
      state.job = {
        ...state.job,
        attempts: state.job.attempts + 1,
        status: "processing",
        processingAt: new Date(),
        updatedAt: new Date(),
      };
      return state.job;
    },
    markEmailJobSent: async (_id: string, provider: string, providerMessageId?: string | null) => {
      state.job = {
        ...state.job,
        status: "sent",
        provider,
        providerMessageId: providerMessageId ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      };
      return state.job;
    },
    markEmailJobFailed: async (_id: string, error: string, scheduledFor?: Date | null, finalFailure?: boolean) => {
      failedUpdates.push({ error, scheduledFor, finalFailure });
      state.job = {
        ...state.job,
        status: finalFailure ? "failed" : "retry_scheduled",
        lastError: error,
        scheduledFor: scheduledFor ?? new Date(),
        failedAt: finalFailure ? new Date() : null,
        updatedAt: new Date(),
      };
      return state.job;
    },
    createEmailDeliveryEvent: async (event: any) => {
      deliveryEvents.push(event);
    },
    getEmailJob: async () => state.job,
    getEmailJobByProviderMessageId: async () => undefined,
  });

  return { state, deliveryEvents, failedUpdates };
};

test("email queue fails over from Resend to SendGrid when the first provider fails", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const queue = await installQueueStorage(makeEmailJob());
  const requestedUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requestedUrls.push(url);

    if (url.includes("api.resend.com")) {
      return new Response("Resend unavailable", { status: 503, statusText: "Service Unavailable" });
    }

    return new Response(null, {
      status: 202,
      headers: { "x-message-id": "sendgrid-message-1" },
    });
  }) as typeof fetch;

  await processEmailQueue();

  assert.equal(queue.state.job.status, "sent");
  assert.equal(queue.state.job.provider, "sendgrid");
  assert.equal(queue.state.job.providerMessageId, "sendgrid-message-1");
  assert.deepEqual(
    requestedUrls.map((url) => (url.includes("resend") ? "resend" : "sendgrid")),
    ["resend", "sendgrid"],
  );
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "provider_failed" && event.provider === "resend"), true);
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "sent" && event.provider === "sendgrid"), true);
});

test("email queue fails over to AWS SES after upstream provider failures", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const queue = await installQueueStorage(makeEmailJob({ id: "ses-failover-job" }));
  const requestedProviders: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.resend.com")) {
      requestedProviders.push("resend");
      return new Response("Resend unavailable", { status: 503, statusText: "Service Unavailable" });
    }

    if (url.includes("api.sendgrid.com")) {
      requestedProviders.push("sendgrid");
      return new Response(JSON.stringify({ errors: [{ message: "SendGrid unavailable" }] }), {
        status: 503,
        statusText: "Service Unavailable",
      });
    }

    if (url.includes("email.us-east-1.amazonaws.com")) {
      requestedProviders.push("ses");
      return new Response(JSON.stringify({ MessageId: "ses-message-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected provider URL ${url}`);
  }) as typeof fetch;

  await processEmailQueue();

  assert.deepEqual(requestedProviders, ["resend", "sendgrid", "ses"]);
  assert.equal(queue.state.job.status, "sent");
  assert.equal(queue.state.job.provider, "ses");
  assert.equal(queue.state.job.providerMessageId, "ses-message-1");
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "provider_failover_triggered" && event.provider === "ses"), true);
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "sent" && event.provider === "ses"), true);
});

test("email queue schedules the first retry one minute after an all-provider failure", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const queue = await installQueueStorage(makeEmailJob());
  const startedAt = Date.now();

  globalThis.fetch = (async () => new Response("provider down", { status: 500 })) as typeof fetch;

  await processEmailQueue();

  assert.equal(queue.state.job.status, "retry_scheduled");
  assert.equal(queue.failedUpdates.length, 1);
  assert.equal(queue.failedUpdates[0].finalFailure, false);

  const retryDelayMs = queue.failedUpdates[0].scheduledFor.getTime() - startedAt;
  assert.ok(retryDelayMs >= 55_000 && retryDelayMs <= 70_000, `expected ~60s retry, got ${retryDelayMs}ms`);
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "retry_scheduled"), true);
});

test("email queue dead-letters permanent provider rejections without retry churn", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const queue = await installQueueStorage(makeEmailJob({ id: "permanent-rejection-job" }));

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        statusCode: 403,
        name: "validation_error",
        message: "You can only send testing emails to your own email address. To send emails to other recipients, please verify a domain.",
      }),
      {
        status: 403,
        statusText: "Forbidden",
        headers: { "content-type": "application/json" },
      },
    )) as typeof fetch;

  await processEmailQueue();

  assert.equal(queue.state.job.status, "failed");
  assert.equal(queue.failedUpdates.length, 1);
  assert.equal(queue.failedUpdates[0].finalFailure, true);
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "failed"), true);
  assert.equal(queue.deliveryEvents.some((event) => event.eventType === "retry_scheduled"), false);
});

test("email queue skips jobs that cannot be claimed for processing", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const deliveryEvents: any[] = [];

  await patchStorage({
    recoverStaleProcessingEmailJobs: async () => 0,
    getDueEmailJobs: async () => [makeEmailJob({ id: "already-claimed-job" })],
    markEmailJobProcessing: async () => undefined,
    createEmailDeliveryEvent: async (event: any) => {
      deliveryEvents.push(event);
    },
  });

  globalThis.fetch = (async () => {
    throw new Error("provider should not be called for an unavailable job");
  }) as typeof fetch;

  const result = await processEmailQueue();

  assert.equal(result.processed, 0);
  assert.equal(result.error, null);
  assert.deepEqual(
    deliveryEvents.map((event) => event.eventType),
    ["processing_skipped"],
  );
});

test("email provider circuit breaker skips a repeatedly failing provider and keeps failover available", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const now = new Date();
  const jobs = [
    makeEmailJob({ id: "circuit-job-1", scheduledFor: new Date(now.getTime() - 1000) }),
    makeEmailJob({ id: "circuit-job-2", scheduledFor: new Date(now.getTime() - 1000) }),
    makeEmailJob({ id: "circuit-job-3", scheduledFor: new Date(now.getTime() - 1000) }),
  ];
  const deliveryEvents: any[] = [];
  const requestedProviders: string[] = [];

  await patchStorage({
    recoverStaleProcessingEmailJobs: async () => 0,
    getDueEmailJobs: async () => jobs.filter((job) => ["queued", "retry_scheduled"].includes(job.status)),
    markEmailJobProcessing: async (id: string) => {
      const job = jobs.find((candidate) => candidate.id === id);
      if (!job || !["queued", "retry_scheduled"].includes(job.status)) return undefined;
      Object.assign(job, {
        attempts: job.attempts + 1,
        status: "processing",
        processingAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobSent: async (id: string, provider: string, providerMessageId?: string | null) => {
      const job = jobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: "sent",
        provider,
        providerMessageId: providerMessageId ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobFailed: async (id: string, error: string, scheduledFor?: Date | null, finalFailure?: boolean) => {
      const job = jobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: finalFailure ? "failed" : "retry_scheduled",
        lastError: error,
        scheduledFor: scheduledFor ?? new Date(),
        failedAt: finalFailure ? new Date() : null,
        updatedAt: new Date(),
      });
      return job;
    },
    createEmailDeliveryEvent: async (event: any) => {
      deliveryEvents.push(event);
    },
    getEmailJob: async (id: string) => jobs.find((job) => job.id === id),
    getEmailJobByProviderMessageId: async () => undefined,
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("api.resend.com")) {
      requestedProviders.push("resend");
      return new Response("Resend unavailable", { status: 503, statusText: "Service Unavailable" });
    }

    if (url.includes("api.sendgrid.com")) {
      requestedProviders.push("sendgrid");
      return new Response(null, {
        status: 202,
        headers: { "x-message-id": `sendgrid-${requestedProviders.length}` },
      });
    }

    throw new Error(`Unexpected provider URL ${url}`);
  }) as typeof fetch;

  const result = await processEmailQueue();

  assert.equal(result.processed, 3);
  assert.deepEqual(requestedProviders, ["resend", "sendgrid", "resend", "sendgrid", "sendgrid"]);
  assert.equal(jobs.every((job) => job.status === "sent" && job.provider === "sendgrid"), true);
  assert.equal(deliveryEvents.some((event) => event.eventType === "provider_circuit_opened" && event.provider === "resend"), true);
  assert.equal(deliveryEvents.some((event) => event.eventType === "provider_circuit_open_skipped" && event.provider === "resend"), true);
});

test("commercial email sends standards headers for Gmail-compatible unsubscribe and traceability", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const queue = await installQueueStorage(
    makeEmailJob({
      id: "newsletter-header-job",
      category: "newsletter",
      recipient: "newsletter@example.test",
      subject: "Mtendere newsletter",
      payload: {
        from: process.env.EMAIL_FROM,
        to: "newsletter@example.test",
        subject: "Mtendere newsletter",
        html: '<!doctype html><html><body><a href="https://example.test/news">News</a></body></html>',
        text: "News: https://example.test/news",
        category: "newsletter",
        metadata: { flow: "newsletter" },
        headers: {
          "X-Custom-Trace": "safe\r\nfolded",
          "Bad\r\nHeader": "blocked",
        },
      },
    }),
  );
  let providerPayload: any = null;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    providerPayload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ id: "resend-newsletter-message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  await processEmailQueue();

  assert.equal(queue.state.job.status, "sent");
  assert.equal(providerPayload?.headers["Message-ID"].startsWith("<newsletter-header-job."), true);
  assert.match(providerPayload?.headers["List-Unsubscribe"], /\/api\/email\/unsubscribe\//);
  assert.equal(providerPayload?.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(providerPayload?.headers["X-MEC-Email-Job"], "newsletter-header-job");
  assert.equal(providerPayload?.headers["Bad\r\nHeader"], undefined);
  assert.equal(providerPayload?.headers["X-Custom-Trace"], "safe folded");
});

test("provider bounce webhooks apply recipient suppression before future sends", { concurrency: false }, async () => {
  const { enqueueEmail, recordProviderWebhookEvent } = await emailModulePromise;
  const preferences = new Map<string, any>();
  const emailJobs: any[] = [];
  const deliveryEvents: any[] = [];

  await patchStorage({
    getEmailJob: async () => undefined,
    getEmailJobByProviderMessageId: async () => undefined,
    getEmailPreferenceByEmail: async (email: string) => preferences.get(email.toLowerCase()),
    getSubscriberByEmail: async () => undefined,
    upsertEmailPreference: async (preference: any) => {
      const existing = preferences.get(preference.email.toLowerCase());
      const saved = {
        id: existing?.id ?? preferences.size + 1,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
        ...preference,
      };
      preferences.set(saved.email.toLowerCase(), saved);
      return saved;
    },
    updateEmailPreference: async (id: number, updatePreference: any) => {
      const existing = Array.from(preferences.values()).find((preference) => preference.id === id);
      if (!existing) throw new Error("Email preference not found");
      const updated = { ...existing, ...updatePreference, updatedAt: new Date() };
      preferences.set(updated.email.toLowerCase(), updated);
      return updated;
    },
    createEmailJob: async (job: any) => {
      emailJobs.push(job);
      return { createdAt: new Date(), updatedAt: new Date(), ...job };
    },
    createEmailDeliveryEvent: async (event: any) => {
      deliveryEvents.push(event);
    },
  });

  await recordProviderWebhookEvent("ses", {
    eventType: "Bounce",
    mail: {
      messageId: "soft-bounce-message-1",
      destination: ["Soft.Student@Example.Test"],
    },
    bounce: {
      bounceType: "Transient",
      bounceSubType: "MailboxFull",
      bouncedRecipients: [{ emailAddress: "Soft.Student@Example.Test" }],
    },
  });
  await recordProviderWebhookEvent("sendgrid", {
    event: "bounce",
    email: "Suppressed.Student@Example.Test",
    sg_message_id: "provider-message-1",
  });
  await recordProviderWebhookEvent("sendgrid", {
    event: "bounce",
    email: "Suppressed.Student@Example.Test",
    sg_message_id: "provider-message-1",
  });

  assert.equal(preferences.has("soft.student@example.test"), false);
  assert.equal(deliveryEvents.some((event) => event.eventType === "deferred" && event.recipient === "Soft.Student@Example.Test"), true);

  const preference = preferences.get("suppressed.student@example.test");
  assert.ok(preference);
  assert.equal(preference.consentStatus, "bounced");
  assert.ok(preference.unsubscribedAt instanceof Date);
  assert.equal(Object.values(preference.categories).every((enabled) => enabled === false), true);
  assert.equal(deliveryEvents.filter((event) => event.eventType === "suppression_applied").length, 1);
  assert.equal(deliveryEvents.some((event) => event.eventType === "provider_webhook_duplicate_ignored"), true);

  const result = await enqueueEmail({
    to: "suppressed.student@example.test",
    subject: "Mtendere newsletter",
    html: "<!doctype html><html><body>News</body></html>",
    text: "News",
    category: "newsletter",
  });

  assert.equal(result.status, "suppressed");
  assert.equal(emailJobs.length, 0);
});

test("provider webhooks normalize SES, Mailgun, Resend, and Postmark payloads", { concurrency: false }, async () => {
  const { recordProviderWebhookEvent } = await emailModulePromise;
  const deliveryEvents: any[] = [];
  const jobs = new Map<string, any>([
    ["ses-job", makeEmailJob({ id: "ses-job", providerMessageId: "ses-message-id", recipient: "ses@example.test" })],
    ["mailgun-job", makeEmailJob({ id: "mailgun-job", providerMessageId: "mailgun-message-id", recipient: "mailgun@example.test" })],
    ["resend-job", makeEmailJob({ id: "resend-job", providerMessageId: "resend-message-id", recipient: "resend@example.test" })],
    ["postmark-job", makeEmailJob({ id: "postmark-job", providerMessageId: "postmark-message-id", recipient: "postmark@example.test" })],
  ]);
  const jobsByProviderMessageId = new Map(
    Array.from(jobs.values()).map((job) => [job.providerMessageId, job]),
  );

  await patchStorage({
    getEmailJob: async (id: string) => jobs.get(id),
    getEmailJobByProviderMessageId: async (providerMessageId: string) =>
      jobsByProviderMessageId.get(providerMessageId),
    createEmailDeliveryEvent: async (event: any) => {
      deliveryEvents.push(event);
    },
  });

  await recordProviderWebhookEvent("ses", {
    Type: "Notification",
    MessageId: "sns-message-1",
    Message: JSON.stringify({
      eventType: "Delivery",
      mail: {
        messageId: "ses-message-id",
        destination: ["ses@example.test"],
        tags: {
          mec_email_job_id: ["ses-job"],
          mec_email_category: ["account_verification"],
        },
      },
      delivery: {
        recipients: ["ses@example.test"],
      },
    }),
  });
  await recordProviderWebhookEvent("mailgun", {
    "event-data": {
      event: "delivered",
      recipient: "mailgun@example.test",
      "user-variables": {
        mec_email_job_id: "mailgun-job",
        mec_email_category: "newsletter",
      },
      message: {
        headers: {
          "message-id": "mailgun-message-id",
        },
      },
    },
  });
  await recordProviderWebhookEvent("resend", {
    type: "email.delivered",
    data: {
      email_id: "resend-message-id",
      to: ["resend@example.test"],
    },
  });
  await recordProviderWebhookEvent("postmark", {
    RecordType: "Delivery",
    MessageID: "postmark-message-id",
    Recipient: "postmark@example.test",
    Metadata: {
      mec_email_job_id: "postmark-job",
    },
  });

  const sentByProvider = new Map(deliveryEvents.map((event) => [event.provider, event]));
  assert.equal(sentByProvider.get("ses")?.eventType, "delivered");
  assert.equal(sentByProvider.get("ses")?.jobId, "ses-job");
  assert.equal(sentByProvider.get("mailgun")?.recipient, "mailgun@example.test");
  assert.equal(sentByProvider.get("mailgun")?.providerMessageId, "mailgun-message-id");
  assert.equal(sentByProvider.get("resend")?.jobId, "resend-job");
  assert.equal(sentByProvider.get("postmark")?.recipient, "postmark@example.test");
});

const passwordFingerprint = (passwordHash: string) =>
  createHmac("sha256", process.env.JWT_SECRET as string).update(passwordHash).digest("hex").slice(0, 40);

const signVerificationToken = (user: { id: number; email: string; role: string; password: string }, jwtId: string) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: "email_verification",
      pwd: passwordFingerprint(user.password),
      jti: jwtId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "24h" },
  );

const startTestServer = async () => {
  const { registerRoutes } = await routesModulePromise;
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = await registerRoutes(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
};

const stopTestServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

const installVerificationStorage = async (input: {
  user: any;
  tokenRecord?: any;
  recentRequestCount?: number;
}) => {
  const state = {
    user: input.user,
    tokenRecord: input.tokenRecord,
    welcomeJobs: [] as any[],
  };

  await patchStorage({
    getUser: async (id: number) => (id === state.user.id ? state.user : undefined),
    getUserByEmail: async (email: string) =>
      email.toLowerCase() === state.user.email.toLowerCase() ? state.user : undefined,
    getEmailVerificationTokenByHash: async (tokenHash: string) =>
      state.tokenRecord?.tokenHash === tokenHash ? state.tokenRecord : undefined,
    countEmailVerificationRequests: async () => input.recentRequestCount ?? 0,
    updateUser: async (id: number, updateUser: Record<string, unknown>) => {
      if (id !== state.user.id) throw new Error("User not found");
      state.user = { ...state.user, ...updateUser, updatedAt: new Date() };
      return state.user;
    },
    revokePendingEmailVerificationTokens: async () => undefined,
    createEmailVerificationToken: async (token: any) => ({ id: 999, createdAt: new Date(), ...token }),
    useEmailVerificationToken: async () => {
      state.tokenRecord = {
        ...state.tokenRecord,
        status: "used",
        usedAt: new Date(),
      };
      return state.tokenRecord;
    },
    logAnalytics: async (analytics: any) => ({ id: Date.now(), timestamp: new Date(), ...analytics }),
    getEmailPreferenceByEmail: async () => undefined,
    upsertEmailPreference: async (preference: any) => ({ id: 1, createdAt: new Date(), updatedAt: new Date(), ...preference }),
    createEmailJob: async (job: any) => {
      state.welcomeJobs.push(job);
      return { createdAt: new Date(), updatedAt: new Date(), ...job };
    },
    recoverStaleProcessingEmailJobs: async () => 0,
    getDueEmailJobs: async () => [],
    createEmailDeliveryEvent: async () => undefined,
  });

  return state;
};

const installPublicRegistrationStorage = async () => {
  const state = {
    nextUserId: 100,
    users: new Map<number, any>(),
    emailJobs: [] as any[],
    emailVerificationTokens: [] as any[],
    deliveryEvents: [] as any[],
    analytics: [] as any[],
    communicationEvents: [] as any[],
    communicationMessages: [] as any[],
    workflowTasks: [] as any[],
    notifications: [] as any[],
  };

  const findUserByEmail = (email: string) =>
    Array.from(state.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase());
  const findUserByUsername = (username: string) =>
    Array.from(state.users.values()).find((user) => user.username.toLowerCase() === username.toLowerCase());

  await patchStorage({
    getUser: async (id: number) => state.users.get(id),
    getUserByEmail: async (email: string) => findUserByEmail(email),
    getUserByUsername: async (username: string) => findUserByUsername(username),
    createUser: async (insertUser: any) => {
      const now = new Date();
      const user = {
        id: state.nextUserId++,
        profilePicture: null,
        phone: null,
        dateOfBirth: null,
        referralCode: null,
        stripeCustomerId: null,
        defaultCurrency: "USD",
        mfaEnabled: false,
        totpSecret: null,
        mfaConfirmedAt: null,
        createdAt: now,
        updatedAt: now,
        ...insertUser,
      };
      state.users.set(user.id, user);
      return user;
    },
    updateUser: async (id: number, updateUser: Record<string, unknown>) => {
      const existing = state.users.get(id);
      if (!existing) throw new Error("User not found");
      const updated = { ...existing, ...updateUser, updatedAt: new Date() };
      state.users.set(id, updated);
      return updated;
    },
    countEmailVerificationRequests: async () => 0,
    revokePendingEmailVerificationTokens: async () => undefined,
    createEmailVerificationToken: async (token: any) => {
      const saved = { id: state.emailVerificationTokens.length + 1, createdAt: new Date(), ...token };
      state.emailVerificationTokens.push(saved);
      return saved;
    },
    getEmailPreferenceByEmail: async () => undefined,
    upsertEmailPreference: async (preference: any) => ({
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...preference,
    }),
    cancelPendingEmailJobs: async () => 0,
    createEmailJob: async (job: any) => {
      const saved = { createdAt: new Date(), updatedAt: new Date(), ...job };
      state.emailJobs.push(saved);
      return saved;
    },
    recoverStaleProcessingEmailJobs: async () => 0,
    getDueEmailJobs: async () =>
      state.emailJobs.filter((job) => ["queued", "retry_scheduled"].includes(job.status)),
    markEmailJobProcessing: async (id: string) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job || !["queued", "retry_scheduled"].includes(job.status)) return undefined;
      Object.assign(job, {
        attempts: job.attempts + 1,
        status: "processing",
        processingAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobSent: async (id: string, provider: string, providerMessageId?: string | null) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: "sent",
        provider,
        providerMessageId: providerMessageId ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobFailed: async (id: string, error: string, scheduledFor?: Date | null, finalFailure?: boolean) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: finalFailure ? "failed" : "retry_scheduled",
        lastError: error,
        scheduledFor: scheduledFor ?? new Date(),
        failedAt: finalFailure ? new Date() : null,
        updatedAt: new Date(),
      });
      return job;
    },
    getEmailJob: async (id: string) => state.emailJobs.find((job) => job.id === id),
    createEmailDeliveryEvent: async (event: any) => {
      state.deliveryEvents.push(event);
    },
    logAnalytics: async (analytics: any) => {
      const saved = { id: state.analytics.length + 1, timestamp: new Date(), ...analytics };
      state.analytics.push(saved);
      return saved;
    },
    createCommunicationEvent: async (event: any) => {
      state.communicationEvents.push(event);
      return { createdAt: new Date(), updatedAt: new Date(), ...event };
    },
    updateCommunicationEventStatus: async (id: string, status: string, details: Record<string, unknown> = {}) => {
      const existing = state.communicationEvents.find((event) => event.id === id);
      if (existing) Object.assign(existing, { status, ...details });
      return existing;
    },
    createCommunicationMessage: async (message: any) => {
      state.communicationMessages.push(message);
      return { createdAt: new Date(), updatedAt: new Date(), ...message };
    },
    createCommunicationWorkflowTask: async (task: any) => {
      state.workflowTasks.push(task);
      return { createdAt: new Date(), updatedAt: new Date(), ...task };
    },
    createNotification: async (notification: any) => {
      const saved = { id: state.notifications.length + 1, createdAt: new Date(), ...notification };
      state.notifications.push(saved);
      return saved;
    },
  });

  return state;
};

const installSubscriberStorage = async () => {
  const state = {
    nextSubscriberId: 1,
    subscribers: new Map<string, any>(),
    emailPreferences: new Map<string, any>(),
    emailJobs: [] as any[],
    deliveryEvents: [] as any[],
    analytics: [] as any[],
  };

  await patchStorage({
    getSubscriberByEmail: async (email: string) => state.subscribers.get(email.toLowerCase()),
    createSubscriber: async (insertSubscriber: any) => {
      const now = new Date();
      const subscriber = {
        id: state.nextSubscriberId++,
        lastEmailAt: null,
        createdAt: now,
        updatedAt: now,
        ...insertSubscriber,
      };
      state.subscribers.set(subscriber.email.toLowerCase(), subscriber);
      return subscriber;
    },
    updateSubscriber: async (id: number, updateSubscriber: Record<string, unknown>) => {
      const existing = Array.from(state.subscribers.values()).find((subscriber) => subscriber.id === id);
      if (!existing) throw new Error("Subscriber not found");
      const updated = { ...existing, ...updateSubscriber, updatedAt: new Date() };
      state.subscribers.set(updated.email.toLowerCase(), updated);
      return updated;
    },
    getEmailPreferenceByEmail: async (email: string) => state.emailPreferences.get(email.toLowerCase()),
    upsertEmailPreference: async (preference: any) => {
      const existing = state.emailPreferences.get(preference.email.toLowerCase());
      const saved = {
        id: existing?.id ?? state.emailPreferences.size + 1,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
        ...preference,
      };
      state.emailPreferences.set(saved.email.toLowerCase(), saved);
      return saved;
    },
    createEmailJob: async (job: any) => {
      const saved = { createdAt: new Date(), updatedAt: new Date(), ...job };
      state.emailJobs.push(saved);
      return saved;
    },
    recoverStaleProcessingEmailJobs: async () => 0,
    cancelPendingEmailJobs: async (recipient: string, category: string, reason: string) => {
      let cancelled = 0;
      for (const job of state.emailJobs) {
        if (
          job.recipient === recipient &&
          job.category === category &&
          ["queued", "retry_scheduled", "processing"].includes(job.status) &&
          !job.sentAt
        ) {
          Object.assign(job, {
            status: "failed",
            processingAt: null,
            failedAt: new Date(),
            lastError: reason,
            updatedAt: new Date(),
          });
          cancelled += 1;
        }
      }
      return cancelled;
    },
    getDueEmailJobs: async () =>
      state.emailJobs.filter((job) => ["queued", "retry_scheduled"].includes(job.status)),
    markEmailJobProcessing: async (id: string) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job || !["queued", "retry_scheduled"].includes(job.status)) return undefined;
      Object.assign(job, {
        attempts: job.attempts + 1,
        status: "processing",
        processingAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobSent: async (id: string, provider: string, providerMessageId?: string | null) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: "sent",
        provider,
        providerMessageId: providerMessageId ?? null,
        sentAt: new Date(),
        updatedAt: new Date(),
      });
      return job;
    },
    markEmailJobFailed: async (id: string, error: string, scheduledFor?: Date | null, finalFailure?: boolean) => {
      const job = state.emailJobs.find((candidate) => candidate.id === id);
      if (!job) throw new Error("Email job not found");
      Object.assign(job, {
        status: finalFailure ? "failed" : "retry_scheduled",
        lastError: error,
        scheduledFor: scheduledFor ?? new Date(),
        failedAt: finalFailure ? new Date() : null,
        updatedAt: new Date(),
      });
      return job;
    },
    getEmailJob: async (id: string) => state.emailJobs.find((job) => job.id === id),
    createEmailDeliveryEvent: async (event: any) => {
      state.deliveryEvents.push(event);
    },
    logAnalytics: async (analytics: any) => {
      const saved = { id: state.analytics.length + 1, timestamp: new Date(), ...analytics };
      state.analytics.push(saved);
      return saved;
    },
  });

  return state;
};

test("public registration creates an active account that can use profile and login before email verification", { concurrency: false }, async () => {
  const state = await installPublicRegistrationStorage();
  const { server, baseUrl } = await startTestServer();
  const credentials = {
    email: "dynamic-student@example.test",
    username: "dynamicstudent",
    password: "UsableAccess#2026",
  };

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(baseUrl)) {
      return originalFetch(input, init);
    }

    return new Response(JSON.stringify({ id: "registration-verification-message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...credentials,
        firstName: "Dynamic",
        lastName: "Student",
      }),
    });
    const registerBody = await registerResponse.json();

    assert.equal(registerResponse.status, 201);
    assert.equal(registerBody.emailVerificationBlocksLogin, false);
    assert.equal(registerBody.requiresEmailVerification, true);
    assert.equal(typeof registerBody.token, "string");
    assert.equal(registerBody.user.email, credentials.email);

    const createdUser = Array.from(state.users.values()).find((user) => user.email === credentials.email);
    assert.ok(createdUser);
    assert.equal(createdUser.isActive, true);
    assert.equal(state.emailVerificationTokens.length, 1);
    assert.equal(state.emailJobs.some((job) => job.category === "account_verification"), true);
    const verificationEmailJob = state.emailJobs.find((job) => job.category === "account_verification");
    assert.equal(verificationEmailJob?.status, "sent");
    assert.equal(verificationEmailJob?.provider, "resend");

    const profileResponse = await fetch(`${baseUrl}/api/user/profile`, {
      headers: { Authorization: `Bearer ${registerBody.token}` },
    });
    const profileBody = await profileResponse.json();

    assert.equal(profileResponse.status, 200);
    assert.equal(profileBody.email, credentials.email);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });
    const loginBody = await loginResponse.json();

    assert.equal(loginResponse.status, 200);
    assert.equal(loginBody.user.email, credentials.email);
    assert.equal(typeof loginBody.token, "string");
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 25));
    await stopTestServer(server);
  }
});

test("newsletter signup succeeds once the subscriber is saved and confirmation email is sent", { concurrency: false }, async () => {
  const state = await installSubscriberStorage();
  const { server, baseUrl } = await startTestServer();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(baseUrl)) {
      return originalFetch(input, init);
    }

    return new Response(JSON.stringify({ id: "subscription-message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const response = await fetch(`${baseUrl}/api/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "newsletter-student@example.test",
        name: "Newsletter Student",
        preferences: ["news", "jobs"],
        consentAccepted: true,
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(
      body.message,
      "Your confirmation email was accepted by our email provider. Please check your inbox and spam folder shortly to confirm your subscription.",
    );
    assert.equal(body.subscriber.email, "newsletter-student@example.test");
    assert.equal(body.subscriber.status, "pending");
    assert.equal(body.delivery.status, "sent");
    assert.equal(body.delivery.provider, "resend");
    assert.equal(body.delivery.queued, false);
    assert.equal(body.delivery.acceptedByProvider, true);
    assert.equal(body.delivery.mailboxDeliveryConfirmed, false);
    assert.equal(body.delivery.confirmationPending, true);
    assert.equal(state.subscribers.get("newsletter-student@example.test")?.status, "pending");
    assert.equal(state.emailJobs.length, 1);
    assert.equal(state.emailJobs[0].category, "subscription_confirmation");
    assert.equal(state.emailJobs[0].status, "sent");
    assert.equal(state.deliveryEvents.some((event) => event.eventType === "queued"), true);
    assert.equal(state.deliveryEvents.some((event) => event.eventType === "sent"), true);
  } finally {
    await stopTestServer(server);
  }
});

test("email queue drain requires cron authorization and processes due jobs", { concurrency: false }, async () => {
  const queue = await installQueueStorage(makeEmailJob({
    id: "cron-email-job-1",
    category: "subscription_confirmation",
    recipient: "newsletter-student@example.test",
    subject: "Confirm your Mtendere updates subscription",
  }));
  const { server, baseUrl } = await startTestServer();

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(baseUrl)) {
      return originalFetch(input, init);
    }

    return new Response(JSON.stringify({ id: "resend-message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const rejected = await fetch(`${baseUrl}/api/email/queue/drain`);
    assert.equal(rejected.status, 401);
    assert.equal(queue.state.job.status, "queued");

    const accepted = await fetch(`${baseUrl}/api/email/queue/drain`, {
      headers: { "user-agent": "vercel-cron/1.0" },
    });
    const body = await accepted.json();

    assert.equal(accepted.status, 200);
    assert.equal(body.result.skipped, false);
    assert.equal(body.result.processed, 1);
    assert.equal(body.worker.enabled, false);
    assert.equal(queue.state.job.status, "sent");
    assert.equal(queue.state.job.provider, "resend");

    const manualAccepted = await fetch(`${baseUrl}/api/email/queue/drain`, {
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    const manualBody = await manualAccepted.json();
    assert.equal(manualAccepted.status, 200);
    assert.equal(manualBody.result.skipped, false);
  } finally {
    await stopTestServer(server);
  }
});

test("verification link activates the account once and redirects to login", { concurrency: false }, async () => {
  const { createEmailTokenHash } = await emailModulePromise;
  const hashedPassword = await bcrypt.hash("StrongPass123!", 10);
  const user = {
    id: 7,
    username: "student7",
    email: "student7@example.test",
    password: hashedPassword,
    firstName: "Student",
    lastName: "Seven",
    role: "user",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const jwtId = randomUUID();
  const token = signVerificationToken(user, jwtId);
  const tokenRecord = {
    id: 77,
    userId: user.id,
    email: user.email,
    tokenHash: createEmailTokenHash(token),
    jwtId,
    status: "pending",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    usedAt: null,
    replacedAt: null,
    createdAt: new Date(),
  };
  const state = await installVerificationStorage({ user, tokenRecord });
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/verify-email/${encodeURIComponent(token)}`, {
      redirect: "manual",
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), "http://public.example.test/login?verified=1");
    assert.equal(state.user.isActive, true);
    assert.equal(state.tokenRecord.status, "used");
    assert.equal(state.welcomeJobs.length, 1);

    const replay = await fetch(`${baseUrl}/api/auth/verify-email/${encodeURIComponent(token)}`, {
      redirect: "manual",
    });
    assert.equal(replay.status, 400);
  } finally {
    await stopTestServer(server);
  }
});

test("expired verification records do not activate accounts", { concurrency: false }, async () => {
  const { createEmailTokenHash } = await emailModulePromise;
  const hashedPassword = await bcrypt.hash("StrongPass123!", 10);
  const user = {
    id: 8,
    username: "student8",
    email: "student8@example.test",
    password: hashedPassword,
    firstName: "Student",
    lastName: "Eight",
    role: "user",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const jwtId = randomUUID();
  const token = signVerificationToken(user, jwtId);
  const tokenRecord = {
    id: 88,
    userId: user.id,
    email: user.email,
    tokenHash: createEmailTokenHash(token),
    jwtId,
    status: "pending",
    expiresAt: new Date(Date.now() - 1000),
    usedAt: null,
    replacedAt: null,
    createdAt: new Date(),
  };
  const state = await installVerificationStorage({ user, tokenRecord });
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/verify-email/${encodeURIComponent(token)}`, {
      redirect: "manual",
    });

    assert.equal(response.status, 400);
    assert.equal(state.user.isActive, false);
    assert.equal(state.tokenRecord.status, "pending");
  } finally {
    await stopTestServer(server);
  }
});

test("resend verification is limited to three requests per hour", { concurrency: false }, async () => {
  const hashedPassword = await bcrypt.hash("StrongPass123!", 10);
  const user = {
    id: 9,
    username: "student9",
    email: "student9@example.test",
    password: hashedPassword,
    firstName: "Student",
    lastName: "Nine",
    role: "user",
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await installVerificationStorage({ user, recentRequestCount: 3 });
  const { server, baseUrl } = await startTestServer();

  try {
    const response = await fetch(`${baseUrl}/api/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });
    const body = await response.json();

    assert.equal(response.status, 429);
    assert.equal(body.message, "Maximum verification requests reached. Please try again later.");
    assert.equal(response.headers.has("retry-after"), true);
  } finally {
    await stopTestServer(server);
  }
});
