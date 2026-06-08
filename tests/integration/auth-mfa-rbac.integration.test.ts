import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { createHmac, randomBytes } from "node:crypto";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.DATABASE_URL_UNPOOLED =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "integration-test-secret-with-enough-length";

type MockUser = {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  mfaEnabled: boolean | null;
  totpSecret: string | null;
  mfaConfirmedAt: Date | null;
  profilePicture: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

type StorageRef = {
  getUser: (id: number) => Promise<any>;
  getUserByEmail: (email: string) => Promise<any>;
  getUserByUsername: (username: string) => Promise<any>;
  updateUser: (id: number, updateUser: Record<string, unknown>) => Promise<any>;
  logAnalytics: (analytics: any) => Promise<any>;
};

let storageRef: StorageRef | null = null;
let registerRoutesRef: ((app: express.Express) => Promise<Server>) | null = null;
let originalStorageMethods: {
  getUser: StorageRef["getUser"];
  getUserByEmail: StorageRef["getUserByEmail"];
  getUserByUsername: StorageRef["getUserByUsername"];
  updateUser: StorageRef["updateUser"];
  logAnalytics: StorageRef["logAnalytics"];
} | null = null;

const loadServerModules = async () => {
  if (storageRef && registerRoutesRef && originalStorageMethods) {
    return { storageRef, registerRoutesRef, originalStorageMethods };
  }

  const routesModule = await import("../../server/routes");
  const storageModule = await import("../../server/storage");

  registerRoutesRef = routesModule.registerRoutes;
  storageRef = storageModule.storage as StorageRef;
  originalStorageMethods = {
    getUser: storageRef.getUser.bind(storageRef),
    getUserByEmail: storageRef.getUserByEmail.bind(storageRef),
    getUserByUsername: storageRef.getUserByUsername.bind(storageRef),
    updateUser: storageRef.updateUser.bind(storageRef),
    logAnalytics: storageRef.logAnalytics.bind(storageRef),
  };

  return { storageRef, registerRoutesRef, originalStorageMethods };
};

const restoreStorage = async () => {
  const modules = await loadServerModules();
  modules.storageRef.getUser = modules.originalStorageMethods.getUser;
  modules.storageRef.getUserByEmail = modules.originalStorageMethods.getUserByEmail;
  modules.storageRef.getUserByUsername = modules.originalStorageMethods.getUserByUsername;
  modules.storageRef.updateUser = modules.originalStorageMethods.updateUser;
  modules.storageRef.logAnalytics = modules.originalStorageMethods.logAnalytics;
};

afterEach(async () => {
  await restoreStorage();
});

const withMockStorage = async (users: MockUser[]) => {
  const { storageRef } = await loadServerModules();
  const byId = new Map(users.map((user) => [user.id, { ...user }]));
  const byEmail = new Map(users.map((user) => [user.email.toLowerCase(), user.id]));
  const byUsername = new Map(users.map((user) => [user.username.toLowerCase(), user.id]));

  storageRef.getUser = async (id: number) => byId.get(id);
  storageRef.getUserByEmail = async (email: string) => {
    const id = byEmail.get(email.toLowerCase());
    return id ? byId.get(id) : undefined;
  };
  storageRef.getUserByUsername = async (username: string) => {
    const id = byUsername.get(username.toLowerCase());
    return id ? byId.get(id) : undefined;
  };
  storageRef.updateUser = async (id: number, updateUser: Record<string, unknown>) => {
    const existing = byId.get(id);
    if (!existing) throw new Error("User not found");
    const updated = {
      ...existing,
      ...updateUser,
      updatedAt: new Date(),
    } as MockUser;
    byId.set(id, updated);
    return updated;
  };
  storageRef.logAnalytics = async (analytics: any) => ({
    id: Date.now(),
    ...analytics,
    timestamp: new Date(),
  });
};

const startTestServer = async () => {
  const { registerRoutesRef } = await loadServerModules();
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = await registerRoutesRef(app);
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

const requestJson = async (
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<{ status: number; body: any; headers: Headers }> => {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers };
};

const totpAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const createTotpSecret = () => {
  let output = "";
  let value = 0;
  let bits = 0;

  for (const byte of randomBytes(20)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += totpAlphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += totpAlphabet[(value << (5 - bits)) & 31];
  }

  return output;
};

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

const loginAndVerifyMfa = async (
  baseUrl: string,
  email: string,
  password: string,
  totpSecret: string,
) => {
  const loginResponse = await requestJson(baseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(loginResponse.status, 202);
  assert.equal(loginResponse.body.mfaRequired, true);
  assert.equal(typeof loginResponse.body.challengeToken, "string");

  const code = createTotpCode(totpSecret);
  const verifyResponse = await requestJson(baseUrl, "/api/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challengeToken: loginResponse.body.challengeToken,
      code,
    }),
  });

  assert.equal(verifyResponse.status, 200);
  assert.equal(typeof verifyResponse.body.token, "string");
  assert.equal(verifyResponse.body.mfaVerified, true);

  return verifyResponse.body.token as string;
};

