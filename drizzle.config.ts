import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Two separate URLs per Drizzle + Supabase official docs:
//
//   DATABASE_URL  → Supabase Transaction Pooler (port 6543)
//                   Used at runtime by the Express backend.
//                   Required: pgBouncer=true / prepare=false
//
//   DIRECT_URL    → Direct PostgreSQL connection (port 5432)
//                   Used by drizzle-kit for schema introspection & migrations.
//                   NOT used at runtime.
//
// Format:
//   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
//   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

if (!process.env.DIRECT_URL) {
  throw new Error(
    'DIRECT_URL is required for drizzle-kit (direct Supabase connection on port 5432). ' +
    'Set it in your .env file. See .env.example for the format.'
  );
}

export default defineConfig({
  schema: './apps/backend/src/db/schema.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // drizzle-kit uses the direct connection (not the pooler)
    url: process.env.DIRECT_URL!,
  },
  // Output migrations into supabase/migrations/ so Supabase CLI can pick them up
  verbose: true,
  strict: true,
});
