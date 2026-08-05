import {
  pgTable, text, integer, boolean, timestamp, decimal, jsonb, uuid, index
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  password: text('password').notNull(),
  profileImage: text('profile_image'),
  role: text('role', { enum: ['student', 'teacher', 'admin'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive', 'blocked', 'pending'] }).notNull().default('active'),
  // Soft-delete timestamps: administrative deletes DEACTIVATE the account
  // (status → inactive) and stamp these columns instead of hard-deleting the
  // row, preserving academic history (results, fees, attendance, submissions).
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  roleIdx: index('users_role_idx').on(t.role),
  statusIdx: index('users_status_idx').on(t.status),
  createdAtIdx: index('users_created_at_idx').on(t.createdAt),
  nameIdx: index('users_name_idx').on(t.name),
}));

export const studentProfiles = pgTable('student_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentName: text('parent_name'),
  parentPhone: text('parent_phone'),
  address: text('address'),
  class: text('class'),
  board: text('board'),
  dateOfBirth: timestamp('date_of_birth'),
  enrollmentDate: timestamp('enrollment_date').defaultNow().notNull(),
  courseId: uuid('course_id'),
}, (t) => ({
  userIdIdx: index('student_profiles_user_id_idx').on(t.userId),
}));

export const teacherProfiles = pgTable('teacher_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  qualification: text('qualification'),
  experience: integer('experience'),
  specialization: text('specialization'),
}, (t) => ({
  userIdIdx: index('teacher_profiles_user_id_idx').on(t.userId),
}));

// ── Academic ───────────────────────────────────────────────────────────────
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  classLevel: text('class_level'),
  duration: integer('duration'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull().default('0'),
  status: text('status', { enum: ['active', 'inactive', 'archived'] }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('courses_status_idx').on(t.status),
  createdAtIdx: index('courses_created_at_idx').on(t.createdAt),
}));

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  courseIdIdx: index('subjects_course_id_idx').on(t.courseId),
}));

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  videoUrl: text('video_url'),
  duration: integer('duration'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  subjectIdIdx: index('chapters_subject_id_idx').on(t.subjectId),
}));

export const batches = pgTable('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  timing: text('timing'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: text('status', { enum: ['active', 'inactive', 'completed'] }).notNull().default('active'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  courseIdIdx: index('batches_course_id_idx').on(t.courseId),
  statusIdx: index('batches_status_idx').on(t.status),
  createdAtIdx: index('batches_created_at_idx').on(t.createdAt),
}));

export const batchStudents = pgTable('batch_students', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
}, (t) => ({
  batchIdIdx: index('batch_students_batch_id_idx').on(t.batchId),
  studentIdIdx: index('batch_students_student_id_idx').on(t.studentId),
}));

export const batchTeachers = pgTable('batch_teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (t) => ({
  batchIdIdx: index('batch_teachers_batch_id_idx').on(t.batchId),
  teacherIdIdx: index('batch_teachers_teacher_id_idx').on(t.teacherId),
}));

// ── Materials ──────────────────────────────────────────────────────────────
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  cloudinaryId: text('cloudinary_id').default(''),
  fileType: text('file_type', { enum: ['pdf', 'image', 'video', 'document', 'other'] }).notNull().default('document'),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size'),
  courseId: uuid('course_id').references(() => courses.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  batchId: uuid('batch_id').references(() => batches.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  visibility: boolean('visibility').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  uploadedByIdx: index('materials_uploaded_by_idx').on(t.uploadedBy),
  courseIdIdx: index('materials_course_id_idx').on(t.courseId),
  fileTypeIdx: index('materials_file_type_idx').on(t.fileType),
  visibilityIdx: index('materials_visibility_idx').on(t.visibility),
  createdAtIdx: index('materials_created_at_idx').on(t.createdAt),
}));

