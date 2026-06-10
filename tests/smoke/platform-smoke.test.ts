import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import type { Server } from "node:http";
import path from "node:path";
import bcrypt from "bcryptjs";
import express from "express";

process.env.NODE_ENV = "test";
process.env.VERCEL = "1";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.JWT_SECRET = "platform-smoke-test-secret-32-chars";
process.env.PUBLIC_APP_URL = "http://public.example.test";
process.env.API_APP_URL = "http://api.example.test";
process.env.EMAIL_FROM = "Mtendere Education Consult <no-reply@example.test>";
process.env.EMAIL_PROVIDER_ORDER = "resend";
process.env.RESEND_API_KEY = "resend-smoke-key";
process.env.EMAIL_DRY_RUN = "false";
process.env.EMAIL_ALLOW_LIVE_TEST_SENDS = "true";
process.env.EMAIL_QUEUE_WORKER_ENABLED = "false";
process.env.RECAPTCHA_SECRET_KEY = "";
process.env.CRON_SECRET = "smoke-cron-secret";

type StoragePatch = Record<string, (...args: any[]) => any>;

const storageModulePromise = import("../../server/storage");
const routesModulePromise = import("../../server/routes");
const restoreCallbacks: Array<() => void> = [];
const originalFetch = globalThis.fetch;

const smokePassword = "SmokeAccess#2026";
const adminTotpSecret = "JBSWY3DPEHPK3PXP";
const testDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

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
    throw new Error("Failed to bind smoke server");
  }

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const stopTestServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
};

const requestJson = async (
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<{ status: number; body: any; headers: Headers; elapsedMs: number }> => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, options);
  const elapsedMs = performance.now() - startedAt;
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers, elapsedMs };
};

const waitFor = async (predicate: () => boolean, label: string, timeoutMs = 1500) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(`Timed out waiting for ${label}`);
};

const totpAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const decodeTotpSecret = (secret: string) => {
  let value = 0;
  let bits = 0;
  const bytes: number[] = [];

  for (const char of secret.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    const index = totpAlphabet.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const createTotpCode = (secret: string) => {
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", decodeTotpSecret(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1_000_000).padStart(6, "0");
};

const installSmokeStorage = async () => {
  const now = new Date();
  const state = {
    nextUserId: 10,
    nextApplicationId: 1000,
    users: new Map<number, any>(),
    applications: new Map<number, any>(),
    emailJobs: [] as any[],
    deliveryEvents: [] as any[],
    verificationTokens: [] as any[],
    analytics: [] as any[],
    communicationEvents: [] as any[],
    communicationMessages: [] as any[],
    workflowTasks: [] as any[],
    notifications: [] as any[],
    providerRequests: [] as string[],
    jobs: new Map<number, any>([
      [
        501,
        {
          id: 501,
          title: "Smoke QA Analyst",
          description: "Reliability smoke test opportunity",
          company: "Mtendere Education Consult",
          location: "Lilongwe",
          salary: null,
          currency: "USD",
          jobType: "Full-time",
          requirements: ["Testing", "Reliability"],
          benefits: ["Mentorship"],
          isRemote: true,
          deadline: testDeadline,
          isActive: true,
          createdBy: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
    ]),
  };

  const seedUser = async (input: {
    id: number;
    username: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    mfaConfirmed?: boolean;
  }) => {
    state.users.set(input.id, {
      id: input.id,
      username: input.username,
      email: input.email,
      password: await bcrypt.hash(smokePassword, 10),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      referralCode: null,
      stripeCustomerId: null,
      defaultCurrency: "USD",
      isActive: true,
      mfaEnabled: Boolean(input.mfaConfirmed),
      totpSecret: input.mfaConfirmed ? adminTotpSecret : null,
      mfaConfirmedAt: input.mfaConfirmed ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  };

  await seedUser({
    id: 1,
    username: "smokeadmin",
    email: "smoke-admin@example.test",
    role: "super_admin",
    firstName: "Smoke",
    lastName: "Admin",
    mfaConfirmed: true,
  });
  await seedUser({
    id: 2,
    username: "smokewriter",
    email: "smoke-writer@example.test",
    role: "writer",
    firstName: "Smoke",
    lastName: "Writer",
  });
  await seedUser({
    id: 3,
    username: "smokeviewer",
    email: "smoke-viewer@example.test",
    role: "viewer",
    firstName: "Smoke",
    lastName: "Viewer",
  });

  const findUserByEmail = (email: string) =>
    Array.from(state.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase());
  const findUserByUsername = (username: string) =>
    Array.from(state.users.values()).find((user) => user.username.toLowerCase() === username.toLowerCase());

  await patchStorage({
    getUser: async (id: number) => state.users.get(id),
    getUserByEmail: async (email: string) => findUserByEmail(email),
    getUserByUsername: async (username: string) => findUserByUsername(username),
    getAllUsers: async () => Array.from(state.users.values()),
    createUser: async (insertUser: any) => {
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
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
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
    getJob: async (id: number) => state.jobs.get(id),
    getScholarship: async () => undefined,
    getUserApplications: async (userId: number) =>
      Array.from(state.applications.values()).filter((application) => application.userId === userId),
    getAllApplications: async () => Array.from(state.applications.values()),
    getApplication: async (id: number) => state.applications.get(id),
    createApplication: async (insertApplication: any) => {
      const application = {
        id: state.nextApplicationId++,
        status: "pending",
        documents: null,
        notes: null,
        submittedAt: new Date(),
        updatedAt: new Date(),
        ...insertApplication,
      };
      state.applications.set(application.id, application);
      return application;
    },
    updateApplication: async (id: number, updateApplication: Record<string, unknown>) => {
      const existing = state.applications.get(id);
      if (!existing) throw new Error("Application not found");
      const updated = { ...existing, ...updateApplication, updatedAt: new Date() };
      state.applications.set(id, updated);
      return updated;
    },
    logAnalytics: async (analytics: any) => {
      const saved = { id: state.analytics.length + 1, timestamp: new Date(), ...analytics };
      state.analytics.push(saved);
      return saved;
    },
    countEmailVerificationRequests: async () => 0,
    revokePendingEmailVerificationTokens: async () => undefined,
    createEmailVerificationToken: async (token: any) => {
      const saved = { id: state.verificationTokens.length + 1, createdAt: new Date(), ...token };
      state.verificationTokens.push(saved);
      return saved;
    },
    getEmailPreferenceByEmail: async () => undefined,
    upsertEmailPreference: async (preference: any) => ({
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...preference,
    }),
    cancelPendingEmailJobs: async (recipient: string, category: string, reason: string) => {
      let cancelled = 0;
      for (const job of state.emailJobs) {
        if (job.recipient === recipient && job.category === category && ["queued", "retry_scheduled", "processing"].includes(job.status)) {
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
    getEmailJobByProviderMessageId: async () => undefined,
    createEmailDeliveryEvent: async (event: any) => {
      state.deliveryEvents.push(event);
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

const installMockEmailTransport = (baseUrl: string, state: { providerRequests: string[] }) => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(baseUrl)) {
      return originalFetch(input, init);
    }

    state.providerRequests.push(url);
    return new Response(JSON.stringify({ id: `smoke-${randomBytes(4).toString("hex")}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
};

const login = async (baseUrl: string, email: string, password: string) => {
  const response = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response;
};

const loginWithMfa = async (baseUrl: string) => {
  const loginResponse = await login(baseUrl, "smoke-admin@example.test", smokePassword);
  assert.equal(loginResponse.status, 202);
  assert.equal(typeof loginResponse.body.challengeToken, "string");

  const verifyResponse = await requestJson(baseUrl, "/api/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeToken: loginResponse.body.challengeToken,
      code: createTotpCode(adminTotpSecret),
    }),
  });
  assert.equal(verifyResponse.status, 200);
  assert.equal(typeof verifyResponse.body.token, "string");
  return verifyResponse.body.token as string;
};

test("core platform smoke: registration, login, application, admin review, email triggers, RBAC, and graceful failures", { concurrency: false }, async () => {
  const state = await installSmokeStorage();
  const { server, baseUrl } = await startTestServer();
  installMockEmailTransport(baseUrl, state);

  try {
    const registerResponse = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "smokestudent",
        email: "smoke-student@example.test",
        password: smokePassword,
        firstName: "Smoke",
        lastName: "Student",
      }),
    });
    assert.equal(registerResponse.status, 201);
    assert.equal(registerResponse.body.emailVerificationBlocksLogin, false);
    assert.equal(typeof registerResponse.body.token, "string");
    assert.equal(state.verificationTokens.length, 1);
    assert.equal(state.emailJobs.some((job) => job.category === "account_verification"), true);

    const loginResponse = await login(baseUrl, "smoke-student@example.test", smokePassword);
    assert.equal(loginResponse.status, 200);
    const studentToken = loginResponse.body.token as string;

    const profileResponse = await requestJson(baseUrl, "/api/user/profile", {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(profileResponse.status, 200);
    assert.equal(profileResponse.body.email, "smoke-student@example.test");
    assert.ok(profileResponse.elapsedMs < 1000, `profile API latency ${profileResponse.elapsedMs.toFixed(1)}ms exceeded smoke threshold`);

    const profileUpdateResponse = await requestJson(baseUrl, "/api/user/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: "Smoke",
        lastName: "Student",
        username: "smokestudentprofile",
        phone: "+265 999 000 111",
        dateOfBirth: "2001-02-03",
      }),
    });
    assert.equal(profileUpdateResponse.status, 200);
    assert.equal(profileUpdateResponse.body.username, "smokestudentprofile");
    assert.equal(profileUpdateResponse.body.phone, "+265 999 000 111");
    assert.match(profileUpdateResponse.body.dateOfBirth, /^2001-02-03/);

    const updatedProfileResponse = await requestJson(baseUrl, "/api/user/profile", {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(updatedProfileResponse.status, 200);
    assert.equal(updatedProfileResponse.body.username, "smokestudentprofile");
    assert.equal(updatedProfileResponse.body.phone, "+265 999 000 111");

    const avatarForm = new FormData();
    avatarForm.append(
      "profilePicture",
      new Blob(
        [
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
            "base64",
          ),
        ],
        { type: "image/png" },
      ),
      "avatar.png",
    );
    const avatarResponse = await fetch(`${baseUrl}/api/user/profile-picture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: avatarForm,
    });
    const avatarBody = await avatarResponse.json();
    assert.equal(avatarResponse.status, 201);
    assert.match(avatarBody.profilePicture, /^\/uploads\/avatar-\d+-\d+\.png$/);
    assert.equal(avatarBody.user.profilePicture, avatarBody.profilePicture);
    const avatarFileName = String(avatarBody.profilePicture).split("/").pop();
    if (avatarFileName) {
      await fs.rm(path.join(process.cwd(), "uploads", avatarFileName), { force: true });
    }

    const applicationResponse = await requestJson(baseUrl, "/api/applications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "job",
        referenceId: 501,
        status: "pending",
        notes: "Smoke test application",
        documents: {
          source: "smoke",
          applicant: { country: "Malawi" },
          answers: { availability: "immediate" },
        },
      }),
    });
    assert.equal(applicationResponse.status, 201);
    assert.equal(applicationResponse.body.status, "pending");
    assert.equal(applicationResponse.body.delivery.status, "queued");
    assert.equal(applicationResponse.body.delivery.queued, true);
    const applicationId = Number(applicationResponse.body.id);
    assert.equal(state.emailJobs.some((job) => job.category === "application_confirmation"), true);

    const dashboardApplications = await requestJson(baseUrl, "/api/applications", {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(dashboardApplications.status, 200);
    assert.equal(dashboardApplications.body.some((application: any) => application.id === applicationId), true);
    assert.ok(
      dashboardApplications.elapsedMs < 1000,
      `applications API latency ${dashboardApplications.elapsedMs.toFixed(1)}ms exceeded smoke threshold`,
    );

    const duplicateApplication = await requestJson(baseUrl, "/api/applications", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${studentToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "job", referenceId: 501 }),
    });
    assert.equal(duplicateApplication.status, 409);
    assert.match(duplicateApplication.body.message, /already applied/i);

    const adminToken = await loginWithMfa(baseUrl);
    const adminApplications = await requestJson(baseUrl, "/api/admin/applications", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminApplications.status, 200);
    assert.equal(adminApplications.body.applications.some((application: any) => Number(application.id) === applicationId), true);

    const statusUpdate = await requestJson(baseUrl, `/api/admin/applications/${applicationId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "under_review",
        reviewNotes: "Smoke review accepted for next step.",
        stage: "review",
        score: 88,
      }),
    });
    assert.equal(statusUpdate.status, 200);
    assert.equal(statusUpdate.body.status, "under_review");
    await waitFor(
      () => state.emailJobs.some((job) => job.category === "application_status_update"),
      "application status update email job",
    );

    const viewerLogin = await login(baseUrl, "smoke-viewer@example.test", smokePassword);
    assert.equal(viewerLogin.status, 200);
    const viewerDenied = await requestJson(baseUrl, "/api/admin/applications", {
      headers: { Authorization: `Bearer ${viewerLogin.body.token}` },
    });
    assert.equal(viewerDenied.status, 403);
    assert.equal(viewerDenied.body.message, "Admin access required");

    const writerLogin = await login(baseUrl, "smoke-writer@example.test", smokePassword);
    assert.equal(writerLogin.status, 200);
    const writerDenied = await requestJson(baseUrl, "/api/admin/applications", {
      headers: { Authorization: `Bearer ${writerLogin.body.token}` },
    });
    assert.equal(writerDenied.status, 403);
    assert.equal(writerDenied.body.message, "Admin access required");

    assert.equal(state.analytics.some((item) => item.event === "application_submitted"), true);
    assert.equal(state.analytics.some((item) => item.event === "application_reviewed"), true);
    assert.equal(state.deliveryEvents.some((event) => event.eventType === "queued"), true);
  } finally {
    await new Promise((resolve) => setTimeout(resolve, 50));
    await stopTestServer(server);
  }
});