test("MFA challenge flow verifies login and allows privileged route", async () => {
  const totpSecret = createTotpSecret();
  await withMockStorage([
    {
      id: 1,
      username: "adminuser",
      email: "admin@example.com",
      password: await bcrypt.hash("secret123", 10),
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      mfaEnabled: true,
      totpSecret,
      mfaConfirmedAt: new Date(),
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const { server, baseUrl } = await startTestServer();
  try {
    const token = await loginAndVerifyMfa(
      baseUrl,
      "admin@example.com",
      "secret123",
      totpSecret,
    );

    const adminResponse = await requestJson(baseUrl, "/api/admin/ai-chat/conversations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(adminResponse.status, 200);
  } finally {
    await stopTestServer(server);
  }
});

test("Privileged role without MFA setup is blocked from admin routes", async () => {
  await withMockStorage([
    {
      id: 2,
      username: "adminnomfa",
      email: "admin-nomfa@example.com",
      password: await bcrypt.hash("secret123", 10),
      firstName: "Admin",
      lastName: "NoMfa",
      role: "admin",
      mfaEnabled: false,
      totpSecret: null,
      mfaConfirmedAt: null,
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const { server, baseUrl } = await startTestServer();
  try {
    const loginResponse = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "adminnomfa", password: "secret123" }),
    });

    assert.equal(loginResponse.status, 200);
    assert.equal(typeof loginResponse.body.token, "string");

    const adminResponse = await requestJson(baseUrl, "/api/admin/ai-chat/conversations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${loginResponse.body.token}`,
      },
    });

    assert.equal(adminResponse.status, 403);
    assert.equal(adminResponse.body.code, "MFA_SETUP_REQUIRED");
  } finally {
    await stopTestServer(server);
  }
});

test("Viewer role is denied admin routes by RBAC guard", async () => {
  await withMockStorage([
    {
      id: 3,
      username: "vieweruser",
      email: "viewer@example.com",
      password: await bcrypt.hash("secret123", 10),
      firstName: "View",
      lastName: "Only",
      role: "viewer",
      mfaEnabled: false,
      totpSecret: null,
      mfaConfirmedAt: null,
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const { server, baseUrl } = await startTestServer();
  try {
    const loginResponse = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "viewer@example.com", password: "secret123" }),
    });

    assert.equal(loginResponse.status, 200);

    const adminResponse = await requestJson(baseUrl, "/api/admin/ai-chat/conversations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${loginResponse.body.token}`,
      },
    });
    assert.equal(adminResponse.status, 403);
    assert.equal(adminResponse.body.message, "Admin access required");
  } finally {
    await stopTestServer(server);
  }
});

test("Admin with verified MFA is denied settings endpoint without manage_settings permission", async () => {
  const totpSecret = createTotpSecret();
  await withMockStorage([
    {
      id: 4,
      username: "adminlimited",
      email: "admin-limited@example.com",
      password: await bcrypt.hash("secret123", 10),
      firstName: "Admin",
      lastName: "Limited",
      role: "admin",
      mfaEnabled: true,
      totpSecret,
      mfaConfirmedAt: new Date(),
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const { server, baseUrl } = await startTestServer();
  try {
    const token = await loginAndVerifyMfa(
      baseUrl,
      "admin-limited@example.com",
      "secret123",
      totpSecret,
    );

    const settingsResponse = await requestJson(baseUrl, "/api/admin/settings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(settingsResponse.status, 403);
    assert.equal(settingsResponse.body.code, "INSUFFICIENT_PERMISSION");
    assert.deepEqual(settingsResponse.body.requiredAnyOf, ["manage_settings"]);
  } finally {
    await stopTestServer(server);
  }
});

test("Privileged route rejects tokens that are not MFA-verified", async () => {
  const totpSecret = createTotpSecret();
  const passwordHash = await bcrypt.hash("secret123", 10);
  await withMockStorage([
    {
      id: 5,
      username: "adminmfa",
      email: "admin-mfa@example.com",
      password: passwordHash,
      firstName: "Admin",
      lastName: "Mfa",
      role: "admin",
      mfaEnabled: true,
      totpSecret,
      mfaConfirmedAt: new Date(),
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const token = jwt.sign(
    {
      id: 5,
      email: "admin-mfa@example.com",
      role: "admin",
      type: "access",
      pwd: createHmac("sha256", process.env.JWT_SECRET as string)
        .update(passwordHash)
        .digest("hex")
        .slice(0, 40),
      mfaVerified: false,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "5m" },
  );

  const { server, baseUrl } = await startTestServer();
  try {
    const response = await requestJson(baseUrl, "/api/admin/ai-chat/conversations", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.code, "MFA_VERIFICATION_REQUIRED");
  } finally {
    await stopTestServer(server);
  }
});

test("Refresh token reuse is rejected after rotation", async () => {
  await withMockStorage([
    {
      id: 6,
      username: "studentuser",
      email: "student@example.com",
      password: await bcrypt.hash("secret123", 10),
      firstName: "Student",
      lastName: "User",
      role: "user",
      mfaEnabled: false,
      totpSecret: null,
      mfaConfirmedAt: null,
      profilePicture: null,
      phone: null,
      dateOfBirth: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const { server, baseUrl } = await startTestServer();
  try {
    const loginResponse = await requestJson(baseUrl, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@example.com", password: "secret123" }),
    });

    assert.equal(loginResponse.status, 200);
    const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);

    const firstRefresh = await requestJson(baseUrl, "/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(firstRefresh.status, 200);

    const replayRefresh = await requestJson(baseUrl, "/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(replayRefresh.status, 401);
    assert.equal(replayRefresh.body.code, "REFRESH_TOKEN_REUSE_DETECTED");
  } finally {
    await stopTestServer(server);
  }
});
