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
