import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq, desc, and, or, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireStudent } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import {
  assertStudentCanAccessTest,
  getStudentBatchIds,
  getStudentCourseId,
} from '../services/authorization.js';
import { validate } from '../middleware/validation.js';
import { saveTestAnswersSchema, submitAssignmentSchema, createDoubtSchema, updateProfileSchema } from '../validation/schemas.js';

const router: ExpressRouter = Router();
router.use(authenticate, requireStudent);

// ── Dashboard ──────────────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const studentId = req.user!.id;
  const { sql: sqlFn, count } = await import('drizzle-orm');

  // Get student's batches first (needed for scoped queries)
  const myBatches = await db.select({ batchId: schema.batchStudents.batchId })
    .from(schema.batchStudents).where(eq(schema.batchStudents.studentId, studentId));
  const batchIds = myBatches.map(b => b.batchId);

  // Student's enrolled course (needed to scope materials by course targeting)
  const [myProfile] = await db
    .select({ courseId: schema.studentProfiles.courseId })
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.userId, studentId))
    .limit(1);
  const myCourseId = myProfile?.courseId ?? null;

  // Materials visible to this student: visibility=true AND (
  //   batch targets one of the student's batches OR
  //   course targets the student's enrolled course OR
  //   both course and batch are null (institute-wide))
  const materialScope = and(
    eq(schema.materials.visibility, true),
    or(
      ...(batchIds.length > 0 ? [inArray(schema.materials.batchId, batchIds)] : []),
      ...(myCourseId ? [eq(schema.materials.courseId, myCourseId)] : []),
      and(isNull(schema.materials.batchId), isNull(schema.materials.courseId)),
    ),
  );

  const [recentResults, upcomingClasses, recentMaterials, myFees, upcomingAssignments, openDoubts, availableTests, attendanceSummary] = await Promise.all([
    // Recent graded test results
    db.select({
      id: schema.testResults.id, marksObtained: schema.testResults.marksObtained,
      percentage: schema.testResults.percentage, submittedAt: schema.testResults.submittedAt,
      testTitle: schema.tests.title, totalMarks: schema.tests.totalMarks,
    })
      .from(schema.testResults)
      .leftJoin(schema.tests, eq(schema.testResults.testId, schema.tests.id))
      .where(and(eq(schema.testResults.studentId, studentId), eq(schema.testResults.status, 'graded')))
      .orderBy(desc(schema.testResults.submittedAt))
      .limit(5),

    // Upcoming live classes in my batches
    batchIds.length > 0
      ? db.select({
          id: schema.liveClasses.id, title: schema.liveClasses.title,
          scheduledDate: schema.liveClasses.scheduledDate, scheduledTime: schema.liveClasses.scheduledTime,
          meetingLink: schema.liveClasses.meetingLink, status: schema.liveClasses.status,
          teacherName: schema.users.name, batchName: schema.batches.name,
        })
          .from(schema.liveClasses)
          .leftJoin(schema.users, eq(schema.liveClasses.teacherId, schema.users.id))
          .leftJoin(schema.batches, eq(schema.liveClasses.batchId, schema.batches.id))
          .where(and(eq(schema.liveClasses.status, 'scheduled'), inArray(schema.liveClasses.batchId, batchIds)))
          .orderBy(schema.liveClasses.scheduledDate)
          .limit(5)
      : Promise.resolve([]),

    // Recent materials
    db.select({
      id: schema.materials.id, title: schema.materials.title, fileType: schema.materials.fileType,
      fileName: schema.materials.fileName, fileUrl: schema.materials.fileUrl, createdAt: schema.materials.createdAt,
      uploaderName: schema.users.name,
    })
      .from(schema.materials)
      .leftJoin(schema.users, eq(schema.materials.uploadedBy, schema.users.id))
      .where(materialScope)
      .orderBy(desc(schema.materials.createdAt))
      .limit(5),

    // Fee status
    db.select({ id: schema.fees.id, finalAmount: schema.fees.finalAmount, dueDate: schema.fees.dueDate })
      .from(schema.fees)
      .where(eq(schema.fees.studentId, studentId))
      .limit(1),

    // Upcoming assignments (due in future) I haven't submitted yet
    batchIds.length > 0
      ? db.select({
          id: schema.assignments.id, title: schema.assignments.title,
          dueDate: schema.assignments.dueDate, totalMarks: schema.assignments.totalMarks,
          batchName: schema.batches.name, courseName: schema.courses.name,
        })
          .from(schema.assignments)
          .leftJoin(schema.batches, eq(schema.assignments.batchId, schema.batches.id))
          .leftJoin(schema.courses, eq(schema.assignments.courseId, schema.courses.id))
          .where(and(inArray(schema.assignments.batchId, batchIds), sqlFn`${schema.assignments.dueDate} > NOW()`))
          .orderBy(schema.assignments.dueDate)
          .limit(5)
      : Promise.resolve([]),

    // Open doubts count
    db.select({ total: count() })
      .from(schema.doubts)
      .where(and(eq(schema.doubts.studentId, studentId), eq(schema.doubts.status, 'open'))),

    // Published tests in my batches
    batchIds.length > 0
      ? db.select({ total: count() })
          .from(schema.tests)
          .where(and(inArray(schema.tests.batchId, batchIds), eq(schema.tests.status, 'published')))
      : Promise.resolve([{ total: 0 }]),

    // Attendance summary: present/total sessions in my batches
    batchIds.length > 0
      ? db.select({
          total: count(schema.attendanceRecords.id),
          present: sqlFn<number>`SUM(CASE WHEN ${schema.attendanceRecords.status} = 'present' THEN 1 ELSE 0 END)`,
          late: sqlFn<number>`SUM(CASE WHEN ${schema.attendanceRecords.status} = 'late' THEN 1 ELSE 0 END)`,
        })
          .from(schema.attendanceRecords)
          .innerJoin(schema.attendanceSessions, eq(schema.attendanceRecords.sessionId, schema.attendanceSessions.id))
          .where(and(eq(schema.attendanceRecords.studentId, studentId), inArray(schema.attendanceSessions.batchId, batchIds)))
      : Promise.resolve([{ total: 0, present: 0, late: 0 }]),
  ]);

  // Filter upcoming assignments to exclude already-submitted ones
  let pendingAssignments = upcomingAssignments;
  if (upcomingAssignments.length > 0) {
    const submittedIds = (await db.select({ assignmentId: schema.assignmentSubmissions.assignmentId })
      .from(schema.assignmentSubmissions)
      .where(and(
        eq(schema.assignmentSubmissions.studentId, studentId),
        inArray(schema.assignmentSubmissions.assignmentId, upcomingAssignments.map((a: any) => a.id))
      ))).map(s => s.assignmentId);
    pendingAssignments = upcomingAssignments.filter((a: any) => !submittedIds.includes(a.id));
  }

  const att = attendanceSummary[0] ?? { total: 0, present: 0, late: 0 };
  const attendancePct = Number(att.total) > 0
    ? Math.round((Number(att.present) + Number(att.late)) / Number(att.total) * 100)
    : null;

  // M1: feeStatus must reflect outstanding, not the raw first fee row.
  let feeStatus: any = myFees[0] ?? null;
  if (feeStatus) {
    const [{ total: paidTotal }] = await db
      .select({ total: sqlFn<string>`COALESCE(SUM(${schema.payments.amount}::numeric), 0)::text` })
      .from(schema.payments)
      .where(eq(schema.payments.feeId, feeStatus.id));
    const paid = Number(paidTotal ?? 0);
    const final = Number(feeStatus.finalAmount);
    feeStatus = { ...feeStatus, paid, outstanding: Math.max(final - paid, 0) };
  }

  res.json({
    success: true,
    data: {
      recentResults,
      upcomingClasses,
      recentMaterials,
      feeStatus,
      pendingAssignments,
      openDoubtsCount: Number(openDoubts[0]?.total ?? 0),
      availableTestsCount: Number(availableTests[0]?.total ?? 0),
      attendancePct,
      attendanceSessions: Number(att.total),
      myBatchCount: batchIds.length,
    },
  });
}));

