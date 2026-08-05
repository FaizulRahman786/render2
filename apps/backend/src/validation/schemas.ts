// ============================================
// CENTRALIZED INPUT VALIDATION SCHEMAS (Phase H)
// ============================================
// Every high-risk write route validates through `validate(...)` from
// middleware/validation.ts. Enums below mirror apps/backend/src/db/schema.ts
// so a schema/UI drift fails loudly instead of silently corrupting rows.

import { body, param, query } from 'express-validator';
import type { ValidationChain } from 'express-validator';

// ── tiny field builders ─────────────────────────────────────────────────────
const ROLES = ['student', 'teacher', 'admin'];
const USER_STATUS = ['active', 'inactive', 'blocked', 'pending'];
const PAYMENT_MODES = ['cash', 'upi', 'card', 'net_banking', 'other'];
const LIVE_STATUS = ['scheduled', 'live', 'completed', 'cancelled'];
const TEST_STATUS = ['draft', 'published', 'closed'];
const ATTENDANCE = ['present', 'absent', 'late'];

/** Required non-empty trimmed text. */
const reqText = (name: string, max = 500): ValidationChain =>
  body(name)
    .trim()
    .notEmpty()
    .withMessage(`${name} is required`)
    .isLength({ max })
    .withMessage(`${name} exceeds ${max} characters`);

/** Required password: 8–72 chars (Supabase-compatible, never trimmed). */
const reqPass = (name = 'password'): ValidationChain =>
  body(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .isLength({ min: 8, max: 72 })
    .withMessage(`${name} must be between 8 and 72 characters`);

/** Optional trimmed text. */
const optText = (name: string, max = 500): ValidationChain =>
  body(name)
    .optional({ values: 'null' })
    .trim()
    .isLength({ max })
    .withMessage(`${name} exceeds ${max} characters`);

/** Required valid UUID in the body. */
const reqUuid = (name: string): ValidationChain =>
  body(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .isUUID()
    .withMessage(`${name} must be a valid UUID`);

/** Optional UUID in the body (null/''/missing all accepted). */
const optUuid = (name: string): ValidationChain =>
  body(name)
    .optional({ values: 'null' })
    .customSanitizer((v) => (v === '' ? null : v))
    .if((_v, { req }) => req.body[name] != null)
    .isUUID()
    .withMessage(`${name} must be a valid UUID`);

/** UUID path parameter on every mutating route. */
const paramUuid = (name = 'id'): ValidationChain =>
  param(name)
    .isUUID()
    .withMessage(`${name} must be a valid UUID`);

/** Non-negative decimal amount (>= 0, up to 2dp). */
const amount = (name: string, required = true): ValidationChain => {
  const c = body(name)
    .customSanitizer((v) => (v === '' ? null : v));
  return required
    ? c.notEmpty().withMessage(`${name} is required`).isFloat({ min: 0, max: 9999999999 })
    : c.optional({ values: 'null' }).if((v) => v != null).isFloat({ min: 0, max: 9999999999 });
};

/** Optional non-negative integer. */
const optInt = (name: string, min = 0): ValidationChain =>
  body(name)
    .optional({ values: 'null' })
    .customSanitizer((v) => (v === '' ? null : v))
    .if((v) => v != null)
    .isInt({ min })
    .withMessage(`${name} must be an integer >= ${min}`);

/** Optional ISO-8601 date/datetime string. */
const optDate = (name: string): ValidationChain =>
  body(name)
    .optional({ values: 'null' })
    .customSanitizer((v) => (v === '' ? null : v))
    .if((v) => v != null)
    .isISO8601()
    .withMessage(`${name} must be a valid ISO-8601 date`);

/** Required ISO-8601 date/datetime string. */
const reqDate = (name: string): ValidationChain =>
  body(name)
    .notEmpty()
    .withMessage(`${name} is required`)
    .isISO8601()
    .withMessage(`${name} must be a valid ISO-8601 date`);

/** Required enum. */
const reqEnum = (name: string, values: readonly string[]): ValidationChain =>
  body(name)
    .trim()
    .notEmpty()
    .withMessage(`${name} is required`)
    .isIn(values as string[])
    .withMessage(`${name} must be one of: ${values.join(', ')}`);

/** Optional enum. */
const optEnum = (name: string, values: readonly string[]): ValidationChain =>
  body(name)
    .optional({ values: 'null' })
    .customSanitizer((v) => (v === '' ? null : v))
    .if((v) => v != null)
    .trim()
    .isIn(values as string[])
    .withMessage(`${name} must be one of: ${values.join(', ')}`);

// ── AUTH / PROFILE ──────────────────────────────────────────────────────────
export const updateProfileSchema: ValidationChain[] = [
  optText('name', 120),
  optText('phone', 30),
  optText('address', 500),
  optText('parentName', 120),
  optText('parentPhone', 30),
  optText('board', 80),
  optText('qualification', 200),
  optInt('experience'),
];

// ── STUDENTS ────────────────────────────────────────────────────────────────
export const createStudentSchema: ValidationChain[] = [
  reqText('name', 120),
  reqText('email', 200).isEmail().withMessage('email must be valid'),
  reqText('phone', 30),
  reqPass('password'),
  optUuid('courseId'),
  optText('parentName', 120),
  optText('parentPhone', 30),
  optText('address', 500),
  body('role').not().exists().withMessage('role cannot be set on the request'),
];

export const updateStudentSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('name', 120),
  optText('phone', 30),
  optEnum('status', USER_STATUS),
  optUuid('courseId'),
  optText('parentName', 120),
  optText('parentPhone', 30),
  optText('address', 500),
];

export const restoreUserSchema: ValidationChain[] = [paramUuid('id')];

// ── TEACHERS ────────────────────────────────────────────────────────────────
export const createTeacherSchema: ValidationChain[] = [
  reqText('name', 120),
  reqText('email', 200).isEmail(),
  reqText('phone', 30),
  reqPass('password'),
  optText('qualification', 100),
  optInt('experience'),
  optText('specialization', 120),
  body('role').not().exists().withMessage('role cannot be set on the request'),
];

export const updateTeacherSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('name', 120),
  optText('phone', 30),
  optEnum('status', USER_STATUS),
  optText('qualification', 100),
  optInt('experience'),
  optText('specialization', 120),
];

