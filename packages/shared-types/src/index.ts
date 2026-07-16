// ============================================
// SHARED TYPES - Complete Type System
// ============================================

// ==================== ENUMS ====================

export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

export enum CourseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum BatchStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
}

export enum LiveClassStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TestStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export enum QuestionType {
  MCQ = 'mcq',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
}

export enum AssignmentStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

export enum DoubtStatus {
  OPEN = 'open',
  ANSWERED = 'answered',
  RESOLVED = 'resolved',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
}

export enum NotificationType {
  MATERIAL_UPLOADED = 'material_uploaded',
  LIVE_CLASS_SCHEDULED = 'live_class_scheduled',
  TEST_PUBLISHED = 'test_published',
  RESULT_PUBLISHED = 'result_published',
  ASSIGNMENT_POSTED = 'assignment_posted',
  DOUBT_ANSWERED = 'doubt_answered',
  FEE_REMINDER = 'fee_reminder',
  GENERAL = 'general',
}

export enum FileType {
  PDF = 'pdf',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

// ==================== USER SYSTEM ====================

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string | null; // legacy hashed password, null for Supabase-backed users
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  dateOfBirth?: Date;
  enrollmentDate: Date;
  courseId?: string;
  batchIds: string[];
}

export interface TeacherProfile {
  id: string;
  userId: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
  subjectIds: string[];
  batchIds: string[];
}

// ==================== ACADEMIC SYSTEM ====================

export interface Course {
  id: string;
  name: string;
  description: string;
  classLevel?: string;
  duration?: number; // in months
  fee: number;
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  order: number;
  createdAt: Date;
}

export interface Chapter {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: Date;
}

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  teacherIds: string[];
  studentIds: string[];
  timing?: string;
  startDate?: Date;
  endDate?: Date;
  status: BatchStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== MATERIAL SYSTEM ====================

export interface Material {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  cloudinaryId: string;
  fileType: FileType;
  fileName: string;
  fileSize?: number;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  uploadedBy: string; // userId
  visibility: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== LIVE CLASS SYSTEM ====================

export interface LiveClass {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  batchId: string;
  courseId?: string;
  subjectId?: string;
  meetingLink: string;
  scheduledDate: Date;
  scheduledTime: string;
  duration?: number; // in minutes
  status: LiveClassStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== TEST SYSTEM ====================

export interface Test {
  id: string;
  title: string;
  description?: string;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  batchId?: string;
  teacherId: string;
  duration: number; // in minutes
  totalMarks: number;
  passingMarks?: number;
  status: TestStatus;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  options?: string[]; // for MCQ
  correctAnswer?: string; // for MCQ
  order: number;
  createdAt: Date;
}

export interface StudentAnswer {
  id: string;
  testId: string;
  studentId: string;
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  marksAwarded?: number;
  createdAt: Date;
}

export interface TestResult {
  id: string;
  testId: string;
  studentId: string;
  marksObtained: number;
  percentage: number;
  status: 'pending' | 'graded';
  remarks?: string;
  submittedAt: Date;
  gradedAt?: Date;
  gradedBy?: string; // teacherId
}

// ==================== ASSIGNMENT SYSTEM ====================

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  subjectId?: string;
  batchId?: string;
  teacherId: string;
  attachmentUrl?: string;
  attachmentCloudinaryId?: string;
  dueDate: Date;
  totalMarks?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionUrl?: string;
  submissionCloudinaryId?: string;
  submittedAt: Date;
  status: AssignmentStatus;
  marksAwarded?: number;
  feedback?: string;
  gradedAt?: Date;
  gradedBy?: string; // teacherId
}

// ==================== DOUBT SYSTEM ====================

export interface Doubt {
  id: string;
  studentId: string;
  subjectId?: string;
  question: string;
  imageUrl?: string;
  imageCloudinaryId?: string;
  status: DoubtStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoubtReply {
  id: string;
  doubtId: string;
  teacherId: string;
  reply: string;
  attachmentUrl?: string;
  attachmentCloudinaryId?: string;
  createdAt: Date;
}

// ==================== FEE SYSTEM ====================

export interface Fee {
  id: string;
  studentId: string;
  courseId?: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  feeId: string;
  studentId: string;
  amount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'net_banking' | 'other';
  transactionId?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  receiptCloudinaryId?: string;
  status: PaymentStatus;
  paidAt: Date;
  recordedBy?: string; // adminId
  notes?: string;
}

// ==================== NOTIFICATION SYSTEM ====================

export interface Notification {
  id: string;
  receiverId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

// ==================== SETTINGS SYSTEM ====================

export interface WebsiteContent {
  id: string;
  section: string; // 'hero', 'about', 'faculty', 'testimonials', 'contact'
  content: Record<string, any>; // flexible JSON content
  updatedAt: Date;
  updatedBy?: string; // adminId
}

export interface Gallery {
  id: string;
  title: string;
  imageUrl: string;
  cloudinaryId: string;
  category?: string;
  order: number;
  createdAt: Date;
}

export interface Testimonial {
  id: string;
  studentName: string;
  studentImage?: string;
  course?: string;
  rating?: number;
  testimonial: string;
  isPublished: boolean;
  createdAt: Date;
}

// ==================== API TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    profileImage?: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  supabaseAuthId?: string;
  name?: string;
  phone?: string;
  profileImage?: string;
}

// ==================== ANALYTICS TYPES ====================

export interface StudentAnalytics {
  studentId: string;
  testHistory: {
    testId: string;
    testTitle: string;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
    date: Date;
  }[];
  averageScore: number;
  weakTopics: string[];
  strongTopics: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
  batchRank?: number;
}

export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalCourses?: number;
  totalBatches?: number;
  totalTests?: number;
  pendingFees?: number;
  upcomingClasses?: number;
  pendingDoubts?: number;
  totalRevenue?: number;
}

// ==================== FORM TYPES ====================

export interface CreateStudentRequest {
  name: string;
  email: string;
  phone: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  dateOfBirth?: string;
  courseId?: string;
  batchIds?: string[];
}

export interface CreateTeacherRequest {
  name: string;
  email: string;
  phone: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
  subjectIds?: string[];
  batchIds?: string[];
}

export interface CreateCourseRequest {
  name: string;
  description: string;
  classLevel?: string;
  duration?: number;
  fee: number;
}

export interface CreateBatchRequest {
  name: string;
  courseId: string;
  teacherIds: string[];
  studentIds?: string[];
  timing?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CreateMaterialRequest {
  title: string;
  description?: string;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  visibility: boolean;
}

export interface CreateTestRequest {
  title: string;
  description?: string;
  courseId?: string;
  subjectId?: string;
  chapterId?: string;
  batchId?: string;
  duration: number;
  totalMarks: number;
  passingMarks?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateLiveClassRequest {
  title: string;
  description?: string;
  batchId: string;
  courseId?: string;
  subjectId?: string;
  meetingLink: string;
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
}

export interface CreateAssignmentRequest {
  title: string;
  description: string;
  courseId?: string;
  subjectId?: string;
  batchId?: string;
  dueDate: string;
  totalMarks?: number;
}

export interface CreateDoubtRequest {
  subjectId?: string;
  question: string;
}

export interface CreatePaymentRequest {
  studentId: string;
  amount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'net_banking' | 'other';
  transactionId?: string;
  receiptNumber?: string;
  notes?: string;
}