// ── Courses ────────────────────────────────────────────────────────────────
router.get('/courses', asyncHandler(async (req, res) => {
  const studentId = req.user!.id;
  const [profile] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, studentId)).limit(1);
  const batchIds = await getStudentBatchIds(studentId);

  // Membership-derived courses only: from the student's enrolled course plus
  // the courses of every batch they belong to. NO "all active courses" fallback.
  const courseIds = new Set<string>();
  if (profile?.courseId) courseIds.add(profile.courseId);
  if (batchIds.length > 0) {
    const batchCourses = await db
      .select({ courseId: schema.batches.courseId })
      .from(schema.batches)
      .where(inArray(schema.batches.id, batchIds));
    for (const b of batchCourses) {
      if (b.courseId) courseIds.add(b.courseId);
    }
  }

  if (courseIds.size === 0) {
    return res.json({ success: true, data: [] });
  }

  const data = await db.select().from(schema.courses).where(inArray(schema.courses.id, [...courseIds]));
  const subjects = await db
    .select({ id: schema.subjects.id, name: schema.subjects.name, courseId: schema.subjects.courseId })
    .from(schema.subjects)
    .where(inArray(schema.subjects.courseId, [...courseIds]));
  const subjectsByCourse = new Map<string, { id: string; name: string }[]>();
  for (const s of subjects) {
    const list = subjectsByCourse.get(s.courseId) ?? [];
    list.push({ id: s.id, name: s.name });
    subjectsByCourse.set(s.courseId, list);
  }
  const withSubjects = data.map(c => ({ ...c, subjects: subjectsByCourse.get(c.id) ?? [] }));
  res.json({ success: true, data: withSubjects });
}));

