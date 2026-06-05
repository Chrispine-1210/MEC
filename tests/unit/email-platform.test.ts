import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { afterEach, test } from "node:test";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";

process.env.NODE_ENV = "test";
process.env.VERCEL = "1";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.JWT_SECRET = "email-platform-test-secret-32-chars";
process.env.PUBLIC_APP_URL = "http://public.example.test";
process.env.API_APP_URL = "http://api.example.test";
process.env.EMAIL_FROM = "Mtendere Education Consult <no-reply@example.test>";
process.env.EMAIL_PROVIDER_ORDER = "resend,sendgrid";
process.env.RESEND_API_KEY = "resend-test-key";
process.env.SENDGRID_API_KEY = "SG.sendgrid-test-key";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_PORT = "";
process.env.EMAIL_DRY_RUN = "false";
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

afterEach(() => {
  while (restoreCallbacks.length) {
    restoreCallbacks.pop()?.();
  }
  globalThis.fetch = originalFetch;
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

const installQueueStorage = async (initialJob: any) => {
  const state = { job: initialJob };
  const deliveryEvents: any[] = [];
  const failedUpdates: any[] = [];

  await patchStorage({
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

test("email queue skips jobs that cannot be claimed for processing", { concurrency: false }, async () => {
  const { processEmailQueue } = await emailModulePromise;
  const deliveryEvents: any[] = [];

  await patchStorage({
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
    getDueEmailJobs: async () => [],
    createEmailDeliveryEvent: async () => undefined,
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
    getDueEmailJobs: async () => [],
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

test("newsletter signup succeeds once the subscriber is saved and confirmation email is queued", { concurrency: false }, async () => {
  const state = await installSubscriberStorage();
  const { server, baseUrl } = await startTestServer();

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
    assert.equal(body.message, "Please check your inbox shortly to confirm your subscription.");
    assert.equal(body.subscriber.email, "newsletter-student@example.test");
    assert.equal(body.subscriber.status, "pending");
    assert.equal(body.delivery.status, "queued");
    assert.equal(body.delivery.queued, true);
    assert.equal(state.subscribers.get("newsletter-student@example.test")?.status, "pending");
    assert.equal(state.emailJobs.length, 1);
    assert.equal(state.emailJobs[0].category, "subscription_confirmation");
    assert.equal(state.deliveryEvents.some((event) => event.eventType === "queued"), true);
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
      headers: { Authorization: "Bearer cron-test-secret" },
    });
    const body = await accepted.json();

    assert.equal(accepted.status, 200);
    assert.equal(body.result.skipped, false);
    assert.equal(body.result.processed, 1);
    assert.equal(body.worker.enabled, false);
    assert.equal(queue.state.job.status, "sent");
    assert.equal(queue.state.job.provider, "resend");
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
