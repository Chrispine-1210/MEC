import { pool } from "../server/db";
import { ensureStableRoleAccounts } from "../server/role-accounts";
import { storage } from "../server/storage";

const rotateExisting =
  process.argv.includes("--rotate-existing") ||
  process.env.SEED_ROLE_ROTATE_EXISTING?.toLowerCase() === "true";
const allowMissingPassword = process.argv.includes("--allow-missing-password");

const seed = async () => {
  const results = await ensureStableRoleAccounts(storage, {
    rotateExisting,
    failOnMissingPassword: !allowMissingPassword,
  });

  console.log("[seed] Role accounts processed.");
  console.table(
    results.map(({ role, username, email, status, passwordChanged, actionRequired }) => ({
      role,
      username,
      email,
      status,
      passwordChanged,
      actionRequired: actionRequired || "",
    })),
  );
  console.log("[seed] Passwords were not generated, printed, or written to disk.");
};

seed()
  .catch((error) => {
    console.error("[seed] Failed to seed role accounts:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