// ── Materials ──────────────────────────────────────────────────────────────
router.get('/materials', asyncHandler(async (req, res) => {
  const studentId = req.user!.id;
  const [batchIds, myCourseId] = await Promise.all([
    getStudentBatchIds(studentId),
    getStudentCourseId(studentId),
  ]);

  // SCOPE: visibility=true AND (batch targets student OR course targets student's
  // course OR both course+batch null → institute-wide). No unscoped access.
  const data = await db
    .select({
      id: schema.materials.id, title: schema.materials.title, description: schema.materials.description,
      fileUrl: schema.materials.fileUrl, fileType: schema.materials.fileType, fileName: schema.materials.fileName,
      fileSize: schema.materials.fileSize, createdAt: schema.materials.createdAt,
      courseName: schema.courses.name, uploaderName: schema.users.name,
    })
    .from(schema.materials)
    .leftJoin(schema.courses, eq(schema.materials.courseId, schema.courses.id))
    .leftJoin(schema.users, eq(schema.materials.uploadedBy, schema.users.id))
    .where(and(
      eq(schema.materials.visibility, true),
      or(
        ...(batchIds.length > 0 ? [inArray(schema.materials.batchId, batchIds)] : []),
        ...(myCourseId ? [eq(schema.materials.courseId, myCourseId)] : []),
        and(isNull(schema.materials.batchId), isNull(schema.materials.courseId)),
      ),
    ))
    .orderBy(desc(schema.materials.createdAt));
  res.json({ success: true, data });
}));

// ── Live Classes ───────────────────────────────────────────────────────────
router.get('/live-classes', asyncHandler(async (req, res) => {
  const batchIds = await getStudentBatchIds(req.user!.id);

  // SCOPEED: only classes targeting one of the student's batches.
  const data = await db
    .select({
      id: schema.liveClasses.id, title: schema.liveClasses.title, description: schema.liveClasses.description,
      scheduledDate: schema.liveClasses.scheduledDate, scheduledTime: schema.liveClasses.scheduledTime,
      duration: schema.liveClasses.duration, status: schema.liveClasses.status,
      meetingLink: schema.liveClasses.meetingLink, teacherName: schema.users.name, batchName: schema.batches.name,
    })
    .from(schema.liveClasses)
    .leftJoin(schema.users, eq(schema.liveClasses.teacherId, schema.users.id))
    .leftJoin(schema.batches, eq(schema.liveClasses.batchId, schema.batches.id))
    .where(batchIds.length > 0 ? inArray(schema.liveClasses.batchId, batchIds) : undefined)
    .orderBy(desc(schema.liveClasses.scheduledDate));
  res.json({ success: true, data });
}));