// ── Live Classes ───────────────────────────────────────────────────────────
export const liveClasses = pgTable('live_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  batchId: uuid('batch_id').notNull().references(() => batches.id),
  courseId: uuid('course_id').references(() => courses.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  meetingLink: text('meeting_link').notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  scheduledTime: text('scheduled_time').notNull(),
  duration: integer('duration'),
  status: text('status', { enum: ['scheduled', 'live', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  teacherIdIdx: index('live_classes_teacher_id_idx').on(t.teacherId),
  statusIdx: index('live_classes_status_idx').on(t.status),
  scheduledDateIdx: index('live_classes_scheduled_date_idx').on(t.scheduledDate),
}));

// ── Tests ──────────────────────────────────────────────────────────────────
export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  courseId: uuid('course_id').references(() => courses.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  batchId: uuid('batch_id').references(() => batches.id),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  duration: integer('duration').notNull(),
  totalMarks: integer('total_marks').notNull(),
  passingMarks: integer('passing_marks'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  teacherIdIdx: index('tests_teacher_id_idx').on(t.teacherId),
  statusIdx: index('tests_status_idx').on(t.status),
  createdAtIdx: index('tests_created_at_idx').on(t.createdAt),
}));

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  questionType: text('question_type', { enum: ['mcq', 'short_answer', 'long_answer'] }).notNull().default('mcq'),
  marks: integer('marks').notNull().default(1),
  options: jsonb('options'),
  correctAnswer: text('correct_answer'),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  testIdIdx: index('questions_test_id_idx').on(t.testId),
}));

export const testResults = pgTable('test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => tests.id),
  studentId: uuid('student_id').notNull().references(() => users.id),
  marksObtained: decimal('marks_obtained', { precision: 10, scale: 2 }).notNull().default('0'),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  status: text('status', { enum: ['pending', 'graded'] }).notNull().default('pending'),
  remarks: text('remarks'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  gradedAt: timestamp('graded_at'),
  gradedBy: uuid('graded_by').references(() => users.id),
}, (t) => ({
  testIdIdx: index('test_results_test_id_idx').on(t.testId),
  studentIdIdx: index('test_results_student_id_idx').on(t.studentId),
  submittedAtIdx: index('test_results_submitted_at_idx').on(t.submittedAt),
}));

// Per-student answers for a test attempt. MCQ answers are auto-graded at
// submission (marks_awarded set for correct answers); subjective answers stay
// null until the teacher grades them via the teacher grading endpoints.
export const testAnswers = pgTable('test_answers', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => tests.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id),
  questionId: uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  selectedAnswer: text('selected_answer'),
  answerText: text('answer_text'),
  marksAwarded: decimal('marks_awarded', { precision: 10, scale: 2 }),
  gradedAt: timestamp('graded_at'),
  gradedBy: uuid('graded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  testIdIdx: index('test_answers_test_id_idx').on(t.testId),
  studentIdIdx: index('test_answers_student_id_idx').on(t.studentId),
  questionIdIdx: index('test_answers_question_id_idx').on(t.questionId),
}));

// ── Assignments ────────────────────────────────────────────────────────────
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  courseId: uuid('course_id').references(() => courses.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  batchId: uuid('batch_id').references(() => batches.id),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  attachmentUrl: text('attachment_url'),
  dueDate: timestamp('due_date').notNull(),
  totalMarks: integer('total_marks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  teacherIdIdx: index('assignments_teacher_id_idx').on(t.teacherId),
  dueDateIdx: index('assignments_due_date_idx').on(t.dueDate),
}));

export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id),
  submissionText: text('submission_text'),
  submissionUrl: text('submission_url'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  status: text('status', { enum: ['pending', 'submitted', 'graded'] }).notNull().default('submitted'),
  marksAwarded: integer('marks_awarded'),
  feedback: text('feedback'),
  gradedAt: timestamp('graded_at'),
  gradedBy: uuid('graded_by').references(() => users.id),
}, (t) => ({
  assignmentIdIdx: index('assignment_submissions_assignment_id_idx').on(t.assignmentId),
  studentIdIdx: index('assignment_submissions_student_id_idx').on(t.studentId),
}));

