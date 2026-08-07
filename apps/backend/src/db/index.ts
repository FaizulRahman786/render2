// ============================================
// DATABASE CONNECTION — postgres.js + Drizzle
// ============================================
// Driver:  postgres.js  (Supabase-recommended)
// ORM:     Drizzle ORM  (drizzle-orm/postgres-js)
// DB:      Supabase PostgreSQL (transaction pooler on port 6543)
//
// Two URLs are used:
//   DATABASE_URL  → transaction pooler (runtime, port 6543)
//   DIRECT_URL    → direct connection  (migrations only, port 5432)
//
// The client is a singleton to avoid exhausting the connection pool.

import '../config/env.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// ── SSL Detection ───────────────────────────────────────────────────────────
// Enable SSL for known cloud database providers. Do NOT force it for local
// PostgreSQL or Docker, which may not have TLS configured.
function resolveSSL(url: string): postgres.Options<Record<string, postgres.PostgresType>>['ssl'] {
  try {
    const { hostname } = new URL(url);
    const isCloud =
      hostname.endsWith('.supabase.com') ||   // Supabase transaction pooler
      hostname.endsWith('.supabase.co') ||    // Supabase direct connection
      hostname.endsWith('.neon.tech') ||      // Neon
      hostname.endsWith('.render.com') ||     // Render
      hostname.endsWith('.railway.app') ||    // Railway
      hostname.endsWith('.amazonaws.com') ||  // AWS RDS
      hostname.endsWith('.azure.com') ||      // Azure
      hostname.endsWith('.cockroachlabs.cloud'); // CockroachDB Cloud
    return isCloud ? { rejectUnauthorized: false } : false;
  } catch {
    // Malformed URL — fail open so startup error is clear from postgres.js
    return false;
  }
}

// postgres.js client — configured for Supabase transaction pooler.
// prepare: false is required when using PgBouncer in transaction mode (Supabase pooler).
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: resolveSSL(process.env.DATABASE_URL),
  max: 10,
  idle_timeout: 60,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });
export { schema };

// Expose the raw client so database.ts can close it on shutdown
export { client as postgresClient };