// ── Tests ──────────────────────────────────────────────────────────────────
router.get('/tests', asyncHandler(async (req, res) => {
  const batchIds = await getStudentBatchIds(req.user!.id);
  if (batchIds.length === 0) return res.json({ success: true, data: [] });

  // SCOPEED: published tests in one of the student's batches only.
  const data = await db
    .select({
      id: schema.tests.id, title: schema.tests.title, description: schema.tests.description,
      duration: schema.tests.duration, totalMarks: schema.tests.totalMarks, passingMarks: schema.tests.passingMarks,
      status: schema.tests.status, startDate: schema.tests.startDate, endDate: schema.tests.endDate,
      courseName: schema.courses.name,
    })
    .from(schema.tests)
    .leftJoin(schema.courses, eq(schema.tests.courseId, schema.courses.id))
    .where(and(
      eq(schema.tests.status, 'published'),
      inArray(schema.tests.batchId, batchIds),
    ))
    .orderBy(desc(schema.tests.createdAt));
  res.json({ success: true, data });
}));

// ── Test Questions (for taking a test) ─────────────────────────────────────
router.get('/tests/:testId/questions', asyncHandler(async (req, res) => {
  const testId = String(req.params.testId);
  const studentId = req.user!.id;

  // Batch-membership gate FIRST (404 when the student is not enrolled in the test's batch).
  await assertStudentCanAccessTest(studentId, testId);

  // Only expose questions for a published test within the schedule window.
  const [test] = await db.select({ status: schema.tests.status, startDate: schema.tests.startDate, endDate: schema.tests.endDate })
    .from(schema.tests).where(eq(schema.tests.id, testId)).limit(1);
  if (!test || test.status !== 'published') throw new ApiError(404, 'Test not found');

  const now = new Date();
  if (test.startDate && now < test.startDate) throw new ApiError(400, 'Test is not open yet');
  if (test.endDate && now > test.endDate) throw new ApiError(400, 'Test window has closed');

  // NEVER return correctAnswer in the take-test payload (prevents answer leakage).
  const questions = await db
    .select({
      id: schema.questions.id, questionText: schema.questions.questionText,
      questionType: schema.questions.questionType, marks: schema.questions.marks,
      options: schema.questions.options, order: schema.questions.order,
    })
    .from(schema.questions)
    .where(eq(schema.questions.testId, testId))
    .orderBy(schema.questions.order);
  res.json({ success: true, data: questions });
}));

