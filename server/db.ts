import "dotenv/config"; // must be first
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor >= 25) {
  throw new Error(
    `Unsupported Node.js runtime ${process.versions.node}. Use Node 20 or 22 LTS for this project.`,
  );
}

if (nodeMajor >= 24) {
  console.warn(
    `[db] Node.js ${process.versions.node} is newer than the supported LTS range for this stack. ` +
      "Use Node 20 or 22 LTS if Neon WebSocket connections behave unexpectedly.",
  );
}

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
