-- Migration: 0007 — Public website CMS + media library
-- =============================================================================
-- Adds the data layer for the public website and admin CMS:
--   1) notices     — public announcements with audience/priority/draft-publish/
--                    schedule/expiry (draft → published → archived lifecycle).
--   2) events      — public events with date/time/location/banner + status.
--   3) enquiries   — contact-form submissions from the public site (admin inbox).
--   4) media_assets— Cloudinary media library metadata (alt text, dimensions,
--                    usage-safe deletion via reference checks).
-- CMS site content (hero/homepage/seo/social/footer) lives in the existing
-- `settings` key/value table as JSON payloads (draft + live keys), reusing the
-- established settings architecture instead of adding a parallel store.

-- ── notices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "attachment_url" text,
  "audience" text DEFAULT 'everyone' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "publish_at" timestamp,
  "expire_at" timestamp,
  "published_at" timestamp,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notices_status_idx" ON "notices" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notices_publish_at_idx" ON "notices" USING btree ("publish_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notices_audience_idx" ON "notices" USING btree ("audience");

-- ── events ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "event_date" date NOT NULL,
  "start_time" text,
  "end_time" text,
  "location" text,
  "banner_url" text,
  "cloudinary_id" text DEFAULT '',
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_event_date_idx" ON "events" USING btree ("event_date");

-- ── enquiries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "enquiries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_status_idx" ON "enquiries" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");

-- ── media_assets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "media_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "public_id" text NOT NULL UNIQUE,
  "url" text NOT NULL,
  "resource_type" text DEFAULT 'image' NOT NULL,
  "format" text,
  "bytes" integer,
  "width" integer,
  "height" integer,
  "alt_text" text DEFAULT '',
  "uploaded_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_resource_type_idx" ON "media_assets" USING btree ("resource_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");

-- ── RLS (defense-in-depth, consistent with 0005/0006) ───────────────────────
-- Runtime DB access is the Express API; RLS policies protect against any
-- direct PostgREST/anon access. Public content is only served by the API.
ALTER TABLE "notices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "enquiries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