// ── COURSES ─────────────────────────────────────────────────────────────────
const COURSE_STATUS = ['active', 'inactive', 'archived'];
const BATCH_STATUS = ['active', 'inactive', 'completed'];

export const createCourseSchema: ValidationChain[] = [
  reqText('name', 150),
  optText('description', 1000),
  optText('classLevel', 60),
  optInt('duration', 1),
  amount('fee', true),
];

export const updateCourseSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('name', 150),
  optText('description', 1000),
  optText('classLevel', 60),
  optInt('duration', 1),
  amount('fee', false),
  optEnum('status', COURSE_STATUS),
];

// ── BATCHES & MEMBERS ───────────────────────────────────────────────────────
export const createBatchSchema: ValidationChain[] = [
  reqText('name', 150),
  reqUuid('courseId'),
  optText('timing', 100),
  optDate('startDate'),
  optDate('endDate'),
  optText('description', 1000),
];

export const updateBatchSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('name', 150),
  optText('timing', 100),
  optDate('startDate'),
  optDate('endDate'),
  optText('description', 1000),
  optEnum('status', BATCH_STATUS),
];

export const addBatchTeacherSchema: ValidationChain[] = [
  paramUuid('id'),
  reqUuid('teacherId'),
];

export const addBatchStudentSchema: ValidationChain[] = [
  paramUuid('id'),
  reqUuid('studentId'),
];

