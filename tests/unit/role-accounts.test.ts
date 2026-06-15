import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { ensureStableRoleAccounts } from "../../server/role-accounts";

type FakeUser = {
  id: number;
  username: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const createFakeStorage = (users: FakeUser[] = []) => {
  const state = new Map<number, FakeUser>(users.map((user) => [user.id, user]));
  let nextId = users.length + 1;

  return {
    state,
    async getUserByEmail(email: string) {
      return Array.from(state.values()).find((user) => user.email === email);
    },
    async getUserByUsername(username: string) {
      return Array.from(state.values()).find((user) => user.username === username);
    },
    async createUser(user: any) {
      const created = {
        ...user,
        id: nextId++,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FakeUser;
      state.set(created.id, created);
      return created as never;
    },
    async updateUser(id: number, updates: any) {
      const existing = state.get(id);
      assert.ok(existing);
      const updated = { ...existing, ...updates, updatedAt: new Date() } as FakeUser;
      state.set(id, updated);
      return updated as never;
    },
  };
};

test("role account seeding preserves existing password hashes by default", async () => {
  const originalPassword = "StableAccess#2026";
  const originalHash = await bcrypt.hash(originalPassword, 4);
  const storage = createFakeStorage([
    {
      id: 1,
      username: "mec_admin",
      email: "admin@mtendereeducationconsult.com",
      password: originalHash,
      firstName: "Platform",
      lastName: "Admin",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const results = await ensureStableRoleAccounts(storage as any, {
    failOnMissingPassword: false,
    hashRounds: 4,
    env: {
      SEED_ADMIN_PASSWORD: "DifferentAccess#2026",
    } as NodeJS.ProcessEnv,
  });

  assert.equal(results.find((result) => result.role === "admin")?.status, "existing_preserved");
  assert.equal(storage.state.get(1)?.password, originalHash);
  assert.equal(await bcrypt.compare(originalPassword, storage.state.get(1)?.password || ""), true);
  assert.equal(await bcrypt.compare("DifferentAccess#2026", storage.state.get(1)?.password || ""), false);
});

test("role account seeding repairs role and active state without changing password", async () => {
  const originalHash = await bcrypt.hash("WriterAccess#2026", 4);
  const storage = createFakeStorage([
    {
      id: 1,
      username: "mec_writer",
      email: "writer@mtendereeducationconsult.com",
      password: originalHash,
      firstName: "Content",
      lastName: "Writer",
      role: "viewer",
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const results = await ensureStableRoleAccounts(storage as any, {
    failOnMissingPassword: false,
    hashRounds: 4,
    env: {} as NodeJS.ProcessEnv,
  });

  const writer = storage.state.get(1);
  assert.equal(results.find((result) => result.role === "writer")?.status, "metadata_repaired");
  assert.equal(writer?.role, "writer");
  assert.equal(writer?.isActive, true);
  assert.equal(writer?.password, originalHash);
});

test("role account seeding does not create missing accounts without configured passwords", async () => {
  const storage = createFakeStorage();

  const results = await ensureStableRoleAccounts(storage as any, {
    failOnMissingPassword: false,
    hashRounds: 4,
    env: {} as NodeJS.ProcessEnv,
  });

  assert.equal(storage.state.size, 0);
  assert.equal(results.every((result) => result.status === "missing_password"), true);
});

test("role account seeding rotates passwords only when explicitly requested", async () => {
  const originalHash = await bcrypt.hash("ViewerAccess#2026", 4);
  const storage = createFakeStorage([
    {
      id: 1,
      username: "mec_viewer",
      email: "viewer@mtendereeducationconsult.com",
      password: originalHash,
      firstName: "Read",
      lastName: "Only",
      role: "viewer",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const results = await ensureStableRoleAccounts(storage as any, {
    rotateExisting: true,
    failOnMissingPassword: false,
    hashRounds: 4,
    env: {
      SEED_VIEWER_PASSWORD: "ViewerAccess#2027",
    } as NodeJS.ProcessEnv,
  });

  assert.equal(results.find((result) => result.role === "viewer")?.status, "password_rotated");
  assert.notEqual(storage.state.get(1)?.password, originalHash);
  assert.equal(await bcrypt.compare("ViewerAccess#2027", storage.state.get(1)?.password || ""), true);
});
