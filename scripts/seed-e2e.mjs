// Seed script for E2E tests
// Creates the exact users and data that http-e2e.mjs expects

import 'dotenv/config';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
const sql = postgres(databaseUrl, { max: 2 });

// Test constants from http-e2e.mjs
const COURSE = '00000000-0000-4000-8000-000000000010';
const BATCH = '00000000-0000-4000-8000-000000000020';
const SUBJECT = '00000000-0000-4000-8000-000000000030';
const STU = '00000000-0000-4000-8000-000000000003';
const STU2 = '00000000-0000-4000-8000-000000000004';
const TEA = '00000000-0000-4000-8000-000000000002';
const ADMIN = '00000000-0000-4000-8000-000000000001';

// IDs used by tests
const TEST_ID = '4f1bd10f-9c2c-4a53-9fde-6223121de29e';
const ASSIGNMENT_ID = 'b743f150-d55b-45f8-ba00-8cb35f842331';
const DOUBT_ID = '5ef12b53-9e0a-4559-be82-425e30546a02';
const MCQ_ANSWER_ID = '0bf35c7a-84a4-44c0-9184-dc33eb0379ef';

async function main() {
  console.log('[seed-e2e] Starting E2E test data seeding...');

  // Clear existing test data first - in correct dependency order
  console.log('[seed-e2e] Clearing existing test data...');
  await sql`
    DELETE FROM public.test_answers WHERE test_id IN (SELECT id FROM public.tests WHERE batch_id = ${BATCH})
  `;
  await sql`
    DELETE FROM public.test_results WHERE test_id IN (SELECT id FROM public.tests WHERE batch_id = ${BATCH})
  `;
  await sql`
    DELETE FROM public.questions WHERE test_id IN (SELECT id FROM public.tests WHERE batch_id = ${BATCH})
  `;
  await sql`
    DELETE FROM public.tests WHERE batch_id = ${BATCH}
  `;
  // Delete ALL assignments for this batch to avoid FK issues
  await sql`
    DELETE FROM public.assignment_submissions WHERE assignment_id IN (SELECT id FROM public.assignments WHERE batch_id = ${BATCH})
  `;
  await sql`
    DELETE FROM public.assignments WHERE batch_id = ${BATCH}
  `;
  // Delete live classes for this batch
  await sql`
    DELETE FROM public.live_classes WHERE batch_id = ${BATCH}
  `;
  // Delete attendance sessions for this batch
  await sql`
    DELETE FROM public.attendance_records WHERE session_id IN (SELECT id FROM public.attendance_sessions WHERE batch_id = ${BATCH})
  `;
  await sql`
    DELETE FROM public.attendance_sessions WHERE batch_id = ${BATCH}
  `;
  // Delete materials for this batch
  await sql`
    DELETE FROM public.materials WHERE batch_id = ${BATCH}
  `;
  // Delete notifications for students in this batch
  await sql`
    DELETE FROM public.notifications WHERE receiver_id IN (SELECT student_id FROM public.batch_students WHERE batch_id = ${BATCH})
  `;
  // Delete doubts for this subject (must be before deleting subject)
  await sql`
    DELETE FROM public.doubt_replies WHERE doubt_id IN (SELECT id FROM public.doubts WHERE subject_id = ${SUBJECT})
  `;
  await sql`
    DELETE FROM public.doubts WHERE subject_id = ${SUBJECT}
  `;
  await sql`
    DELETE FROM public.payments WHERE fee_id IN (SELECT id FROM public.fees WHERE student_id = ${STU})
  `;
  await sql`
    DELETE FROM public.fees WHERE student_id = ${STU}
  `;
  await sql`
    DELETE FROM public.batch_students WHERE batch_id = ${BATCH}
  `;
  await sql`
    DELETE FROM public.batch_teachers WHERE batch_id = ${BATCH}
  `;
  await sql`
    DELETE FROM public.batches WHERE id = ${BATCH}
  `;
  await sql`
    DELETE FROM public.subjects WHERE id = ${SUBJECT}
  `;
  await sql`
    DELETE FROM public.courses WHERE id = ${COURSE}
  `;
// Delete ALL notifications (must be before deleting users)
  await sql`
    DELETE FROM public.notifications
  `;

  // Delete ALL materials (must be before deleting users)
  await sql`
    DELETE FROM public.materials
  `;

  // Delete audit logs
  await sql`
    DELETE FROM public.audit_logs WHERE user_id IN (${ADMIN}, ${TEA}, ${STU}, ${STU2})
  `;

  // Also delete by email in case IDs don't match
  await sql`
    DELETE FROM public.users WHERE email IN ('admin@demo.com', 'teacher@demo.com', 'student@demo.com', 'student2@demo.com')
  `;
  console.log('[seed-e2e] Creating users...');
  await sql.begin(async (tx) => {
    // Admin user
    await tx`
      INSERT INTO public.users (id, name, email, phone, password, role, status, created_at, updated_at)
      VALUES (${ADMIN}, 'Demo Admin', 'admin@demo.com', '+919999999999', 'hashed', 'admin', 'active', now(), now())
    `;
    await tx`
      INSERT INTO public.profiles (supabase_auth_id, user_id, primary_provider)
      VALUES (${ADMIN}, ${ADMIN}, 'email')
    `;

    // Teacher user
    await tx`
      INSERT INTO public.users (id, name, email, phone, password, role, status, created_at, updated_at)
      VALUES (${TEA}, 'Demo Teacher', 'teacher@demo.com', '+919999999998', 'hashed', 'teacher', 'active', now(), now())
    `;
    await tx`
      INSERT INTO public.profiles (supabase_auth_id, user_id, primary_provider)
      VALUES (${TEA}, ${TEA}, 'email')
    `;
    await tx`
      INSERT INTO public.teacher_profiles (user_id, qualification, experience, specialization)
      VALUES (${TEA}, 'M.Ed', 10, 'Mathematics')
    `;

    // Student 1
    await tx`
      INSERT INTO public.users (id, name, email, phone, password, role, status, created_at, updated_at)
      VALUES (${STU}, 'Demo Student', 'student@demo.com', '+919999999997', 'hashed', 'student', 'active', now(), now())
    `;
    await tx`
      INSERT INTO public.profiles (supabase_auth_id, user_id, primary_provider)
      VALUES (${STU}, ${STU}, 'email')
    `;
    await tx`
      INSERT INTO public.student_profiles (user_id, parent_name, parent_phone, address, class, board, date_of_birth, enrollment_date, course_id)
      VALUES (${STU}, 'Parent Name', '+919999999996', '123 Test St', 'Class 11', 'CBSE', '2008-01-01', now(), ${COURSE})
    `;

    // Student 2
    await tx`
      INSERT INTO public.users (id, name, email, phone, password, role, status, created_at, updated_at)
      VALUES (${STU2}, 'Demo Student 2', 'student2@demo.com', '+919999999995', 'hashed', 'student', 'active', now(), now())
    `;
    await tx`
      INSERT INTO public.profiles (supabase_auth_id, user_id, primary_provider)
      VALUES (${STU2}, ${STU2}, 'email')
    `;
    await tx`
      INSERT INTO public.student_profiles (user_id, parent_name, parent_phone, address, class, board, date_of_birth, enrollment_date, course_id)
      VALUES (${STU2}, 'Parent Name 2', '+919999999994', '456 Test St', 'Class 11', 'CBSE', '2008-01-01', now(), ${COURSE})
    `;
  });

  // 2. Create course, batch, subject
  console.log('[seed-e2e] Creating course, batch, subject...');
  await sql.begin(async (tx) => {
    // Course
    await tx`
      INSERT INTO public.courses (id, name, description, class_level, duration, fee, status, created_at, updated_at)
      VALUES (${COURSE}, 'Test Course', 'Test Description', 'Class 11', 12, 30000, 'active', now(), now())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;

    // Subject
    await tx`
      INSERT INTO public.subjects (id, course_id, name, description, "order", created_at)
      VALUES (${SUBJECT}, ${COURSE}, 'Mathematics', 'Math', 1, now())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;

    // Batch
    await tx`
      INSERT INTO public.batches (id, name, course_id, timing, start_date, end_date, status, description, created_at, updated_at)
      VALUES (${BATCH}, 'Test Batch', ${COURSE}, '7 AM', '2026-01-01', '2026-12-31', 'active', 'Test batch', now(), now())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;

    // Batch-Student memberships
    await tx`
      INSERT INTO public.batch_students (id, batch_id, student_id, enrolled_at)
      VALUES (gen_random_uuid(), ${BATCH}, ${STU}, now())
      ON CONFLICT DO NOTHING
    `;
    await tx`
      INSERT INTO public.batch_students (id, batch_id, student_id, enrolled_at)
      VALUES (gen_random_uuid(), ${BATCH}, ${STU2}, now())
      ON CONFLICT DO NOTHING
    `;

    // Batch-Teacher memberships
    await tx`
      INSERT INTO public.batch_teachers (id, batch_id, teacher_id, assigned_at)
      VALUES (gen_random_uuid(), ${BATCH}, ${TEA}, now())
      ON CONFLICT DO NOTHING
    `;
  });

  // 3. Create fee for student
  console.log('[seed-e2e] Creating fee...');
  await sql`
    INSERT INTO public.fees (id, student_id, course_id, total_amount, discount, final_amount, due_date, created_at, updated_at)
    VALUES (gen_random_uuid(), ${STU}, ${COURSE}, 15000, 2000, 13000, '2026-08-31', now(), now())
    ON CONFLICT DO NOTHING
  `;

  // 4. Create test with questions
  console.log('[seed-e2e] Creating test...');
  await sql`
    INSERT INTO public.tests (id, title, description, course_id, subject_id, batch_id, teacher_id, duration, total_marks, passing_marks, status, start_date, end_date, created_at, updated_at)
    VALUES (${TEST_ID}, 'Mock Test', 'unit test', ${COURSE}, ${SUBJECT}, ${BATCH}, ${TEA}, 30, 20, 8, 'published', '2026-08-10', '2026-08-20', now(), now())
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
  `;

  // Create test question
  await sql`
    INSERT INTO public.questions (id, test_id, question_text, question_type, marks, options, correct_answer, "order", created_at)
    VALUES (${MCQ_ANSWER_ID}, ${TEST_ID}, 'What is 2+2?', 'mcq', 2, '["3", "4", "5", "6"]'::jsonb, '4', 1, now())
    ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text
  `;

  // 5. Create assignment
  console.log('[seed-e2e] Creating assignment...');
  await sql`
    INSERT INTO public.assignments (id, title, description, course_id, subject_id, batch_id, teacher_id, due_date, total_marks, created_at, updated_at)
    VALUES (${ASSIGNMENT_ID}, 'Homework 1', 'do it', ${COURSE}, ${SUBJECT}, ${BATCH}, ${TEA}, '2026-09-01', 40, now(), now())
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
  `;

  // 6. Create doubt
  console.log('[seed-e2e] Creating doubt...');
  await sql`
    INSERT INTO public.doubts (id, student_id, subject_id, question, image_url, status, created_at, updated_at)
    VALUES (${DOUBT_ID}, ${STU}, ${SUBJECT}, '<b>How does gravity work?</b>', NULL, 'open', now(), now())
    ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question
  `;

  // 7. Create payment for fee
  console.log('[seed-e2e] Creating payment...');
  const fee = await sql`SELECT id FROM public.fees WHERE student_id = ${STU} LIMIT 1`;
  if (fee.length > 0) {
    await sql`
      INSERT INTO public.payments (id, fee_id, student_id, amount, payment_mode, transaction_id, receipt_number, receipt_url, status, paid_at, recorded_by, notes)
      VALUES (gen_random_uuid(), ${fee[0].id}, ${STU}, 13000, 'upi', 'TXN123', 'R123', NULL, 'paid', now(), ${ADMIN}, 'E2E test payment')
      ON CONFLICT DO NOTHING
    `;
  }

  // 8. Create assignment submission for student
  console.log('[seed-e2e] Creating assignment submission...');
  await sql`
    INSERT INTO public.assignment_submissions (id, assignment_id, student_id, submission_text, submission_url, submitted_at, status, marks_awarded, feedback, graded_at, graded_by)
    VALUES (gen_random_uuid(), ${ASSIGNMENT_ID}, ${STU}, 'Here is my homework', NULL, now(), 'submitted', NULL, NULL, NULL, NULL)
    ON CONFLICT DO NOTHING
  `;

  // 9. Create test submission for student
  console.log('[seed-e2e] Creating test submission...');
  await sql`
    INSERT INTO public.test_results (id, test_id, student_id, marks_obtained, percentage, status, remarks, submitted_at, graded_at, graded_by)
    VALUES (gen_random_uuid(), ${TEST_ID}, ${STU}, 20, 100, 'graded', 'Great work', now(), now(), ${TEA})
    ON CONFLICT DO NOTHING
  `;

  // 10. Create test answer for student
  console.log('[seed-e2e] Creating test answer...');
  await sql`
    INSERT INTO public.test_answers (id, test_id, student_id, question_id, selected_answer, answer_text, marks_awarded, graded_at, graded_by, created_at)
    VALUES (gen_random_uuid(), ${TEST_ID}, ${STU}, ${MCQ_ANSWER_ID}, '4', NULL, 2, now(), ${TEA}, now())
    ON CONFLICT DO NOTHING
  `;

  console.log('[seed-e2e] ✅ E2E test data seeded successfully!');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-e2e] FATAL:', err);
  process.exit(1);
});