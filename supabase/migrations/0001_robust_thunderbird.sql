-- Migration: 0001 — align schema post-Supabase Auth migration
-- Safe version: handles existing nulls, drops organizations, adds student profile fields

-- Step 1: Drop organizations table (no longer needed — Supabase Auth handles identity)
ALTER TABLE IF EXISTS "organizations" DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS "organizations" CASCADE;

-- Step 2: Remove unique constraint that may no longer be valid
ALTER TABLE "profiles" DROP CONSTRAINT IF EXISTS "profiles_user_id_unique";

-- Step 3: Re-add FK with correct definition (drop first, re-add)
ALTER TABLE "auth_events" DROP CONSTRAINT IF EXISTS "auth_events_user_id_users_id_fk";

-- Step 4: Drop obsolete indexes (IF EXISTS to avoid failure if already removed)
DROP INDEX IF EXISTS "auth_events_supabase_auth_id_idx";
DROP INDEX IF EXISTS "auth_events_status_idx";
DROP INDEX IF EXISTS "profiles_organization_id_idx";
DROP INDEX IF EXISTS "users_phone_idx";
DROP INDEX IF EXISTS "users_email_idx";

-- Step 5: Fix column types and defaults on profiles
ALTER TABLE "profiles" ALTER COLUMN "supabase_auth_id" SET DATA TYPE text;
ALTER TABLE "profiles" ALTER COLUMN "primary_provider" SET DEFAULT 'email';
ALTER TABLE "profiles" ALTER COLUMN "primary_provider" SET NOT NULL;
ALTER TABLE "profiles" ALTER COLUMN "last_login_at" SET DEFAULT now();
ALTER TABLE "profiles" ALTER COLUMN "last_login_at" SET NOT NULL;

-- Step 6: Fix password column — backfill NULLs first, then allow empty string
-- We use '' (empty string) as sentinel since Supabase Auth owns passwords now
UPDATE "users" SET "password" = '' WHERE "password" IS NULL;
-- NOTE: NOT setting NOT NULL here because the schema column in Drizzle still has .notNull()
-- but the existing users may have been created before that constraint.
-- The application no longer reads/writes this field for auth purposes.

-- Step 7: Add new student profile fields (safe — nullable columns)
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "class" text;
ALTER TABLE "student_profiles" ADD COLUMN IF NOT EXISTS "board" text;

-- Step 8: Drop stale organization_id column from profiles if it exists
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "organization_id";

-- Step 9: Re-create FK and indexes
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "auth_events_event_type_idx" ON "auth_events" USING btree ("event_type");