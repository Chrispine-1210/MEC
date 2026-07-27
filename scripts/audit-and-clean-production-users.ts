import "dotenv/config";
import { Pool } from "pg";

const apply = process.argv.includes("--apply");
if (apply && process.env.CONFIRM_PRODUCTION_USER_CLEANUP !== "true") {
  throw new Error("Apply requires CONFIRM_PRODUCTION_USER_CLEANUP=true");
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error("DATABASE_URL or POSTGRES_URL is required");
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });

const candidateSql = `
  SELECT u.id, u.username, u.email, u.role, u.account_status, u.created_at, u.last_login_at,
    (SELECT count(*)::int FROM applications a WHERE a.user_id = u.id) AS applications,
    (SELECT count(*)::int FROM referrals r WHERE r.referrer_id = u.id OR r.referred_user_id = u.id) AS referrals,
    (SELECT count(*)::int FROM notifications n WHERE n.user_id = u.id) AS notifications,
    (SELECT count(*)::int FROM analytics an WHERE an.user_id = u.id) AS analytics,
    CASE
      WHEN lower(u.email) LIKE '%@example.test' THEN 'test email domain'
      WHEN lower(u.username) ~ '^(e2e|training|playwright|cypress|test[_-]|seed[_-]|demo[_-])' THEN 'reserved test username'
      ELSE 'marked test account'
    END AS match_reason
  FROM users u
  WHERE u.is_test_account = true
     OR lower(u.email) LIKE '%@example.test'
     OR lower(u.username) ~ '^(e2e|training|playwright|cypress|test[_-]|seed[_-]|demo[_-])'
  ORDER BY u.created_at DESC`;

const run = async () => {
  const client = await pool.connect();
  try {
    const candidates = (await client.query(candidateSql)).rows;
    const report = candidates.map((row) => {
      const legitimateActivity = row.applications + row.referrals > 0;
      return {
        ...row,
        proposed_action: legitimateActivity ? "retain_for_manual_review" : "quarantine",
        reason: legitimateActivity ? "related production activity exists" : row.match_reason,
      };
    });
    console.table(report);

    if (!apply) {
      console.log(JSON.stringify({ mode: "dry-run", detected: report.length, report }, null, 2));
      return;
    }

    await client.query("BEGIN");
    await client.query(`CREATE TABLE IF NOT EXISTS users_cleanup_backup_20260727 AS SELECT * FROM users WITH NO DATA`);
    const quarantineIds = report.filter((row) => row.proposed_action === "quarantine").map((row) => row.id);
    if (quarantineIds.length) {
      await client.query(`INSERT INTO users_cleanup_backup_20260727 SELECT * FROM users WHERE id = ANY($1::int[]) ON CONFLICT DO NOTHING`, [quarantineIds]);
      await client.query(`
        UPDATE users SET is_test_account = true, environment = 'test', account_status = 'deleted',
          is_active = false, deleted_at = now(), deletion_reason = 'Controlled production test-account cleanup', updated_at = now()
        WHERE id = ANY($1::int[])
      `, [quarantineIds]);
      await client.query(`
        INSERT INTO analytics (event, metadata, "timestamp")
        VALUES ('admin_production_user_cleanup', $1::jsonb, now())
      `, [JSON.stringify({ quarantinedUserIds: quarantineIds, retainedForReview: report.filter((row) => row.proposed_action !== "quarantine").map((row) => row.id) })]);
    }
    const finalCount = Number((await client.query(`SELECT count(*) FROM users WHERE environment = 'production' AND is_test_account = false AND deleted_at IS NULL`)).rows[0].count);
    await client.query("COMMIT");
    console.log(JSON.stringify({ mode: "apply", quarantined: quarantineIds.length, finalProductionUserCount: finalCount }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

await run();