// ── Submit Test ─────────────────────────────────────────────────────────────
router.post('/tests/:testId/submit', validate(saveTestAnswersSchema), asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const studentId = req.user!.id;
  const testId = String(req.params.testId);

  // 1. Batch-membership gate — 404 if the student is not enrolled in the test's batch.
  await assertStudentCanAccessTest(studentId, testId);

  // 2. Status + schedule window check.
  const [test] = await db.select().from(schema.tests).where(eq(schema.tests.id, testId)).limit(1);
  if (!test || test.status !== 'published') throw new ApiError(404, 'Test not found');
  const now = new Date();
  if (test.startDate && now < test.startDate) throw new ApiError(400, 'Test is not open yet');
  if (test.endDate && now > test.endDate) throw new ApiError(400, 'Test window has closed');

  // 3. No duplicate submission.
  const existing = await db.select().from(schema.testResults)
    .where(and(eq(schema.testResults.testId, testId), eq(schema.testResults.studentId, studentId)))
    .limit(1);
  if (existing.length) throw new ApiError(400, 'Test already submitted');

  // 4. Auto-grade MCQ only. Any subjective question → result stays 'pending'
  //    until a teacher grades it (marks_obtained = 0 meanwhile).
  const questions = await db.select().from(schema.questions).where(eq(schema.questions.testId, testId));
  const answerMap = new Map<string, any>((answers || []).map((a: any) => [a.questionId, a]));
  const hasSubjective = questions.some((q) => q.questionType !== 'mcq');

  let marksObtained = 0;
  for (const q of questions) {
    if (q.questionType === 'mcq') {
      const submitted = answerMap.get(q.id);
      if (submitted && submitted.selectedAnswer === q.correctAnswer) {
        marksObtained += q.marks;
      }
    }
  }

  const status = hasSubjective ? 'pending' : 'graded';
  const percentage = status === 'graded' && test.totalMarks > 0 ? (marksObtained / test.totalMarks) * 100 : 0;

  // 5. Persist result + per-question answers atomically.
  await db.transaction(async (tx) => {
    await tx.insert(schema.testResults).values({
      testId, studentId,
      marksObtained: marksObtained.toString(),
      percentage: percentage.toFixed(2),
      status,
    });
    await tx.insert(schema.testAnswers).values(
      questions.map((q) => {
        const submitted = answerMap.get(q.id);
        const isCorrectMcq = q.questionType === 'mcq' && submitted?.selectedAnswer === q.correctAnswer;
        return {
          testId, studentId, questionId: q.id,
          selectedAnswer: q.questionType === 'mcq' ? (submitted?.selectedAnswer ?? null) : null,
          answerText: q.questionType !== 'mcq' ? (submitted?.answerText ?? submitted?.selectedAnswer ?? null) : null,
          marksAwarded: isCorrectMcq ? q.marks.toString() : null,
        };
      })
    );
  });

  res.status(201).json({
    success: true,
    data: {
      status,
      marksObtained: status === 'graded' ? marksObtained : null,
      totalMarks: test.totalMarks,
      percentage: status === 'graded' ? parseFloat(percentage.toFixed(2)) : null,
      passed: status === 'graded' ? (test.passingMarks ? marksObtained >= test.passingMarks : null) : null,
      awaitingGrading: status === 'pending',
    },
  });
}));

// ── Results ────────────────────────────────────────────────────────────────
router.get('/results', asyncHandler(async (req, res) => {
  const data = await db
    .select({
      id: schema.testResults.id, marksObtained: schema.testResults.marksObtained,
      percentage: schema.testResults.percentage, status: schema.testResults.status,
      remarks: schema.testResults.remarks, submittedAt: schema.testResults.submittedAt,
      testTitle: schema.tests.title, totalMarks: schema.tests.totalMarks, passingMarks: schema.tests.passingMarks,
      courseName: schema.courses.name,
    })
    .from(schema.testResults)
    .leftJoin(schema.tests, eq(schema.testResults.testId, schema.tests.id))
    .leftJoin(schema.courses, eq(schema.tests.courseId, schema.courses.id))
    .where(eq(schema.testResults.studentId, req.user!.id))
    .orderBy(desc(schema.testResults.submittedAt));
  res.json({ success: true, data });
}));

// ── Assignments ────────────────────────────────────────────────────────────
router.get('/assignments', asyncHandler(async (req, res) => {
  const data = await db
    .select({
      id: schema.assignments.id, title: schema.assignments.title, description: schema.assignments.description,
      dueDate: schema.assignments.dueDate, totalMarks: schema.assignments.totalMarks, createdAt: schema.assignments.createdAt,
      teacherName: schema.users.name, courseName: schema.courses.name,
      submissionId: schema.assignmentSubmissions.id,
      submissionStatus: schema.assignmentSubmissions.status,
      marksAwarded: schema.assignmentSubmissions.marksAwarded,
    })
    .from(schema.assignments)
    .leftJoin(schema.users, eq(schema.assignments.teacherId, schema.users.id))
    .leftJoin(schema.courses, eq(schema.assignments.courseId, schema.courses.id))
    .leftJoin(schema.assignmentSubmissions, and(
      eq(schema.assignmentSubmissions.assignmentId, schema.assignments.id),
      eq(schema.assignmentSubmissions.studentId, req.user!.id)
    ))
    .orderBy(desc(schema.assignments.dueDate));
  res.json({ success: true, data });
}));

