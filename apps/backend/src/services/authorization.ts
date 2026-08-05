// ============================================
// CENTRAL AUTHORIZATION SERVICE
// ============================================
// Single source of truth for object-level access decisions ("can THIS user
// access THIS object?"). All student/teacher IDOR-sensitive routes must use
// these helpers instead of inline, per-route checks.
//
// Rules:   
//   - Fail closed: unknown → denied.
//   - 404 over 403 where object existence is sensitive (tests, materials,
//     live classes, doubts) to prevent IDOR enumeration.
//   - Each primitive is independently unit-testable (no HTTP coupling).
//
// NOTE: These helpers query the domain schema directly. The Express API is
// the security boundary; RLS is defense-in-depth (see SECURITY.md).

import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { ApiError } from '../middleware/error.js';

// ── Primitives ────────────────────────────────────────────────────────────

/** Batch ids a student is enrolled in. Empty array when none. */
export async function getStudentBatchIds(studentId: string): Promise<string[]> {
  const rows = await db
    .select({ batchId: schema.batchStudents.batchId })
    .from(schema.batchStudents)
    .where(eq(schema.batchStudents.studentId, studentId));
  return rows.map((r) => r.batchId);
}

/** Batch ids a teacher is assigned to. Empty array when none. */
export async function getTeacherBatchIds(teacherId: string): Promise<string[]> {
  const rows = await db
    .select({ batchId: schema.batchTeachers.batchId })
    .from(schema.batchTeachers)
    .where(eq(schema.batchTeachers.teacherId, teacherId));
  return rows.map((r) => r.batchId);
}

/** Course id from the student's profile, or null when unassigned. */
export async function getStudentCourseId(studentId: string): Promise<string | null> {
  const [profile] = await db
    .select({ courseId: schema.studentProfiles.courseId })
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.userId, studentId))
    .limit(1);
  return profile?.courseId ?? null;
}

/**
 * True when the teacher is assigned to the given batch.
 * Unknown batch id → false (fail closed).
 */
export async function teacherInBatch(teacherId: string, batchId: string): Promise<boolean> {
  const [membership] = await db
    .select({ id: schema.batchTeachers.id })
    .from(schema.batchTeachers)
    .where(and(
      eq(schema.batchTeachers.teacherId, teacherId),
      eq(schema.batchTeachers.batchId, batchId),
    ))
    .limit(1);
  return Boolean(membership);
}

/**
 * True when teacher and student share at least one batch.
 * A teacher with no batches can never pass (fail closed).
 */
export async function teacherAndStudentShareBatch(
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const teacherBatchIds = await getTeacherBatchIds(teacherId);
  if (teacherBatchIds.length === 0) return false;

  const [membership] = await db
    .select({ id: schema.batchStudents.id })
    .from(schema.batchStudents)
    .where(and(
      eq(schema.batchStudents.studentId, studentId),
      inArray(schema.batchStudents.batchId, teacherBatchIds),
    ))
    .limit(1);
  return Boolean(membership);
}

// ── Assertions (fail-closed, throw ApiError) ──────────────────────────────

/** 403 unless the student belongs to the batch. */
export async function assertStudentOfBatch(studentId: string, batchId: string): Promise<void> {
  const studentBatchIds = await getStudentBatchIds(studentId);
  if (!studentBatchIds.includes(batchId)) {
    throw new ApiError(403, 'You do not have access to this batch');
  }
}

/** 403 unless the teacher is assigned to the batch. */
export async function assertTeacherOfBatch(teacherId: string, batchId: string): Promise<void> {
  const ok = await teacherInBatch(teacherId, batchId);
  if (!ok) {
    throw new ApiError(403, 'You are not a teacher of this batch');
  }
}

/** 403 unless teacher and student share a batch. */
export async function assertTeacherCanAccessStudent(
  teacherId: string,
  studentId: string,
): Promise<void> {
  const ok = await teacherAndStudentShareBatch(teacherId, studentId);
  if (!ok) {
    throw new ApiError(403, 'You do not have access to this student');
  }
}

/**
 * 404 unless the doubt exists AND the doubt's student shares a batch with the
 * teacher. 404 (not 403) so doubt ids cannot be enumerated.
 */
export async function assertTeacherCanAccessDoubt(
  teacherId: string,
  doubtId: string,
): Promise<void> {
  const [doubt] = await db
    .select({ studentId: schema.doubts.studentId })
    .from(schema.doubts)
    .where(eq(schema.doubts.id, doubtId))
    .limit(1);
  if (!doubt) throw new ApiError(404, 'Doubt not found');

  const ok = await teacherAndStudentShareBatch(teacherId, doubt.studentId);
  if (!ok) throw new ApiError(404, 'Doubt not found');
}