// ── MATERIALS ───────────────────────────────────────────────────────────────
export const createMaterialSchema: ValidationChain[] = [
  reqText('title', 200),
  optText('description', 1000),
  // fileUrl may be an absolute URL (external link) OR a stored /api/uploads
  // path returned by the upload endpoint — a strict isURL() would break the
  // upload → attach flow.
  body('fileUrl')
    .trim()
    .notEmpty()
    .withMessage('fileUrl is required')
    .isLength({ max: 500 })
    .withMessage('fileUrl exceeds 500 characters')
    .custom((v: string) => /^(https?:\/\/|\/)/.test(v))
    .withMessage('fileUrl must be an absolute URL or a /api/uploads path'),
  reqEnum('fileType', ['pdf', 'image', 'video', 'document', 'other']),
  reqText('fileName', 255),
  optInt('fileSize'),
  optText('cloudinaryId', 200),
  optUuid('courseId'),
  optUuid('subjectId'),
  optUuid('batchId'),
  body('visibility').optional()
    .isBoolean()
    .withMessage('visibility must be a boolean'),
];

// ── TESTS / QUESTIONS ───────────────────────────────────────────────────────
export const createTestSchema: ValidationChain[] = [
  reqText('title', 200),
  optText('description', 1000),
  optUuid('batchId'),
  optUuid('courseId'),
  body('duration').notEmpty().isInt({ min: 1 }).withMessage('duration must be a positive integer'),
  body('totalMarks').notEmpty().isInt({ min: 1 }).withMessage('totalMarks must be a positive integer'),
  body('passingMarks').optional({ values: 'null' }).isInt({ min: 0 }),
  optDate('startDate'),
  optDate('endDate'),
];

export const updateTestSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('title', 200),
  optText('description', 1000),
  optEnum('status', TEST_STATUS),
  optDate('startDate'),
  optDate('endDate'),
];

const QUESTION_OPTIONS = ['mcq', 'short_answer', 'long_answer'];
export const questionsSchema: ValidationChain[] = [
  paramUuid('id'),
  body('questions')
    .isArray({ min: 1 })
    .withMessage('questions must be a non-empty array'),
  body('questions.*.questionText')
    .trim()
    .notEmpty()
    .withMessage('each question needs questionText'),
  body('questions.*.questionType')
    .optional()
    .isIn(QUESTION_OPTIONS)
    .withMessage('questionType must be mcq/short_answer/long_answer'),
  body('questions.*.marks')
    .optional({ values: 'null' })
    .isInt({ min: 0 })
    .withMessage('question marks must be an integer >= 0'),
  body('questions.*.options')
    .optional()
    .isArray()
    .withMessage('question options must be an array'),
  body('questions.*.correctAnswer').optional({ values: 'null' }).trim(),
];

// ── SUBMISSIONS / GRADING ───────────────────────────────────────────────────
export const saveTestAnswersSchema: ValidationChain[] = [
  paramUuid('testId'),
  body('answers')
    .isArray()
    .withMessage('answers must be an array'),
  body('answers.*.questionId')
    .isUUID()
    .withMessage('answers.*.questionId must be a valid UUID'),
  body('answers.*.selectedAnswer').optional({ values: 'null' }).trim(),
  body('answers.*.answerText').optional({ values: 'null' }).trim(),
];

export const gradeTestSubmissionSchema: ValidationChain[] = [
  paramUuid('testId'),
  paramUuid('submissionId'),
  body('subjectiveMarks').isFloat({ min: 0 }).withMessage('subjectiveMarks must be a non-negative number'),
  optText('remarks', 1000),
];

export const gradeAssignmentSchema: ValidationChain[] = [
  paramUuid('id'),
  paramUuid('submissionId'),
  body('marksAwarded')
    .notEmpty()
    .withMessage('marksAwarded is required')
    .isInt({ min: 0 })
    .withMessage('marksAwarded must be an integer >= 0'),
  optText('feedback', 1000),
];