router.post('/assignments/:id/submit', validate(submitAssignmentSchema), asyncHandler(async (req, res) => {
  const assignmentId = String(req.params.id);
  const { submissionText, submissionUrl } = req.body;
  if (!submissionText && !submissionUrl) throw new ApiError(400, 'submissionText or submissionUrl is required');
  if (submissionText && submissionText.length > 10000) throw new ApiError(400, 'submissionText must not exceed 10000 characters');
  const existing = await db.select().from(schema.assignmentSubmissions)
    .where(and(eq(schema.assignmentSubmissions.assignmentId, assignmentId), eq(schema.assignmentSubmissions.studentId, req.user!.id)))
    .limit(1);
  if (existing.length) {
    throw new ApiError(400, 'Assignment already submitted');
  }
  await db.insert(schema.assignmentSubmissions).values({
    assignmentId, studentId: req.user!.id, submissionText, submissionUrl,
  });
  res.json({ success: true, message: 'Assignment submitted' });
}));

// ── Doubts (N+1 fixed) ─────────────────────────────────────────────────────
router.get('/doubts', asyncHandler(async (req, res) => {
  const doubts = await db
    .select({
      id: schema.doubts.id, studentId: schema.doubts.studentId,
      subjectId: schema.doubts.subjectId, question: schema.doubts.question,
      imageUrl: schema.doubts.imageUrl, status: schema.doubts.status,
      createdAt: schema.doubts.createdAt, updatedAt: schema.doubts.updatedAt,
      subjectName: schema.subjects.name,
    })
    .from(schema.doubts)
    .leftJoin(schema.subjects, eq(schema.doubts.subjectId, schema.subjects.id))
    .where(eq(schema.doubts.studentId, req.user!.id))
    .orderBy(desc(schema.doubts.createdAt));

  if (!doubts.length) return res.json({ success: true, data: [] });

  // Fix N+1: fetch all replies in one query, then group by doubtId
  const doubtIds = doubts.map(d => d.id);
  const allReplies = await db
    .select({
      id: schema.doubtReplies.id, doubtId: schema.doubtReplies.doubtId,
      reply: schema.doubtReplies.reply, createdAt: schema.doubtReplies.createdAt,
      teacherName: schema.users.name,
    })
    .from(schema.doubtReplies)
    .leftJoin(schema.users, eq(schema.doubtReplies.teacherId, schema.users.id))
    .where(inArray(schema.doubtReplies.doubtId, doubtIds));

  const repliesByDoubt = new Map<string, typeof allReplies>();
  for (const reply of allReplies) {
    const list = repliesByDoubt.get(reply.doubtId) ?? [];
    list.push(reply);
    repliesByDoubt.set(reply.doubtId, list);
  }

  const withReplies = doubts.map(d => ({ ...d, replies: repliesByDoubt.get(d.id) ?? [] }));
  res.json({ success: true, data: withReplies });
}));

router.post('/doubts', validate(createDoubtSchema), asyncHandler(async (req, res) => {
  const { question, subjectId } = req.body;
  if (!question || typeof question !== 'string') throw new ApiError(400, 'question is required');
  if (question.trim().length < 10) throw new ApiError(400, 'question must be at least 10 characters');
  if (question.length > 2000) throw new ApiError(400, 'question must not exceed 2000 characters');
  const [doubt] = await db.insert(schema.doubts).values({ studentId: req.user!.id, subjectId, question: question.trim() }).returning();
  res.status(201).json({ success: true, data: doubt });
}));

// ── Fees ───────────────────────────────────────────────────────────────────
router.get('/fees', asyncHandler(async (req, res) => {
  const [feesData, paymentsData] = await Promise.all([
    db.select({
      id: schema.fees.id, totalAmount: schema.fees.totalAmount, discount: schema.fees.discount,
      finalAmount: schema.fees.finalAmount, dueDate: schema.fees.dueDate, createdAt: schema.fees.createdAt,
      courseName: schema.courses.name,
    })
      .from(schema.fees)
      .leftJoin(schema.courses, eq(schema.fees.courseId, schema.courses.id))
      .where(eq(schema.fees.studentId, req.user!.id)),
    db.select()
      .from(schema.payments)
      .where(eq(schema.payments.studentId, req.user!.id))
      .orderBy(desc(schema.payments.paidAt)),
  ]);

  // M1: per-fee paid/outstanding derived from persisted payments (never client math).
  const paidByFee = new Map<string, number>();
  for (const p of paymentsData) {
    paidByFee.set(p.feeId, (paidByFee.get(p.feeId) ?? 0) + Number(p.amount));
  }
  const fees = feesData.map((f) => {
    const paid = paidByFee.get(f.id) ?? 0;
    const final = Number(f.finalAmount);
    return { ...f, paid, outstanding: Math.max(final - paid, 0) };
  });

  res.json({ success: true, data: { fees, payments: paymentsData } });
}));

