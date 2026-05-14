import "dotenv/config"; // must be first
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
const isDevelopment = process.env.NODE_ENV !== "production";
const connectionString =
  (isDevelopment ? process.env.DATABASE_URL_UNPOOLED : undefined) ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to start the server.");
}

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  max: isDevelopment ? 5 : 10,
});
export const db = drizzle({ client: pool, schema });

const startupSchemaQueries = [
  `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "likes" integer DEFAULT 0;`,
  `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0;`,
  `ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "student_count" integer;`,
  `ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "programs" jsonb;`,
  `CREATE TABLE IF NOT EXISTS "saved_items" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "type" varchar(50) NOT NULL,
    "reference_id" integer NOT NULL,
    "notes" text,
    "created_at" timestamp DEFAULT now()
  );`,
  `CREATE TABLE IF NOT EXISTS "messages" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" varchar(255) NOT NULL,
    "phone" varchar(20),
    "subject" text,
    "message" text NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now()
  );`,
];

let schemaEnsured = false;

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;

  for (const query of startupSchemaQueries) {
    await pool.query(query);
  }

  schemaEnsured = true;
}
