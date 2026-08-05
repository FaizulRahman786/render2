-- Migration: 0009 — Structured public site CMS content entities
-- =============================================================================
-- Proper content models for the public website + admin CMS. Every editable
-- content entity carries publication state (draft → published → archived),
-- ordering, audit timestamps and (where relevant) featured flags.
--
-- Single source of truth for institute content; the homepage references these
-- records (featured_ids) instead of duplicating them.

-- ── site_pages ──────────────────────────────────────────────────────────────
-- Long-form CMS pages (Our Story, About…) with JSON blocks for sections.
CREATE TABLE IF NOT EXISTS "site_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "subtitle" text,
  "content" jsonb NOT NULL DEFAULT '{}',
  "cover_image" text,
  "seo_title" text,
  "seo_description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "published_at" timestamp,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "site_pages_status_idx" ON "site_pages" USING btree ("status");
--> statement-breakpoint

-- ── admissions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "admissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session" text NOT NULL,
  "status" text DEFAULT 'upcoming' NOT NULL,
  "title" text,
  "subtitle" text,
  "description" text,
  "opening_date" timestamp,
  "closing_date" timestamp,
  "eligibility" text,
  "documents" jsonb DEFAULT '[]',
  "process" jsonb DEFAULT '[]',
  "programs" jsonb DEFAULT '[]',
  "instructions" text,
  "contact_phone" text,
  "contact_email" text,
  "cta_label" text DEFAULT 'Apply for Admission',
  "cta_url" text,
  "featured" boolean DEFAULT false NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admissions_session_idx" ON "admissions" USING btree ("session");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admissions_status_idx" ON "admissions" USING btree ("cms_status");
--> statement-breakpoint

-- ── fee_structures ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "fee_structures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session" text NOT NULL,
  "class_level" text NOT NULL,
  "admission_fee" numeric(10,2),
  "tuition_fee" numeric(10,2),
  "monthly_fee" numeric(10,2),
  "exam_fee" numeric(10,2),
  "transport_fee" numeric(10,2),
  "other_charges" numeric(10,2),
  "total_fee" numeric(10,2),
  "discount_info" text,
  "notes" text,
  "payment_schedule" text,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_structures_session_idx" ON "fee_structures" USING btree ("session");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fee_structures_status_idx" ON "fee_structures" USING btree ("cms_status");
--> statement-breakpoint

-- ── achievements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "achievements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "category" text DEFAULT 'academic' NOT NULL,
  "achievement_date" timestamp,
  "image_url" text,
  "cloudinary_id" text DEFAULT '',
  "award_organization" text,
  "student_name" text,
  "level" text,
  "featured" boolean DEFAULT false NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "seo_title" text,
  "seo_description" text,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_status_idx" ON "achievements" USING btree ("cms_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_category_idx" ON "achievements" USING btree ("category");
--> statement-breakpoint

-- ── public_results ──────────────────────────────────────────────────────────
-- Privacy-conscious: only display-name data explicitly published by admins.
CREATE TABLE IF NOT EXISTS "public_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session" text,
  "exam" text,
  "class_level" text,
  "student_name" text,
  "rank" text,
  "percentage" numeric(5,2),
  "grade" text,
  "description" text,
  "result_type" text DEFAULT 'top_performer' NOT NULL,
  "display_date" timestamp,
  "featured" boolean DEFAULT false NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_results_status_idx" ON "public_results" USING btree ("cms_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "public_results_type_idx" ON "public_results" USING btree ("result_type");
--> statement-breakpoint

-- ── gallery_items ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "gallery_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text,
  "caption" text,
  "alt_text" text DEFAULT '',
  "image_url" text NOT NULL,
  "cloudinary_id" text DEFAULT '',
  "category" text DEFAULT 'campus' NOT NULL,
  "taken_at" timestamp,
  "featured" boolean DEFAULT false NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_status_idx" ON "gallery_items" USING btree ("cms_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gallery_items_category_idx" ON "gallery_items" USING btree ("category");
--> statement-breakpoint

-- ── reviews ─────────────────────────────────────────────────────────────────
-- Visitor submissions land in 'pending' (moderated). Approved reviews appear
-- only when consent/publication is granted.
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "relationship" text DEFAULT 'student' NOT NULL,
  "rating" integer NOT NULL DEFAULT 5,
  "review" text NOT NULL,
  "profile_image" text,
  "consent" boolean DEFAULT false NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "source" text DEFAULT 'public' NOT NULL,
  "admin_note" text,
  "reviewed_at" timestamp,
  "reviewed_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_status_idx" ON "reviews" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_rating_idx" ON "reviews" USING btree ("rating");
--> statement-breakpoint

-- ── blog_posts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "excerpt" text,
  "content" text NOT NULL,
  "cover_image" text,
  "cloudinary_id" text DEFAULT '',
  "category" text,
  "tags" jsonb DEFAULT '[]',
  "author" text,
  "author_id" uuid,
  "featured" boolean DEFAULT false NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "publish_at" timestamp,
  "published_at" timestamp,
  "seo_title" text,
  "seo_description" text,
  "og_image" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_status_idx" ON "blog_posts" USING btree ("cms_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_category_idx" ON "blog_posts" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_published_idx" ON "blog_posts" USING btree ("published_at");
