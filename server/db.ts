import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,  // fail fast if DB unreachable
  idleTimeoutMillis: 10000,
  max: 10,
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
  console.warn("[db] pool error (non-fatal):", err.message);
});

export const db = drizzle(pool, { schema });