// ── Doubts ─────────────────────────────────────────────────────────────────
export const doubts = pgTable('doubts', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  subjectId: uuid('subject_id').references(() => subjects.id),
  question: text('question').notNull(),
  imageUrl: text('image_url'),
  status: text('status', { enum: ['open', 'answered', 'resolved'] }).notNull().default('open'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  studentIdIdx: index('doubts_student_id_idx').on(t.studentId),
  statusIdx: index('doubts_status_idx').on(t.status),
  createdAtIdx: index('doubts_created_at_idx').on(t.createdAt),
}));

export const doubtReplies = pgTable('doubt_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  doubtId: uuid('doubt_id').notNull().references(() => doubts.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  reply: text('reply').notNull(),
  attachmentUrl: text('attachment_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  doubtIdIdx: index('doubt_replies_doubt_id_idx').on(t.doubtId),
}));

// ── Fees ───────────────────────────────────────────────────────────────────
export const fees = pgTable('fees', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => users.id),
  courseId: uuid('course_id').references(() => courses.id),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  studentIdIdx: index('fees_student_id_idx').on(t.studentId),
  createdAtIdx: index('fees_created_at_idx').on(t.createdAt),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  feeId: uuid('fee_id').notNull().references(() => fees.id),
  studentId: uuid('student_id').notNull().references(() => users.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMode: text('payment_mode', { enum: ['cash', 'upi', 'card', 'net_banking', 'other'] }).notNull(),
  transactionId: text('transaction_id'),
  receiptNumber: text('receipt_number'),
  receiptUrl: text('receipt_url'),
  status: text('status', { enum: ['pending', 'paid', 'partial', 'overdue'] }).notNull().default('paid'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id),
  notes: text('notes'),
}, (t) => ({
  studentIdIdx: index('payments_student_id_idx').on(t.studentId),
  feeIdIdx: index('payments_fee_id_idx').on(t.feeId),
  paidAtIdx: index('payments_paid_at_idx').on(t.paidAt),
}));

// ── Attendance ─────────────────────────────────────────────────────────────
export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  batchId: uuid('batch_id').notNull().references(() => batches.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  sessionDate: timestamp('session_date').notNull(),
  topic: text('topic'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  batchIdIdx: index('attendance_sessions_batch_id_idx').on(t.batchId),
  sessionDateIdx: index('attendance_sessions_session_date_idx').on(t.sessionDate),
}));

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => attendanceSessions.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => users.id),
  status: text('status', { enum: ['present', 'absent', 'late'] }).notNull().default('present'),
  note: text('note'),
}, (t) => ({
  sessionIdIdx: index('attendance_records_session_id_idx').on(t.sessionId),
  studentIdIdx: index('attendance_records_student_id_idx').on(t.studentId),
}));

// ── Audit Logs ─────────────────────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  userRole: text('user_role'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  createdAtIdx: index('audit_logs_created_at_idx').on(t.createdAt),
  entityIdx: index('audit_logs_entity_idx').on(t.entity),
  userIdIdx: index('audit_logs_user_id_idx').on(t.userId),
}));

// ── Settings ───────────────────────────────────────────────────────────────
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Notifications ──────────────────────────────────────────────────────────
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  receiverId: uuid('receiver_id').notNull().references(() => users.id),
  senderId: uuid('sender_id').references(() => users.id),
  type: text('type').notNull().default('general'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  receiverIdIdx: index('notifications_receiver_id_idx').on(t.receiverId),
  isReadIdx: index('notifications_is_read_idx').on(t.isRead),
  createdAtIdx: index('notifications_created_at_idx').on(t.createdAt),
}));

// ── Auth: Supabase Identity ─────────────────────────────────────────────────
// Links a Supabase Auth identity (UUID from auth.users) to an app user.
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  supabaseAuthId: text('supabase_auth_id').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  primaryProvider: text('primary_provider').notNull().default('email'),
  linkedAt: timestamp('linked_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  supabaseAuthIdIdx: index('profiles_supabase_auth_id_idx').on(t.supabaseAuthId),
  userIdIdx: index('profiles_user_id_idx').on(t.userId),
}));

