import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../server/db";
import { storage } from "../server/storage";

type SeedRole = "super_admin" | "admin" | "writer" | "viewer";

type SeedAccount = {
  role: SeedRole;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
};

const roleDomain = process.env.SEED_ROLE_ACCOUNT_DOMAIN || "mtendereeducationconsult.com";
const credentialsPath = path.resolve(
  process.env.SEED_ROLE_CREDENTIALS_PATH || "data/admin-role-credentials.json",
);
const rotateExisting =
  process.argv.includes("--rotate-existing") ||
  process.env.SEED_ROLE_ROTATE_EXISTING?.toLowerCase() === "true";

const accountDefinitions: SeedAccount[] = [
  {
    role: "super_admin",
    username: process.env.SEED_SUPER_ADMIN_USERNAME || "mec_super_admin",
    email: process.env.SEED_SUPER_ADMIN_EMAIL || `super-admin@${roleDomain}`,
    firstName: "Super",
    lastName: "Admin",
  },
  {
    role: "admin",
    username: process.env.SEED_ADMIN_USERNAME || "mec_admin",
    email: process.env.SEED_ADMIN_EMAIL || `admin@${roleDomain}`,
    firstName: "Platform",
    lastName: "Admin",
  },
  {
    role: "writer",
    username: process.env.SEED_WRITER_USERNAME || "mec_writer",
    email: process.env.SEED_WRITER_EMAIL || `writer@${roleDomain}`,
    firstName: "Content",
    lastName: "Writer",
  },
  {
    role: "viewer",
    username: process.env.SEED_VIEWER_USERNAME || "mec_viewer",
    email: process.env.SEED_VIEWER_EMAIL || `viewer@${roleDomain}`,
    firstName: "Read",
    lastName: "Only",
  },
];

const generatePassword = () => `${randomBytes(24).toString("base64url")}Aa1!`;

const writeCredentials = (payload: unknown) => {
  fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });
  fs.writeFileSync(credentialsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  try {
    fs.chmodSync(credentialsPath, 0o600);
  } catch {
    // Windows may ignore POSIX file modes; git ignore still prevents accidental commits.
  }
};

const seed = async () => {
  const results: Array<Record<string, unknown>> = [];

  for (const account of accountDefinitions) {
    const normalizedEmail = account.email.trim().toLowerCase();
    const username = account.username.trim();
    const existing =
      (await storage.getUserByEmail(normalizedEmail)) ||
      (await storage.getUserByUsername(username));

    if (existing && !rotateExisting) {
      results.push({
        role: account.role,
        username: existing.username,
        email: existing.email,
        status: "existing_not_rotated",
        password: null,
        actionRequired: "Run with --rotate-existing if this account needs a fresh password.",
      });
      continue;
    }

    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 12);

    if (existing) {
      const updated = await storage.updateUser(existing.id, {
        username,
        email: normalizedEmail,
        password: hashedPassword,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        isActive: true,
      });
      results.push({
        role: account.role,
        username: updated.username,
        email: updated.email,
        status: "rotated",
        password,
        actionRequired: "Rotate after handoff and enroll MFA before production use.",
      });
      continue;
    }

    const created = await storage.createUser({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      firstName: account.firstName,
      lastName: account.lastName,
      role: account.role,
      isActive: true,
    });

    results.push({
      role: account.role,
      username: created.username,
      email: created.email,
      status: "created",
      password,
      actionRequired: "Rotate after handoff and enroll MFA before production use.",
    });
  }

  writeCredentials({
    generatedAt: new Date().toISOString(),
    rotateExisting,
    note: "Do not commit this file. Transfer passwords through a secure administrative channel, then rotate them.",
    accounts: results,
  });

  console.log("[seed] Role accounts processed.");
  console.table(
    results.map(({ role, username, email, status }) => ({
      role,
      username,
      email,
      status,
    })),
  );
  console.log(`[seed] Credentials file: ${credentialsPath}`);
};

seed()
  .catch((error) => {
    console.error("[seed] Failed to seed role accounts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
