-- Migration: 0004 — soft delete for users
-- Administrative deletes must NEVER hard-delete: results, fees, attendance,
-- submissions and doubts reference users. Deletion deactivates the account
-- (status = 'inactive') and stamps deleted_at / deleted_by instead.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
