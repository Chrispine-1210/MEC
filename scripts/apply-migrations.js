import 'dotenv/config';
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NO_SSL;
if (!connectionString) {
  console.error('No DATABASE_URL found in environment. Ensure .env is present and contains DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log('Checking DB connection...');
    await pool.query('SELECT 1');
    console.log('Connected. Applying migrations...');

    const queries = [
      `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "likes" integer DEFAULT 0;`,
      `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0;`,
      `ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "student_count" integer;`,
    ];

    for (const q of queries) {
      console.log('Executing:', q);
      await pool.query(q);
      console.log('OK');
    }

    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