// ── ASSIGNMENTS ─────────────────────────────────────────────────────────────
export const createAssignmentSchema: ValidationChain[] = [
  reqText('title', 200),
  reqText('description', 2000),
  optUuid('batchId'),
  optUuid('courseId'),
  reqDate('dueDate'),
  optInt('totalMarks'),
];

export const submitAssignmentSchema: ValidationChain[] = [
  paramUuid('id'),
  body('submissionText').optional().trim(),
  body('submissionUrl').optional({ values: 'null' }).isURL(),
];

// ── DOUBTS ──────────────────────────────────────────────────────────────────
export const createDoubtSchema: ValidationChain[] = [
  reqText('question', 2000),
  optUuid('subjectId'),
  optText('imageUrl', 500),
];

export const replyDoubtSchema: ValidationChain[] = [
  paramUuid('id'),
  reqText('reply', 2000),
];

// ── LIVE CLASSES ────────────────────────────────────────────────────────────
export const createLiveClassSchema: ValidationChain[] = [
  reqText('title', 200),
  optText('description', 1000),
  reqUuid('batchId'),
  reqText('meetingLink', 500).isURL(),
  reqDate('scheduledDate'),
  reqText('scheduledTime', 20),
  optInt('duration', 1),
];

export const updateLiveClassSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('title', 200),
  optText('description', 1000),
  optText('meetingLink', 500).isURL(),
  optDate('scheduledDate'),
  optText('scheduledTime', 20),
  optInt('duration', 1),
  optEnum('status', LIVE_STATUS),
];

// ── FEES / PAYMENTS ─────────────────────────────────────────────────────────
export const createFeeSchema: ValidationChain[] = [
  reqUuid('studentId'),
  optUuid('courseId'),
  amount('totalAmount'),
  amount('discount', false),
  optDate('dueDate'),
];

export const createPaymentSchema: ValidationChain[] = [
  paramUuid('feeId'),
  amount('amount'),
  reqEnum('paymentMode', PAYMENT_MODES),
  optText('transactionId', 120),
  optText('receiptNumber', 120),
  optText('notes', 500),
  body('studentId').not().exists().withMessage('studentId is derived from the fee, not the body'),
];

// ── SUBJECTS / CHAPTERS ─────────────────────────────────────────────────────
export const subjectBodySchema: ValidationChain[] = [
  paramUuid('courseId'),
  reqText('name', 150),
  optText('description', 1000),
];

export const updateSubjectSchema: ValidationChain[] = [
  paramUuid('courseId'),
  paramUuid('subId'),
  optText('name', 150),
  optText('description', 1000),
];

export const chapterBodySchema: ValidationChain[] = [
  paramUuid('subjectId'),
  reqText('title', 200),
  optText('description', 2000),
  optText('videoUrl', 500).isURL(),
  optInt('duration'),
];

export const updateChapterSchema: ValidationChain[] = [
  paramUuid('subjectId'),
  paramUuid('chapterId'),
  optText('title', 200),
  optText('description', 2000),
  optText('videoUrl', 500).isURL(),
  optInt('duration'),
];

