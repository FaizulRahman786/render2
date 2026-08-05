-- Migration: 0006 — test_answers table + data integrity
-- =============================================================================
-- 1) test_answers — per-student per-question persistence for a test attempt.
--    MCQ answers are auto-graded at submission (marks_awarded set for correct
--    answers); subjective (short/long) answers remain null until a teacher
--    grades them via GET /teacher/tests/:id/submissions + PATCH .../grade.
--    Referenced by apps/backend/src/db/schema.ts (testAnswers) and the
--    student submit / teacher grading endpoints.
-- 2) Unique batch memberships — prevents duplicate (batch, student) /
--    (batch, teacher) rows that would corrupt scope-based authorization.

-- ── test_answers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "test_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "test_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "selected_answer" text,
  "answer_text" text,
  "marks_awarded" numeric(10, 2),
  "graded_at" timestamp,
  "graded_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_test_id_tests_id_fk"
  FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_student_id_users_id_fk"
  FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_question_id_questions_id_fk"
  FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_graded_by_users_id_fk"
  FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "test_answers_test_id_idx" ON "test_answers" USING btree ("test_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_answers_student_id_idx" ON "test_answers" USING btree ("student_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_answers_question_id_idx" ON "test_answers" USING btree ("question_id");
--> statement-breakpoint

ALTER TABLE "test_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Students may read their own answers; teachers read answers for tests they own.
DROP POLICY IF EXISTS "test_answers_select_own" ON "test_answers";
--> statement-breakpoint
CREATE POLICY "test_answers_select_own"
  ON "test_answers"
  FOR SELECT
  USING (
    student_id = public.current_app_user_id()
    OR public.current_app_user_role() = 'teacher'
       AND test_id IN (SELECT t.id FROM tests t WHERE t.teacher_id = public.current_app_user_id())
  );

-- ── Batch membership uniqueness ─────────────────────────────────────────────
-- Defensive de-duplication first (keep the earliest enrolment/assignment),
-- then enforce uniqueness so authorization lookups (services/authorization.ts)
-- can never be ambiguous.
--> statement-breakpoint
DELETE FROM "batch_students" a
  USING "batch_students" b
  WHERE a."batch_id" = b."batch_id"
    AND a."student_id" = b."student_id"
    AND a."id" <> b."id"
    AND a."enrolled_at" > b."enrolled_at";
--> statement-breakpoint
DELETE FROM "batch_teachers" a
  USING "batch_teachers" b
  WHERE a."batch_id" = b."batch_id"
    AND a."teacher_id" = b."teacher_id"
    AND a."id" <> b."id"
    AND a."assigned_at" > b."assigned_at";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "batch_students_batch_student_unique"
  ON "batch_students" USING btree ("batch_id", "student_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "batch_teachers_batch_teacher_unique"
  ON "batch_teachers" USING btree ("batch_id", "teacher_id");