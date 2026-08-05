-- Migration: 0008 — CMS version history
-- =============================================================================
-- Immutable history of every CMS edit/publish. Each row snapshots the full JSON
-- payload of one section at the moment it was saved, published or restored,
-- giving admins the ability to inspect and roll back past states.
--
-- CMS live content remains in `settings` (no change); this table is an
-- append-only journal keyed by section.

CREATE TABLE IF NOT EXISTS "cms_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "section" text NOT NULL,
  "content" jsonb NOT NULL,
  "action" text NOT NULL DEFAULT 'save',
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cms_versions_section_created_at_idx"
  ON "cms_versions" USING btree ("section", "created_at" DESC);
--> statement-breakpoint
ALTER TABLE "cms_versions" ENABLE ROW LEVEL SECURITY;