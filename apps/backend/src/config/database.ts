// ============================================
// DATABASE LIFECYCLE MANAGEMENT
// ============================================
// Runtime migrations (CREATE TABLE / ALTER TABLE / CREATE INDEX) have been
// REMOVED from this file. All schema changes must go through:
//
//   1. Edit apps/backend/src/db/schema.ts
//   2. pnpm db:generate          (drizzle-kit generate → supabase/migrations/)
//   3. npx supabase db push      (apply to Supabase PostgreSQL)
//
// This file only manages connection health-check and graceful shutdown.

import { postgresClient } from '../db/index.js';

export let isDbConnected = false;

/**
 * Verify the database connection at startup.
 * Uses the already-initialized postgres.js client singleton.
 */
export async function connectDatabase(): Promise<void> {
  try {
    // postgres.js is lazy — it doesn't connect until the first query.
    // Run a lightweight probe to surface connection errors at startup.
    await postgresClient`SELECT 1`;
    isDbConnected = true;
    console.log('✅ Supabase PostgreSQL connected successfully (postgres.js)');
  } catch (error) {
    isDbConnected = false;
    console.warn(
      '⚠️  Database unavailable, continuing in degraded mode:',
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Gracefully close the postgres.js client.
 * Called on SIGTERM / SIGINT to drain in-flight requests before exiting.
 */
export async function disconnectDatabase(): Promise<void> {
  await postgresClient.end({ timeout: 5 });
}