// ── Public website / CMS ─────────────────────────────────────────────────────
// Notices: public announcements with audience/priority and a draft → published
// → archived lifecycle. `publishAt`/`expireAt` support scheduled publishing.
export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  attachmentUrl: text('attachment_url'),
  audience: text('audience', { enum: ['everyone', 'students', 'teachers', 'admin'] }).notNull().default('everyone'),
  priority: text('priority', { enum: ['normal', 'high', 'urgent'] }).notNull().default('normal'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  publishAt: timestamp('publish_at'),
  expireAt: timestamp('expire_at'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('notices_status_idx').on(t.status),
  publishAtIdx: index('notices_publish_at_idx').on(t.publishAt),
  audienceIdx: index('notices_audience_idx').on(t.audience),
}));

// Events: public institute events. Single source of truth for the admin
// management page and the public events page.
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  shortDescription: text('short_description'),
  description: text('description'),
  eventDate: timestamp('event_date', { mode: 'date' }).notNull(),
  endDate: timestamp('end_date'),
  startTime: text('start_time'),
  endTime: text('end_time'),
  venue: text('venue'),
  organizer: text('organizer'),
  contactPhone: text('contact_phone'),
  registrationUrl: text('registration_url'),
  location: text('location'),
  bannerUrl: text('banner_url'),
  cloudinaryId: text('cloudinary_id').default(''),
  featured: boolean('featured').notNull().default(false),
  status: text('status', { enum: ['draft', 'published', 'cancelled', 'archived'] }).notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('events_status_idx').on(t.status),
  eventDateIdx: index('events_event_date_idx').on(t.eventDate),
}));

// Enquiries: public contact-form submissions, managed in the admin inbox.
export const enquiries = pgTable('enquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  sourcePage: text('source_page'),
  notes: text('notes'),
  status: text('status', { enum: ['new', 'read', 'contacted', 'follow_up', 'resolved', 'archived', 'spam'] }).notNull().default('new'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('enquiries_status_idx').on(t.status),
  createdAtIdx: index('enquiries_created_at_idx').on(t.createdAt),
}));

// CMS version history: append-only journal of every CMS section edit/publish,
// storing a full JSON snapshot so admins can inspect or restore past states.
export const cmsVersions = pgTable('cms_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  section: text('section').notNull(),
  content: jsonb('content').notNull(),
  action: text('action', { enum: ['save', 'publish', 'restore'] }).notNull().default('save'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  sectionCreatedAtIdx: index('cms_versions_section_created_at_idx').on(t.section, t.createdAt),
}));

// Media library: metadata for Cloudinary-hosted assets (uploaded via the
// admin media library). Kept in the DB so alt text, search and usage-safe
// deletion (reference checks against materials/events/settings) are possible.
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicId: text('public_id').notNull().unique(),
  url: text('url').notNull(),
  resourceType: text('resource_type', { enum: ['image', 'video', 'raw', 'auto'] }).notNull().default('image'),
  format: text('format'),
  bytes: integer('bytes'),
  width: integer('width'),
  height: integer('height'),
  altText: text('alt_text').default(''),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  resourceTypeIdx: index('media_assets_resource_type_idx').on(t.resourceType),
  createdAtIdx: index('media_assets_created_at_idx').on(t.createdAt),
}));

// ── Auth: Audit Events ──────────────────────────────────────────────────────
// Immutable audit log for all authentication events.
export const authEvents = pgTable('auth_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  supabaseAuthId: text('supabase_auth_id'),
  eventType: text('event_type').notNull(),
  provider: text('provider'),
  status: text('status', { enum: ['success', 'failure'] }).notNull(),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index('auth_events_user_id_idx').on(t.userId),
  eventTypeIdx: index('auth_events_event_type_idx').on(t.eventType),
  createdAtIdx: index('auth_events_created_at_idx').on(t.createdAt),
}));

