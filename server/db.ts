import "dotenv/config"; // must be first
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
if (process.env.NODE_ENV !== "production") {
  // In local dev, avoid flaky WebSocket connections by sending Pool queries over HTTP.
  neonConfig.poolQueryViaFetch = true;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to start the server.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