// ── NOTIFICATIONS ───────────────────────────────────────────────────────────
export const sendNotificationSchema: ValidationChain[] = [
  body('receiverIds')
    .isArray({ min: 1, max: 500 })
    .withMessage('receiverIds must be a non-empty array (max 500)'),
  body('receiverIds.*')
    .isUUID()
    .withMessage('each receiverId must be a valid UUID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('title is required'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('message is required'),
  optEnum('type', ['general', 'info', 'doubt', 'assignment', 'test', 'fee', 'class', 'announcement', 'system']),
  optText('link', 500),
];

export const broadcastNotificationSchema: ValidationChain[] = [
  reqText('title', 200),
  reqText('message', 2000),
  optEnum('type', ['general', 'info', 'announcement', 'system']),
  optEnum('targetRole', ['student', 'teacher']),
  optUuid('batchId'),
];

// ── ATTENDANCE ──────────────────────────────────────────────────────────────
export const createAttendanceSessionSchema: ValidationChain[] = [
  reqUuid('batchId'),
  reqText('title', 200),
  reqDate('sessionDate'),
  optText('topic', 500),
];

export const updateAttendanceRecordsSchema: ValidationChain[] = [
  paramUuid('sessionId'),
  body('records')
    .isArray()
    .withMessage('records must be an array'),
  body('records.*.studentId')
    .isUUID()
    .withMessage('records.*.studentId must be a valid UUID'),
  body('records.*.status')
    .isIn(ATTENDANCE)
    .withMessage('records.*.status must be present/absent/late'),
  body('records.*.note').optional({ values: 'null' }).trim().isLength({ max: 500 }),
];

// ── PUBLIC SITE / CMS ───────────────────────────────────────────────────────
const NOTICE_STATUS = ['draft', 'published', 'archived'];
const NOTICE_AUDIENCE = ['everyone', 'students', 'teachers', 'admin'];
const NOTICE_PRIORITY = ['normal', 'high', 'urgent'];
const EVENT_STATUS = ['draft', 'published', 'cancelled', 'archived'];
const ENQUIRY_STATUS = ['new', 'read', 'resolved', 'archived'];
const MEDIA_TYPES = ['image', 'video', 'raw', 'auto'];

export const createNoticeSchema: ValidationChain[] = [
  reqText('title', 200),
  optText('description', 4000),
  optText('attachmentUrl', 500),
  optEnum('audience', NOTICE_AUDIENCE),
  optEnum('priority', NOTICE_PRIORITY),
  optEnum('status', NOTICE_STATUS),
  optDate('publishAt'),
  optDate('expireAt'),
];

export const updateNoticeSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('title', 200),
  optText('description', 4000),
  optText('attachmentUrl', 500),
  optEnum('audience', NOTICE_AUDIENCE),
  optEnum('priority', NOTICE_PRIORITY),
  optEnum('status', NOTICE_STATUS),
  optDate('publishAt'),
  optDate('expireAt'),
];

export const createEventSchema: ValidationChain[] = [
  reqText('name', 200),
  optText('description', 4000),
  reqDate('eventDate'),
  optText('startTime', 20),
  optText('endTime', 20),
  optText('location', 300),
  optText('bannerUrl', 500),
  optEnum('status', EVENT_STATUS),
];

export const updateEventSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('name', 200),
  optText('description', 4000),
  optDate('eventDate'),
  optText('startTime', 20),
  optText('endTime', 20),
  optText('location', 300),
  optText('bannerUrl', 500),
  optEnum('status', EVENT_STATUS),
];

export const updateEnquiryStatusSchema: ValidationChain[] = [
  paramUuid('id'),
  reqEnum('status', ENQUIRY_STATUS),
];

export const updateMediaAltSchema: ValidationChain[] = [
  paramUuid('id'),
  optText('altText', 300),
];

/** CMS draft save + publish: { key, content? } */
export const cmsSaveSchema: ValidationChain[] = [
  body('key')
    .trim()
    .notEmpty()
    .withMessage('key is required')
    .isIn(['home', 'seo', 'social', 'footer'])
    .withMessage('key must be home/seo/social/footer'),
  body('content').optional().isObject().withMessage('content must be an object'),
];

/** Global admin search — validated as a query parameter. */
export const searchSchema: ValidationChain[] = [
  query('q').optional().trim().isLength({ max: 100 }),
];

// Public contact form (validated here too so the shape matches admin schemas;
// public.ts re-validates defensively with its own limits).
export const publicEnquirySchema: ValidationChain[] = [
  reqText('name', 120),
  reqText('email', 200).isEmail(),
  optText('phone', 30),
  reqText('subject', 200),
  reqText('message', 4000).isLength({ min: 10 }),
];