// ── Public site CMS: Faculty ───────────────────────────────────────────────
// Public-facing faculty profiles (separate from internal teacher profiles).
export const publicFaculty = pgTable('public_faculty', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  designation: text('designation').notNull(),
  department: text('department'),
  subject: text('subject'),
  qualification: text('qualification'),
  experience: text('experience'),
  specialization: text('specialization'),
  bio: text('bio'),
  profileImage: text('profile_image'),
  cloudinaryId: text('cloudinary_id').default(''),
  featured: boolean('featured').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('public_faculty_status_idx').on(t.cmsStatus),
  displayOrderIdx: index('public_faculty_display_order_idx').on(t.displayOrder),
  featuredIdx: index('public_faculty_featured_idx').on(t.featured),
}));

// ── Public site CMS: Courses ────────────────────────────────────────────────
// Public-facing course listings (separate from internal academic courses).
export const publicCourses = pgTable('public_courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  description: text('description'),
  duration: text('duration'),
  eligibility: text('eligibility'),
  level: text('level'),
  subjects: jsonb('subjects').default([]),
  highlights: jsonb('highlights').default([]),
  feeReference: text('fee_reference'),
  admissionAvailable: boolean('admission_available').notNull().default(true),
  imageUrl: text('image_url'),
  cloudinaryId: text('cloudinary_id').default(''),
  featured: boolean('featured').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('public_courses_status_idx').on(t.cmsStatus),
  displayOrderIdx: index('public_courses_display_order_idx').on(t.displayOrder),
  featuredIdx: index('public_courses_featured_idx').on(t.featured),
}));

// ── Public site CMS: structured content entities ────────────────────────────
// Long-form CMS pages (Our Story, About…) with JSON block content.
export const sitePages = pgTable('site_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  content: jsonb('content').notNull().default({}),
  coverImage: text('cover_image'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('site_pages_status_idx').on(t.status),
}));

export const admissions = pgTable('admissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  session: text('session').notNull(),
  status: text('status', { enum: ['upcoming', 'open', 'closing_soon', 'closed'] }).notNull().default('upcoming'),
  title: text('title'),
  subtitle: text('subtitle'),
  description: text('description'),
  openingDate: timestamp('opening_date'),
  closingDate: timestamp('closing_date'),
  eligibility: text('eligibility'),
  documents: jsonb('documents').default([]),
  process: jsonb('process').default([]),
  programs: jsonb('programs').default([]),
  instructions: text('instructions'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  ctaLabel: text('cta_label').default('Apply for Admission'),
  ctaUrl: text('cta_url'),
  featured: boolean('featured').notNull().default(false),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index('admissions_session_idx').on(t.session),
  statusIdx: index('admissions_status_idx').on(t.cmsStatus),
}));

export const feeStructures = pgTable('fee_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  session: text('session').notNull(),
  classLevel: text('class_level').notNull(),
  admissionFee: decimal('admission_fee', { precision: 10, scale: 2 }),
  tuitionFee: decimal('tuition_fee', { precision: 10, scale: 2 }),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }),
  examFee: decimal('exam_fee', { precision: 10, scale: 2 }),
  transportFee: decimal('transport_fee', { precision: 10, scale: 2 }),
  otherCharges: decimal('other_charges', { precision: 10, scale: 2 }),
  totalFee: decimal('total_fee', { precision: 10, scale: 2 }),
  discountInfo: text('discount_info'),
  notes: text('notes'),
  paymentSchedule: text('payment_schedule'),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index('fee_structures_session_idx').on(t.session),
  statusIdx: index('fee_structures_status_idx').on(t.cmsStatus),
}));

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().default('academic'),
  achievementDate: timestamp('achievement_date'),
  imageUrl: text('image_url'),
  cloudinaryId: text('cloudinary_id').default(''),
  awardOrganization: text('award_organization'),
  studentName: text('student_name'),
  level: text('level'),
  featured: boolean('featured').notNull().default(false),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('achievements_status_idx').on(t.cmsStatus),
  categoryIdx: index('achievements_category_idx').on(t.category),
}));