--> statement-breakpoint

-- ── faqs ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "faqs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "cms_status" text DEFAULT 'draft' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_status_idx" ON "faqs" USING btree ("cms_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faqs_category_idx" ON "faqs" USING btree ("category");
--> statement-breakpoint

-- ── navigation_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "navigation_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" text NOT NULL,
  "href" text NOT NULL,
  "parent_id" uuid,
  "position" integer DEFAULT 0 NOT NULL,
  "visibility" boolean DEFAULT true NOT NULL,
  "target" text DEFAULT 'self' NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "navigation_items_position_idx" ON "navigation_items" USING btree ("position");
--> statement-breakpoint

-- ── homepage_sections ───────────────────────────────────────────────────────
-- Config rows per homepage area. featured_ids reference entity ids from the
-- collection tables (events/achievements/gallery/reviews/posts/programs).
CREATE TABLE IF NOT EXISTS "homepage_sections" (
  "key" text PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "title" text,
  "subtitle" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "cta_label" text,
  "cta_url" text,
  "featured_ids" jsonb DEFAULT '[]',
  "settings" jsonb DEFAULT '{}',
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- ── custom_pages ────────────────────────────────────────────────────────────
-- Admin-uploaded HTML/CSS/JS pages. Metadata lives here; file text lives in
-- custom_page_files; snapshots in custom_page_versions. Always served from an
-- isolated, sandboxed context — never inside the privileged app shell.
CREATE TABLE IF NOT EXISTS "custom_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "page_type" text DEFAULT 'html' NOT NULL,
  "entry_file" text DEFAULT 'index.html' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "seo_title" text,
  "seo_description" text,
  "og_image" text,
  "robots" text DEFAULT 'index,follow' NOT NULL,
  "navigation_label" text,
  "navigation_visibility" boolean DEFAULT false NOT NULL,
  "navigation_position" integer DEFAULT 0 NOT NULL,
  "ack_risks" boolean DEFAULT false NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_pages_status_idx" ON "custom_pages" USING btree ("status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "custom_page_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "custom_pages"("id") ON DELETE CASCADE,
  "path" text NOT NULL,
  "content" text NOT NULL DEFAULT '',
  "kind" text DEFAULT 'html' NOT NULL,
  "size" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "custom_page_files_page_path_idx"
  ON "custom_page_files" USING btree ("page_id", "path");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "custom_page_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "page_id" uuid NOT NULL REFERENCES "custom_pages"("id") ON DELETE CASCADE,
  "version" integer NOT NULL,
  "note" text,
  "snapshot" jsonb NOT NULL,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "custom_page_versions_page_version_idx"
  ON "custom_page_versions" USING btree ("page_id", "version");
--> statement-breakpoint

-- ── events: add public-site fields ──────────────────────────────────────────
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "short_description" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "organizer" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "contact_phone" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "registration_url" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "end_date" timestamp;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "seo_title" text;
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "seo_description" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_unique" ON "events" USING btree ("slug") WHERE "slug" IS NOT NULL;
--> statement-breakpoint

-- ── enquiries: source tracking + wider status vocab ─────────────────────────
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "source_page" text;
--> statement-breakpoint
ALTER TABLE "enquiries" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint

-- ── Seed: default homepage sections (toggles/order/headings/CtAs) ───────────
INSERT INTO "homepage_sections" ("key", "enabled", "title", "subtitle", "sort_order", "cta_label", "cta_url", "featured_ids", "settings") VALUES
  ('hero', true, NULL, NULL, 10, 'Apply for Admission', '/admissions', '[]', '{}'),
  ('announcement', true, NULL, NULL, 20, NULL, NULL, '[]', '{}'),
  ('intro', true, NULL, NULL, 30, NULL, NULL, '[]', '{}'),
  ('stats', true, NULL, NULL, 40, NULL, NULL, '[]', '{}'),
  ('programs', true, 'Our Programs', NULL, 50, 'Explore Programs', '/courses', '[]', '{}'),
  ('admissions', true, 'Admissions Open', NULL, 60, 'View Admission Details', '/admissions', '[]', '{}'),
  ('results', true, NULL, NULL, 70, NULL, NULL, '[]', '{}'),
  ('achievements', true, 'Achievements', NULL, 80, 'View All', '/achievements', '[]', '{}'),
  ('events', true, 'Upcoming Events', NULL, 90, 'View All', '/events', '[]', '{}'),
  ('gallery', true, NULL, NULL, 100, 'View Gallery', '/gallery', '[]', '{}'),
  ('reviews', true, 'What Parents & Students Say', NULL, 110, NULL, NULL, '[]', '{}'),
  ('blog', true, 'Latest News', NULL, 120, 'Read the Blog', '/blog', '[]', '{}'),
  ('contact', true, NULL, NULL, 130, 'Contact Us', '/contact', '[]', '{}')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- ── RLS (defense-in-depth, consistent with prior migrations) ────────────────
ALTER TABLE "site_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "admissions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "fee_structures" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "achievements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "public_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "gallery_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "navigation_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "homepage_sections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "custom_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "custom_page_files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "custom_page_versions" ENABLE ROW LEVEL SECURITY;