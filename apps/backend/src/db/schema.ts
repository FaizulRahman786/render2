import {
  pgTable, text, integer, boolean, timestamp, decimal, jsonb, uuid, index
} from 'drizzle-orm/pg-core';

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