export const publicResults = pgTable('public_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  session: text('session'),
  exam: text('exam'),
  classLevel: text('class_level'),
  studentName: text('student_name'),
  rank: text('rank'),
  percentage: decimal('percentage', { precision: 5, scale: 2 }),
  grade: text('grade'),
  description: text('description'),
  resultType: text('result_type').notNull().default('top_performer'),
  displayDate: timestamp('display_date'),
  featured: boolean('featured').notNull().default(false),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('public_results_status_idx').on(t.cmsStatus),
  typeIdx: index('public_results_type_idx').on(t.resultType),
}));

export const galleryItems = pgTable('gallery_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  caption: text('caption'),
  altText: text('alt_text').default(''),
  imageUrl: text('image_url').notNull(),
  cloudinaryId: text('cloudinary_id').default(''),
  category: text('category').notNull().default('campus'),
  takenAt: timestamp('taken_at'),
  featured: boolean('featured').notNull().default(false),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('gallery_items_status_idx').on(t.cmsStatus),
  categoryIdx: index('gallery_items_category_idx').on(t.category),
}));

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  relationship: text('relationship').notNull().default('student'),
  rating: integer('rating').notNull().default(5),
  review: text('review').notNull(),
  profileImage: text('profile_image'),
  consent: boolean('consent').notNull().default(false),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'archived'] }).notNull().default('pending'),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  source: text('source').notNull().default('public'),
  adminNote: text('admin_note'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('reviews_status_idx').on(t.status),
  ratingIdx: index('reviews_rating_idx').on(t.rating),
}));

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  coverImage: text('cover_image'),
  cloudinaryId: text('cloudinary_id').default(''),
  category: text('category'),
  tags: jsonb('tags').default([]),
  author: text('author'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  featured: boolean('featured').notNull().default(false),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  publishAt: timestamp('publish_at'),
  publishedAt: timestamp('published_at'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImage: text('og_image'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('blog_posts_status_idx').on(t.cmsStatus),
  categoryIdx: index('blog_posts_category_idx').on(t.category),
  publishedIdx: index('blog_posts_published_idx').on(t.publishedAt),
}));

export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull().default('general'),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  cmsStatus: text('cms_status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('faqs_status_idx').on(t.cmsStatus),
  categoryIdx: index('faqs_category_idx').on(t.category),
}));

export const navigationItems = pgTable('navigation_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  href: text('href').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => navigationItems.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  visibility: boolean('visibility').notNull().default(true),
  target: text('target').notNull().default('self'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  positionIdx: index('navigation_items_position_idx').on(t.position),
}));

export const homepageSections = pgTable('homepage_sections', {
  key: text('key').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
  title: text('title'),
  subtitle: text('subtitle'),
  sortOrder: integer('sort_order').notNull().default(0),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url'),
  featuredIds: jsonb('featured_ids').default([]),
  settings: jsonb('settings').default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customPages = pgTable('custom_pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  pageType: text('page_type', { enum: ['html', 'bundle', 'split'] }).notNull().default('html'),
  entryFile: text('entry_file').notNull().default('index.html'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  version: integer('version').notNull().default(1),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImage: text('og_image'),
  robots: text('robots').notNull().default('index,follow'),
  navigationLabel: text('navigation_label'),
  navigationVisibility: boolean('navigation_visibility').notNull().default(false),
  navigationPosition: integer('navigation_position').notNull().default(0),
  ackRisks: boolean('ack_risks').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  statusIdx: index('custom_pages_status_idx').on(t.status),
}));

export const customPageFiles = pgTable('custom_page_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => customPages.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: text('content').notNull().default(''),
  kind: text('kind', { enum: ['html', 'css', 'js', 'asset', 'image'] }).notNull().default('html'),
  size: integer('size').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  pagePathIdx: index('custom_page_files_page_path_idx').on(t.pageId, t.path),
}));

export const customPageVersions = pgTable('custom_page_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => customPages.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  note: text('note'),
  snapshot: jsonb('snapshot').notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pageVersionIdx: index('custom_page_versions_page_version_idx').on(t.pageId, t.version),
}));

