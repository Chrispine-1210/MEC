import bcrypt from "bcryptjs";
import { z } from "zod";
import type { User, InsertUser } from "@shared/schema";

export type StableRoleAccountRole = "super_admin" | "admin" | "writer" | "viewer";

type StableRoleAccountDefinition = {
  role: StableRoleAccountRole;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordEnvNames: string[];
};

type RoleAccountStorage = {
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
};

export type StableRoleAccountResult = {
  role: StableRoleAccountRole;
  username: string;
  email: string;
  status:
    | "created"
    | "existing_preserved"
    | "metadata_repaired"
    | "password_rotated"
    | "missing_password";
  passwordChanged: boolean;
  actionRequired?: string;
};

export type EnsureStableRoleAccountOptions = {
  env?: NodeJS.ProcessEnv;
  rotateExisting?: boolean;
  failOnMissingPassword?: boolean;
  hashRounds?: number;
};

const roleAccountPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol")
  .refine((password) => !/admin123|password|qwerty|mtendere/i.test(password), "Password is too common");

const getConfiguredValue = (env: NodeJS.ProcessEnv, names: string[]) =>
  names.map((name) => env[name]?.trim()).find((value): value is string => Boolean(value));

export const getStableRoleAccountDefinitions = (
  env: NodeJS.ProcessEnv = process.env,
): StableRoleAccountDefinition[] => {
  const roleDomain = env.SEED_ROLE_ACCOUNT_DOMAIN || "mtendereeducationconsult.com";
  const accounts: StableRoleAccountDefinition[] = [
    {
      role: "super_admin",
      username: env.SEED_SUPER_ADMIN_USERNAME || "mec_super_admin",
      email: env.SEED_SUPER_ADMIN_EMAIL || `super-admin@${roleDomain}`,
      firstName: "Super",
      lastName: "Admin",
      passwordEnvNames: ["SEED_SUPER_ADMIN_PASSWORD", "SUPER_ADMIN_PASSWORD"],
    },
    {
      role: "admin",
      username: env.SEED_ADMIN_USERNAME || "mec_admin",
      email: env.SEED_ADMIN_EMAIL || `admin@${roleDomain}`,
      firstName: "Platform",
      lastName: "Admin",
      passwordEnvNames: ["SEED_ADMIN_PASSWORD"],
    },
    {
      role: "writer",
      username: env.SEED_WRITER_USERNAME || "mec_writer",
      email: env.SEED_WRITER_EMAIL || `writer@${roleDomain}`,
      firstName: "Content",
      lastName: "Writer",
      passwordEnvNames: ["SEED_WRITER_PASSWORD"],
    },
    {
      role: "viewer",
      username: env.SEED_VIEWER_USERNAME || "mec_viewer",
      email: env.SEED_VIEWER_EMAIL || `viewer@${roleDomain}`,
      firstName: "Read",
      lastName: "Only",
      passwordEnvNames: ["SEED_VIEWER_PASSWORD"],
    },
  ];

  return accounts.map((account) => ({
    ...account,
    username: account.username.trim(),
    email: account.email.trim().toLowerCase(),
  }));
};

const validateConfiguredPassword = (role: StableRoleAccountRole, password: string) => {
  const parsed = roleAccountPasswordSchema.safeParse(password);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Configured ${role} seed password is not strong enough: ${issues}`);
  }
};

export const ensureStableRoleAccounts = async (
  storage: RoleAccountStorage,
  options: EnsureStableRoleAccountOptions = {},
) => {
  const env = options.env ?? process.env;
  const hashRounds = options.hashRounds ?? 12;
  const rotateExisting = options.rotateExisting === true;
  const failOnMissingPassword = options.failOnMissingPassword !== false;
  const results: StableRoleAccountResult[] = [];

  for (const account of getStableRoleAccountDefinitions(env)) {
    const password = getConfiguredValue(env, account.passwordEnvNames);
    const existing =
      (await storage.getUserByEmail(account.email)) ||
      (await storage.getUserByUsername(account.username));

    if (existing) {
      if (rotateExisting) {
        if (!password) {
          throw new Error(
            `Cannot rotate ${account.role}; set one of ${account.passwordEnvNames.join(", ")} first.`,
          );
        }
        validateConfiguredPassword(account.role, password);
        const updated = await storage.updateUser(existing.id, {
          password: await bcrypt.hash(password, hashRounds),
          role: account.role,
          isActive: true,
        });
        results.push({
          role: account.role,
          username: updated.username,
          email: updated.email,
          status: "password_rotated",
          passwordChanged: true,
        });
        continue;
      }

      const repair: Partial<InsertUser> = {};
      if (existing.role !== account.role) repair.role = account.role;
      if (existing.isActive === false) repair.isActive = true;

      const user = Object.keys(repair).length > 0
        ? await storage.updateUser(existing.id, repair)
        : existing;

      results.push({
        role: account.role,
        username: user.username,
        email: user.email,
        status: Object.keys(repair).length > 0 ? "metadata_repaired" : "existing_preserved",
        passwordChanged: false,
      });
      continue;
    }

    if (!password) {
      results.push({
        role: account.role,
        username: account.username,
        email: account.email,
        status: "missing_password",
        passwordChanged: false,
        actionRequired: `Set one of ${account.passwordEnvNames.join(", ")} before creating this role account.`,
      });
      continue;
    }

    validateConfiguredPassword(account.role, password);
    const created = await storage.createUser({
      username: account.username,
      email: account.email,
      password: await bcrypt.hash(password, hashRounds),
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
      passwordChanged: true,
    });
  }

  const missing = results.filter((result) => result.status === "missing_password");
  if (missing.length > 0 && failOnMissingPassword) {
    throw new Error(
      `Missing configured passwords for role accounts: ${missing.map((item) => item.role).join(", ")}.`,
    );
  }

  return results;
};