// ── Profile ────────────────────────────────────────────────────────────────
router.get('/fees/:feeId/receipt', asyncHandler(async (req, res) => {
  const feeId = String(req.params.feeId);
  const studentId = req.user!.id;
  const [fee] = await db
    .select({
      id: schema.fees.id, totalAmount: schema.fees.totalAmount, discount: schema.fees.discount,
      finalAmount: schema.fees.finalAmount, dueDate: schema.fees.dueDate, createdAt: schema.fees.createdAt,
      courseName: schema.courses.name, studentName: schema.users.name, studentEmail: schema.users.email,
    })
    .from(schema.fees)
    .leftJoin(schema.courses, eq(schema.fees.courseId, schema.courses.id))
    .leftJoin(schema.users, eq(schema.fees.studentId, schema.users.id))
    .where(and(eq(schema.fees.id, feeId), eq(schema.fees.studentId, studentId)))
    .limit(1);
  if (!fee) throw new ApiError(404, 'Fee not found');

  const payments = await db
    .select()
    .from(schema.payments)
    .where(and(eq(schema.payments.feeId, feeId), eq(schema.payments.studentId, studentId)))
    .orderBy(desc(schema.payments.paidAt));
  res.json({ success: true, data: { fee, payments } });
}));

router.get('/profile', asyncHandler(async (req, res) => {
  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone, profileImage: schema.users.profileImage, status: schema.users.status, createdAt: schema.users.createdAt })
    .from(schema.users).where(eq(schema.users.id, req.user!.id)).limit(1);
  const [profile] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.userId, req.user!.id)).limit(1);
  res.json({ success: true, data: { ...user, profile } });
}));

router.put('/profile', validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const { name, phone, address, parentName, parentPhone, class: studentClass, board } = req.body;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      throw new ApiError(400, 'name must be between 2 and 100 characters');
    }
  }
  if (phone !== undefined && phone !== null) {
    const phoneStr = String(phone).trim();
    if (phoneStr && !/^\+?[\d\s\-().]{7,20}$/.test(phoneStr)) {
      throw new ApiError(400, 'Invalid phone number format');
    }
  }
  if (parentName !== undefined && String(parentName).length > 100) {
    throw new ApiError(400, 'parentName must not exceed 100 characters');
  }
  if (address !== undefined && String(address).length > 500) {
    throw new ApiError(400, 'address must not exceed 500 characters');
  }
  if (studentClass !== undefined && String(studentClass).length > 50) {
    throw new ApiError(400, 'class must not exceed 50 characters');
  }
  if (board !== undefined && String(board).length > 50) {
    throw new ApiError(400, 'board must not exceed 50 characters');
  }

  const userUpdates: any = { updatedAt: new Date() };
  if (name !== undefined) userUpdates.name = String(name).trim();
  if (phone !== undefined) userUpdates.phone = phone ?? undefined;

  await db.update(schema.users).set(userUpdates).where(eq(schema.users.id, req.user!.id));
  await db.update(schema.studentProfiles)
    .set({
      address: address !== undefined ? address : undefined,
      parentName: parentName !== undefined ? parentName : undefined,
      parentPhone: parentPhone !== undefined ? parentPhone : undefined,
      class: studentClass !== undefined ? studentClass : undefined,
      board: board !== undefined ? board : undefined,
    })
    .where(eq(schema.studentProfiles.userId, req.user!.id));

  res.json({ success: true, message: 'Profile updated' });
}));

export default router;