/**
 * 404 unless the test exists AND is owned by the teacher.
 * Admins may bypass ownership (institute-wide visibility).
 */
export async function assertTeacherOwnsTest(
  teacherId: string,
  testId: string,
  bypassForAdmin = false,
  requesterRole?: string,
): Promise<void> {
  if (bypassForAdmin && requesterRole === 'admin') return;

  const [test] = await db
    .select({ teacherId: schema.tests.teacherId })
    .from(schema.tests)
    .where(eq(schema.tests.id, testId))
    .limit(1);
  if (!test) throw new ApiError(404, 'Test not found');
  if (test.teacherId !== teacherId) throw new ApiError(404, 'Test not found');
}

/**
 * 404 unless the test exists AND the student is enrolled in the test's batch.
 * Batch-membership only — callers layer status/schedule-window checks.
 */
export async function assertStudentCanAccessTest(
  studentId: string,
  testId: string,
): Promise<void> {
  const [test] = await db
    .select({ batchId: schema.tests.batchId })
    .from(schema.tests)
    .where(eq(schema.tests.id, testId))
    .limit(1);
  if (!test || !test.batchId) throw new ApiError(404, 'Test not found');

  const studentBatchIds = await getStudentBatchIds(studentId);
  if (!studentBatchIds.includes(test.batchId)) {
    throw new ApiError(404, 'Test not found');
  }
}

/**
 * 404 unless the material exists AND is visible to the student.
 * Visibility model: `visibility = true` AND (
 *   batch targets one of the student's batches, OR
 *   course targets the student's course, OR
 *   both course and batch are null (institute-wide)).
 */
export async function assertStudentCanAccessMaterial(
  studentId: string,
  materialId: string,
): Promise<void> {
  const [material] = await db
    .select({
      id: schema.materials.id,
      visibility: schema.materials.visibility,
      batchId: schema.materials.batchId,
      courseId: schema.materials.courseId,
    })
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);
  if (!material) throw new ApiError(404, 'Material not found');
  if (material.visibility !== true) throw new ApiError(404, 'Material not found');

  // Institute-wide material: visible to everyone.
  if (!material.batchId && !material.courseId) return;

  const [studentBatchIds, studentCourseId] = await Promise.all([
    getStudentBatchIds(studentId),
    getStudentCourseId(studentId),
  ]);

  const matchesBatch = material.batchId
    ? studentBatchIds.includes(material.batchId)
    : false;
  const matchesCourse = material.courseId
    ? material.courseId === studentCourseId
    : false;

  if (!matchesBatch && !matchesCourse) {
    throw new ApiError(404, 'Material not found');
  }
}

/** 404 unless the live class exists AND targets one of the student's batches. */
export async function assertStudentCanAccessLiveClass(
  studentId: string,
  classId: string,
): Promise<void> {
  const [liveClass] = await db
    .select({ batchId: schema.liveClasses.batchId })
    .from(schema.liveClasses)
    .where(eq(schema.liveClasses.id, classId))
    .limit(1);
  if (!liveClass) throw new ApiError(404, 'Live class not found');

  const studentBatchIds = await getStudentBatchIds(studentId);
  if (!studentBatchIds.includes(liveClass.batchId)) {
    throw new ApiError(404, 'Live class not found');
  }
}

/**
 * 403 unless every receiver id is a student enrolled in at least one of the
 * teacher's batches. Callers decide whether to invoke for teachers only.
 */
export async function assertRecipientsScopedToTeacher(
  teacherId: string,
  receiverIds: string[],
): Promise<void> {
  if (!receiverIds.length) return;

  const teacherBatchIds = await getTeacherBatchIds(teacherId);
  if (teacherBatchIds.length === 0) {
    throw new ApiError(403, 'You can only notify students in your batches');
  }

  const rows = await db
    .select({ studentId: schema.batchStudents.studentId })
    .from(schema.batchStudents)
    .where(and(
      inArray(schema.batchStudents.studentId, receiverIds),
      inArray(schema.batchStudents.batchId, teacherBatchIds),
    ));

  const authorized = new Set(rows.map((r) => r.studentId));
  for (const receiverId of receiverIds) {
    if (!authorized.has(receiverId)) {
      throw new ApiError(403, 'You can only notify students in your batches');
    }
  }
}
