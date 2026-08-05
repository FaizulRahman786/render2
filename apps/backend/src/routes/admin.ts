import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq, desc, count, sql, and, ne, ilike, or, asc, inArray, gte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { emitToUser, emitToUsers } from '../ws/wsManager.js';
import { provisionAccount } from '../services/accountProvisioningService.js';
import { deleteCloudinaryAsset } from '../lib/storage.js';
import { storeLibraryFile, removeLocalFile } from '../lib/storage.js';
import { upload } from './upload.js';
import { validate } from '../middleware/validation.js';
import {
  createStudentSchema, updateStudentSchema, restoreUserSchema,
  createTeacherSchema, updateTeacherSchema,
  createCourseSchema, updateCourseSchema,
  createBatchSchema, updateBatchSchema, addBatchTeacherSchema, addBatchStudentSchema,
  createMaterialSchema, createFeeSchema, createPaymentSchema,
  subjectBodySchema, updateSubjectSchema, chapterBodySchema, updateChapterSchema,
  broadcastNotificationSchema,
} from '../validation/schemas.js';

async function logAudit(userId: string | undefined, userRole: string | undefined, action: string, entity: string, entityId?: string, details?: string, ipAddress?: string) {
  try {
    await db.insert(schema.auditLogs).values({ userId, userRole, action, entity, entityId, details, ipAddress });
  } catch {} // never block request for logging
}

function parsePagination(query: any, defaultLimit = 20) {
  const page = Math.max(1, parseInt(query.page as string || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string || String(defaultLimit))));
  const offset = (page - 1) * limit;
  const search = (query.search as string || '').trim();
  const status = (query.status as string || '').trim();
  const sort = (query.sort as string || '').trim();
  const order = (query.order as string || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { page, limit, offset, search, status, sort, order };
}

function paginationMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// Escape SQL wildcards (%) and (_) to prevent wildcard injection in search queries
function sanitizeSearch(term: string): string {
  return term.replace(/[%_]/g, '\\$&');
}

const router: ExpressRouter = Router();
router.use(authenticate, requireAdmin);

// ── Media library upload (POST /admin/media) ───────────────────────────────
// Backend twin of POST /upload/media for API-surface parity with the docs.
// Admins only (router-level guard above). Stores to Cloudinary-first with
// local-disk fallback and records the asset into media_assets.
router.post('/media', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const stored = await storeLibraryFile(req.file.path, { localBaseUrl: '/api/uploads' });
  if (!stored.storedLocally) removeLocalFile(req.file.path);
  const publicId = stored.cloudinaryId ?? `local-${req.file.filename}`;
  const resourceType = req.file.mimetype.startsWith('image')
    ? 'image'
    : req.file.mimetype.startsWith('video')
      ? 'video'
      : 'raw';
  const [asset] = await db.insert(schema.mediaAssets).values({
    publicId,
    url: stored.fileUrl,
    resourceType,
    format: stored.format,
    bytes: stored.bytes ?? req.file.size,
    width: stored.width,
    height: stored.height,
    uploadedBy: req.user!.id,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'media', asset.id, publicId, req.ip);
  res.status(201).json({ success: true, data: asset, message: 'Media uploaded' });
}));

// ── Dashboard Stats ────────────────────────────────────────────────────────
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [[{ total: totalStudents }], [{ total: totalTeachers }], [{ total: totalCourses }], [{ total: totalBatches }], [{ total: totalTests }]] = await Promise.all([
    db.select({ total: count() }).from(schema.users).where(eq(schema.users.role, 'student')),
    db.select({ total: count() }).from(schema.users).where(eq(schema.users.role, 'teacher')),
    db.select({ total: count() }).from(schema.courses),
    db.select({ total: count() }).from(schema.batches),
    db.select({ total: count() }).from(schema.tests),
  ]);

  // M1: outstanding fees = SUM(MAX(final_amount - paid, 0)) across all fees,
  // NOT the raw SUM(final_amount) (which ignores recorded payments).
  const pendingFees = await db.execute(sql`
    SELECT COALESCE(SUM(GREATEST(f."final_amount"::numeric - COALESCE(p."paid", 0), 0)), 0)::float8 AS total
    FROM "fees" f
    LEFT JOIN (
      SELECT "fee_id", SUM("amount"::numeric) AS "paid"
      FROM "payments"
      GROUP BY "fee_id"
    ) p ON p."fee_id" = f."id"
  `);
  const pendingFeesTotal = Number(pendingFees?.[0]?.total ?? 0);

  const [
    upcomingClassesRows, pendingDoubtsRows, activeCoursesRows,
    publishedNoticesRows, upcomingEventsRows, newEnquiriesRows, mediaAssetsRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(schema.liveClasses).where(eq(schema.liveClasses.status, 'scheduled')),
    db.select({ total: count() }).from(schema.doubts).where(eq(schema.doubts.status, 'open')),
    db.select({ total: count() }).from(schema.courses).where(eq(schema.courses.status, 'active')),
    db.select({ total: count() }).from(schema.notices).where(eq(schema.notices.status, 'published')),
    db.select({ total: count() }).from(schema.events)
      .where(and(eq(schema.events.status, 'published'), gte(schema.events.eventDate, sql`now()::date`))),
    db.select({ total: count() }).from(schema.enquiries).where(eq(schema.enquiries.status, 'new')),
    db.select({ total: count() }).from(schema.mediaAssets),
  ]);

  const upcomingClasses = upcomingClassesRows[0]?.total ?? 0;
  const pendingDoubts = pendingDoubtsRows[0]?.total ?? 0;
  const activeCourses = activeCoursesRows[0]?.total ?? 0;
  const publishedNotices = publishedNoticesRows[0]?.total ?? 0;
  const upcomingEvents = upcomingEventsRows[0]?.total ?? 0;
  const newEnquiries = newEnquiriesRows[0]?.total ?? 0;
  const mediaAssets = mediaAssetsRows[0]?.total ?? 0;

  // Recent administrative activity (real audit trail) for the dashboard feed.
  const recentActivity = await db.select({
    id: schema.auditLogs.id,
    action: schema.auditLogs.action,
    entity: schema.auditLogs.entity,
    entityId: schema.auditLogs.entityId,
    details: schema.auditLogs.details,
    createdAt: schema.auditLogs.createdAt,
    userName: schema.users.name,
  })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(6);

  res.json({
    success: true,
    data: {
      totalStudents, totalTeachers, totalCourses, totalBatches, totalTests,
      activeCourses,
      pendingFees: pendingFeesTotal,
      upcomingClasses,
      pendingDoubts,
      publishedNotices,
      upcomingEvents,
      newEnquiries,
      mediaAssets,
      recentActivity,
    },
  });
}));

// ── Students ───────────────────────────────────────────────────────────────
router.get('/students', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);
  const exportAll = req.query.all === 'true';

  const conditions: any[] = [eq(schema.users.role, 'student')];
  // F1: soft-deleted (deactivated) users are hidden by default; pass ?status=inactive to include.
  if (!status) conditions.push(ne(schema.users.status, 'inactive'));
  if (status) conditions.push(eq(schema.users.status, status as any));
  if (search) {
    conditions.push(or(
      ilike(schema.users.name, `%${sanitizeSearch(search)}%`),
      ilike(schema.users.email, `%${sanitizeSearch(search)}%`),
      ilike(schema.users.phone, `%${sanitizeSearch(search)}%`),
    )!);
  }

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() })
    .from(schema.users)
    .leftJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
    .where(where);

  const data = await db
    .select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email,
      phone: schema.users.phone, status: schema.users.status, profileImage: schema.users.profileImage,
      createdAt: schema.users.createdAt,
      parentName: schema.studentProfiles.parentName,
      parentPhone: schema.studentProfiles.parentPhone,
      courseId: schema.studentProfiles.courseId,
      enrollmentDate: schema.studentProfiles.enrollmentDate,
    })
    .from(schema.users)
    .leftJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.users.createdAt) : desc(schema.users.createdAt))
    .limit(exportAll ? Math.min(total, 10000) : limit)
    .offset(exportAll ? 0 : offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

router.post('/students', validate(createStudentSchema), asyncHandler(async (req, res) => {
  // Role is hard-coded 'student'. If the caller tries to smuggle one in for a
  // different role, reject it (no role parameter accepted, no escalation).
  if (req.body.role && req.body.role !== 'student') {
    throw new ApiError(400, 'role cannot be set on student creation');
  }
  const { name, email, phone, password, parentName, parentPhone, address, courseId } = req.body;
  const user = await provisionAccount('student', { name, email, phone, password, parentName, parentPhone, address, courseId });
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'student', user.id, user.name, req.ip);
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email } });
}));

router.put('/students/:id', validate(updateStudentSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { name, phone, status, parentName, parentPhone, address, courseId } = req.body;
  await db.update(schema.users).set({ name, phone, status, updatedAt: new Date() }).where(eq(schema.users.id, id));
  if (parentName !== undefined || parentPhone !== undefined || address !== undefined || courseId !== undefined) {
    await db.update(schema.studentProfiles).set({ parentName, parentPhone, address, courseId }).where(eq(schema.studentProfiles.userId, id));
  }
  res.json({ success: true, message: 'Student updated' });
}));

router.delete('/students/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  // F1: soft delete — deactivate the account, preserve academic history.
  const [updated] = await db.update(schema.users)
    .set({ status: 'inactive', deletedAt: new Date(), deletedBy: req.user!.id, updatedAt: new Date() })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, 'student')))
    .returning();
  if (!updated) throw new ApiError(404, 'Student not found');
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'student', id, updated.name, req.ip);
  res.json({ success: true, message: 'Student deactivated' });
}));

router.post('/students/:id/restore', validate(restoreUserSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [updated] = await db.update(schema.users)
    .set({ status: 'active', deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, 'student')))
    .returning();
  if (!updated) throw new ApiError(404, 'Student not found');
  await logAudit(req.user!.id, req.user!.role, 'RESTORE', 'student', id, updated.name, req.ip);
  res.json({ success: true, message: 'Student restored' });
}));

// All students list (no pagination, for dropdowns)
router.get('/students/all', asyncHandler(async (req, res) => {
  const data = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone })
    .from(schema.users)
    .where(and(eq(schema.users.role, 'student'), ne(schema.users.status, 'inactive')))
    .orderBy(asc(schema.users.name));
  res.json({ success: true, data });
}));

// ── Teachers ───────────────────────────────────────────────────────────────
router.get('/teachers', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);
  const exportAll = req.query.all === 'true';

  const conditions: any[] = [eq(schema.users.role, 'teacher')];
  // F1: soft-deleted (deactivated) users are hidden by default; pass ?status=inactive to include.
  if (!status) conditions.push(ne(schema.users.status, 'inactive'));
  if (status) conditions.push(eq(schema.users.status, status as any));
  if (search) {
    conditions.push(or(
      ilike(schema.users.name, `%${sanitizeSearch(search)}%`),
      ilike(schema.users.email, `%${sanitizeSearch(search)}%`),
      ilike(schema.users.phone, `%${sanitizeSearch(search)}%`),
    )!);
  }

  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() })
    .from(schema.users)
    .leftJoin(schema.teacherProfiles, eq(schema.users.id, schema.teacherProfiles.userId))
    .where(where);

  const data = await db
    .select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email,
      phone: schema.users.phone, status: schema.users.status, profileImage: schema.users.profileImage,
      createdAt: schema.users.createdAt,
      qualification: schema.teacherProfiles.qualification,
      experience: schema.teacherProfiles.experience,
      specialization: schema.teacherProfiles.specialization,
    })
    .from(schema.users)
    .leftJoin(schema.teacherProfiles, eq(schema.users.id, schema.teacherProfiles.userId))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.users.createdAt) : desc(schema.users.createdAt))
    .limit(exportAll ? Math.min(total, 10000) : limit)
    .offset(exportAll ? 0 : offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

// All teachers list (no pagination, for dropdowns)
router.get('/teachers/all', asyncHandler(async (req, res) => {
  const data = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(and(eq(schema.users.role, 'teacher'), ne(schema.users.status, 'inactive')))
    .orderBy(asc(schema.users.name));
  res.json({ success: true, data });
}));

router.post('/teachers', validate(createTeacherSchema), asyncHandler(async (req, res) => {
  // E1: role hard-coded 'teacher'; body role is rejected.
  if (req.body.role && req.body.role !== 'teacher') {
    throw new ApiError(400, 'role cannot be set on teacher creation');
  }
  const { name, email, phone, password, qualification, experience, specialization } = req.body;
  const user = await provisionAccount('teacher', { name, email, phone, password, qualification, experience, specialization });
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'teacher', user.id, user.name, req.ip);
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email } });
}));

router.put('/teachers/:id', validate(updateTeacherSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { name, phone, status, qualification, experience, specialization } = req.body;
  await db.update(schema.users).set({ name, phone, status, updatedAt: new Date() }).where(eq(schema.users.id, id));
  if (qualification !== undefined || experience !== undefined || specialization !== undefined) {
    await db.update(schema.teacherProfiles).set({ qualification, experience, specialization }).where(eq(schema.teacherProfiles.userId, id));
  }
  res.json({ success: true, message: 'Teacher updated' });
}));

router.delete('/teachers/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  // F1: soft delete — deactivate the account, preserve academic history.
  const [updated] = await db.update(schema.users)
    .set({ status: 'inactive', deletedAt: new Date(), deletedBy: req.user!.id, updatedAt: new Date() })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, 'teacher')))
    .returning();
  if (!updated) throw new ApiError(404, 'Teacher not found');
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'teacher', id, updated.name, req.ip);
  res.json({ success: true, message: 'Teacher deactivated' });
}));

router.post('/teachers/:id/restore', validate(restoreUserSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [updated] = await db.update(schema.users)
    .set({ status: 'active', deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(and(eq(schema.users.id, id), eq(schema.users.role, 'teacher')))
    .returning();
  if (!updated) throw new ApiError(404, 'Teacher not found');
  await logAudit(req.user!.id, req.user!.role, 'RESTORE', 'teacher', id, updated.name, req.ip);
  res.json({ success: true, message: 'Teacher restored' });
}));

// ── Courses ────────────────────────────────────────────────────────────────
router.get('/courses', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);

  // If page=0 or all=true, return all for dropdown use
  if (req.query.all === 'true') {
    const data = await db.select({ id: schema.courses.id, name: schema.courses.name, status: schema.courses.status })
      .from(schema.courses).where(eq(schema.courses.status, 'active')).orderBy(asc(schema.courses.name));
    return res.json({ success: true, data });
  }

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.courses.status, status as any));
  if (search) conditions.push(ilike(schema.courses.name, `%${sanitizeSearch(search)}%`));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.courses).where(where);
  const data = await db.select().from(schema.courses)
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.courses.createdAt) : desc(schema.courses.createdAt))
    .limit(limit).offset(offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

router.post('/courses', validate(createCourseSchema), asyncHandler(async (req, res) => {
  const { name, description, classLevel, duration, fee } = req.body;
  if (!name || !description) throw new ApiError(400, 'name and description are required');
  const [course] = await db.insert(schema.courses).values({ name, description, classLevel, duration: duration ?? null, fee: fee?.toString() || '0' }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'course', course.id, name, req.ip);
  res.status(201).json({ success: true, data: course });
}));

router.put('/courses/:id', validate(updateCourseSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { name, description, classLevel, duration, fee, status } = req.body;
  await db.update(schema.courses).set({ name, description, classLevel, duration: duration ?? null, fee: fee?.toString(), status, updatedAt: new Date() }).where(eq(schema.courses.id, id));
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'course', id, name, req.ip);
  res.json({ success: true, message: 'Course updated' });
}));

router.delete('/courses/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  await db.delete(schema.courses).where(eq(schema.courses.id, id));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'course', id, undefined, req.ip);
  res.json({ success: true, message: 'Course deleted' });
}));

// ── Batches ────────────────────────────────────────────────────────────────
router.get('/batches', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);

  // Return all for dropdown
  if (req.query.all === 'true') {
    const data = await db
      .select({ id: schema.batches.id, name: schema.batches.name, courseId: schema.batches.courseId })
      .from(schema.batches)
      .where(eq(schema.batches.status, 'active'))
      .orderBy(asc(schema.batches.name));
    return res.json({ success: true, data });
  }

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.batches.status, status as any));
  if (search) conditions.push(ilike(schema.batches.name, `%${sanitizeSearch(search)}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.batches).where(where);

  // Fix N+1: use subquery for student count
  const batchList = await db
    .select({
      id: schema.batches.id, name: schema.batches.name, timing: schema.batches.timing,
      startDate: schema.batches.startDate, endDate: schema.batches.endDate,
      status: schema.batches.status, description: schema.batches.description,
      createdAt: schema.batches.createdAt,
      courseId: schema.batches.courseId, courseName: schema.courses.name,
      studentCount: sql<number>`(SELECT COUNT(*) FROM batch_students WHERE batch_id = ${schema.batches.id})`,
    })
    .from(schema.batches)
    .leftJoin(schema.courses, eq(schema.batches.courseId, schema.courses.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.batches.createdAt) : desc(schema.batches.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ success: true, data: batchList, pagination: paginationMeta(total, page, limit) });
}));

router.post('/batches', validate(createBatchSchema), asyncHandler(async (req, res) => {
  const { name, courseId, timing, startDate, endDate, description, teacherIds, studentIds } = req.body;
  if (!name || !courseId) throw new ApiError(400, 'name and courseId are required');
  const [batch] = await db.insert(schema.batches).values({ name, courseId, timing, startDate, endDate, description }).returning();
  if (teacherIds?.length) {
    await db.insert(schema.batchTeachers).values(teacherIds.map((tid: string) => ({ batchId: batch.id, teacherId: tid })));
  }
  if (studentIds?.length) {
    await db.insert(schema.batchStudents).values(studentIds.map((sid: string) => ({ batchId: batch.id, studentId: sid })));
  }
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'batch', batch.id, name, req.ip);
  res.status(201).json({ success: true, data: batch });
}));

router.put('/batches/:id', validate(updateBatchSchema), asyncHandler(async (req, res) => {
  const { name, timing, startDate, endDate, description, status } = req.body;
  const batchId = String(req.params.id);
  await db.update(schema.batches).set({ name, timing, startDate, endDate, description, status, updatedAt: new Date() }).where(eq(schema.batches.id, batchId));
  res.json({ success: true, message: 'Batch updated' });
}));

router.delete('/batches/:id', asyncHandler(async (req, res) => {
  const batchId = String(req.params.id);
  await db.delete(schema.batches).where(eq(schema.batches.id, batchId));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'batch', batchId, undefined, req.ip);
  res.json({ success: true, message: 'Batch deleted' });
}));

// ── Batch Members ───────────────────────────────────────────────────────────
router.get('/batches/:id/members', asyncHandler(async (req, res) => {
  const batchId = String(req.params.id);
  const [teachers, students] = await Promise.all([
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone })
      .from(schema.batchTeachers)
      .innerJoin(schema.users, eq(schema.batchTeachers.teacherId, schema.users.id))
      .where(eq(schema.batchTeachers.batchId, batchId)),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone })
      .from(schema.batchStudents)
      .innerJoin(schema.users, eq(schema.batchStudents.studentId, schema.users.id))
      .where(eq(schema.batchStudents.batchId, batchId)),
  ]);
  res.json({ success: true, data: { teachers, students } });
}));

router.post('/batches/:id/teachers', validate(addBatchTeacherSchema), asyncHandler(async (req, res) => {
  const { teacherId } = req.body;
  const batchId = String(req.params.id);
  if (!teacherId) throw new ApiError(400, 'teacherId is required');
  const existing = await db.select().from(schema.batchTeachers)
    .where(and(eq(schema.batchTeachers.batchId, batchId), eq(schema.batchTeachers.teacherId, teacherId))).limit(1);
  if (existing.length) throw new ApiError(409, 'Teacher already in this batch');
  await db.insert(schema.batchTeachers).values({ batchId, teacherId });
  res.json({ success: true, message: 'Teacher added to batch' });
}));

router.delete('/batches/:id/teachers/:teacherId', asyncHandler(async (req, res) => {
  const batchId = String(req.params.id);
  const teacherId = String(req.params.teacherId);
  await db.delete(schema.batchTeachers)
    .where(and(eq(schema.batchTeachers.batchId, batchId), eq(schema.batchTeachers.teacherId, teacherId)));
  res.json({ success: true, message: 'Teacher removed from batch' });
}));

router.post('/batches/:id/students', validate(addBatchStudentSchema), asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const batchId = String(req.params.id);
  if (!studentId) throw new ApiError(400, 'studentId is required');
  const existing = await db.select().from(schema.batchStudents)
    .where(and(eq(schema.batchStudents.batchId, batchId), eq(schema.batchStudents.studentId, studentId))).limit(1);
  if (existing.length) throw new ApiError(409, 'Student already in this batch');
  await db.insert(schema.batchStudents).values({ batchId, studentId });
  res.json({ success: true, message: 'Student added to batch' });
}));

router.delete('/batches/:id/students/:studentId', asyncHandler(async (req, res) => {
  const batchId = String(req.params.id);
  const studentId = String(req.params.studentId);
  await db.delete(schema.batchStudents)
    .where(and(eq(schema.batchStudents.batchId, batchId), eq(schema.batchStudents.studentId, studentId)));
  res.json({ success: true, message: 'Student removed from batch' });
}));

// ── Materials ──────────────────────────────────────────────────────────────
router.get('/materials', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status: fileType, order } = parsePagination(req.query);

  const conditions: any[] = [];
  if (fileType) conditions.push(eq(schema.materials.fileType, fileType as any));
  if (search) conditions.push(ilike(schema.materials.title, `%${sanitizeSearch(search)}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.materials).where(where);

  const data = await db
    .select({
      id: schema.materials.id, title: schema.materials.title, description: schema.materials.description,
      fileUrl: schema.materials.fileUrl, fileType: schema.materials.fileType, fileName: schema.materials.fileName,
      fileSize: schema.materials.fileSize, visibility: schema.materials.visibility, createdAt: schema.materials.createdAt,
      courseId: schema.materials.courseId, courseName: schema.courses.name,
      uploaderName: schema.users.name,
    })
    .from(schema.materials)
    .leftJoin(schema.courses, eq(schema.materials.courseId, schema.courses.id))
    .leftJoin(schema.users, eq(schema.materials.uploadedBy, schema.users.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.materials.createdAt) : desc(schema.materials.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

router.post('/materials', validate(createMaterialSchema), asyncHandler(async (req, res) => {
  const { title, description, fileUrl, fileType, fileName, fileSize, courseId, batchId, visibility, cloudinaryId } = req.body;
  if (!title || !fileUrl || !fileName) throw new ApiError(400, 'title, fileUrl, and fileName are required');
  const [mat] = await db.insert(schema.materials).values({
    title, description, fileUrl, fileType: fileType || 'document', fileName,
    fileSize, courseId, batchId, visibility: visibility !== false, cloudinaryId: cloudinaryId || '',
    uploadedBy: req.user!.id,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'material', mat.id, title, req.ip);
  res.status(201).json({ success: true, data: mat });
}));

router.delete('/materials/:id', asyncHandler(async (req, res) => {
  const materialId = String(req.params.id);
  const [material] = await db
    .select({ cloudinaryId: schema.materials.cloudinaryId })
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);
  await db.delete(schema.materials).where(eq(schema.materials.id, materialId));
  // Best-effort cleanup of the remote asset (no-op for local files).
  await deleteCloudinaryAsset(material?.cloudinaryId);
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'material', materialId, undefined, req.ip);
  res.json({ success: true, message: 'Material deleted' });
}));

// ── Settings ───────────────────────────────────────────────────────────────
router.get('/settings', asyncHandler(async (req, res) => {
  const rows = await db.select().from(schema.settings);
  const data: Record<string, string> = {};
  rows.forEach(r => { data[r.key] = r.value; });
  res.json({ success: true, data });
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const entries: Array<{ key: string; value: string }> = Object.entries(req.body).map(([key, value]) => ({
    key, value: String(value), updatedAt: new Date(),
  }));
  if (!entries.length) throw new ApiError(400, 'No settings to update');
  for (const entry of entries) {
    await db.insert(schema.settings).values({ key: entry.key, value: entry.value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: entry.value, updatedAt: new Date() } });
  }
  res.json({ success: true, message: 'Settings saved' });
}));

// ── Live Classes ───────────────────────────────────────────────────────────
router.get('/live-classes', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.liveClasses.status, status as any));
  if (search) conditions.push(ilike(schema.liveClasses.title, `%${sanitizeSearch(search)}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.liveClasses).where(where);

  const data = await db
    .select({
      id: schema.liveClasses.id, title: schema.liveClasses.title,
      scheduledDate: schema.liveClasses.scheduledDate, scheduledTime: schema.liveClasses.scheduledTime,
      duration: schema.liveClasses.duration, status: schema.liveClasses.status,
      meetingLink: schema.liveClasses.meetingLink, createdAt: schema.liveClasses.createdAt,
      teacherName: schema.users.name, batchName: schema.batches.name,
    })
    .from(schema.liveClasses)
    .leftJoin(schema.users, eq(schema.liveClasses.teacherId, schema.users.id))
    .leftJoin(schema.batches, eq(schema.liveClasses.batchId, schema.batches.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.liveClasses.scheduledDate) : desc(schema.liveClasses.scheduledDate))
    .limit(limit)
    .offset(offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

// ── Tests ──────────────────────────────────────────────────────────────────
router.get('/tests', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status, order } = parsePagination(req.query);

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.tests.status, status as any));
  if (search) conditions.push(ilike(schema.tests.title, `%${sanitizeSearch(search)}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.tests).where(where);

  const data = await db
    .select({
      id: schema.tests.id, title: schema.tests.title, duration: schema.tests.duration,
      totalMarks: schema.tests.totalMarks, status: schema.tests.status,
      startDate: schema.tests.startDate, endDate: schema.tests.endDate, createdAt: schema.tests.createdAt,
      teacherName: schema.users.name, courseName: schema.courses.name,
    })
    .from(schema.tests)
    .leftJoin(schema.users, eq(schema.tests.teacherId, schema.users.id))
    .leftJoin(schema.courses, eq(schema.tests.courseId, schema.courses.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.tests.createdAt) : desc(schema.tests.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit) });
}));

router.get('/tests/:testId/results', asyncHandler(async (req, res) => {
  const testId = String(req.params.testId);
  const [test] = await db
    .select({ id: schema.tests.id, title: schema.tests.title, totalMarks: schema.tests.totalMarks, passingMarks: schema.tests.passingMarks })
    .from(schema.tests).where(eq(schema.tests.id, testId)).limit(1);
  if (!test) throw new ApiError(404, 'Test not found');

  const results = await db
    .select({
      id: schema.testResults.id, marksObtained: schema.testResults.marksObtained,
      percentage: schema.testResults.percentage, status: schema.testResults.status,
      submittedAt: schema.testResults.submittedAt, remarks: schema.testResults.remarks,
      studentName: schema.users.name, studentEmail: schema.users.email,
    })
    .from(schema.testResults)
    .leftJoin(schema.users, eq(schema.testResults.studentId, schema.users.id))
    .where(eq(schema.testResults.testId, testId))
    .orderBy(desc(schema.testResults.submittedAt));

  res.json({ success: true, data: results, test });
}));

// ── Fees ───────────────────────────────────────────────────────────────────
router.get('/fees', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, order } = parsePagination(req.query);

  // For fee stats — run once, not per page
  const [[{ totalAmount }], [{ totalDiscount }]] = await Promise.all([
    db.select({ totalAmount: sql<number>`COALESCE(SUM(${schema.fees.finalAmount}), 0)` }).from(schema.fees),
    db.select({ totalDiscount: sql<number>`COALESCE(SUM(${schema.fees.discount}), 0)` }).from(schema.fees),
  ]);

  const conditions: any[] = [];
  if (search) {
    conditions.push(ilike(schema.users.name, `%${sanitizeSearch(search)}%`));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() })
    .from(schema.fees)
    .leftJoin(schema.users, eq(schema.fees.studentId, schema.users.id))
    .where(where);

  const data = await db
    .select({
      id: schema.fees.id, totalAmount: schema.fees.totalAmount, discount: schema.fees.discount,
      finalAmount: schema.fees.finalAmount, dueDate: schema.fees.dueDate, createdAt: schema.fees.createdAt,
      studentName: schema.users.name, studentEmail: schema.users.email,
      courseName: schema.courses.name,
    })
    .from(schema.fees)
    .leftJoin(schema.users, eq(schema.fees.studentId, schema.users.id))
    .leftJoin(schema.courses, eq(schema.fees.courseId, schema.courses.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.fees.createdAt) : desc(schema.fees.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    success: true, data,
    pagination: paginationMeta(total, page, limit),
    stats: { totalAmount, totalDiscount },
  });
}));

router.post('/fees', validate(createFeeSchema), asyncHandler(async (req, res) => {
  const { studentId, courseId, totalAmount, discount, dueDate } = req.body;
  if (!studentId || !totalAmount) throw new ApiError(400, 'studentId and totalAmount are required');
  const disc = parseFloat(discount || '0');
  const total = parseFloat(totalAmount);
  if (isNaN(total) || total <= 0) throw new ApiError(400, 'totalAmount must be a positive number');
  if (isNaN(disc) || disc < 0) throw new ApiError(400, 'discount must be a non-negative number');
  if (disc > total) throw new ApiError(400, 'discount cannot exceed totalAmount');
  const final = total - disc;
  const [fee] = await db.insert(schema.fees).values({
    studentId, courseId, totalAmount: total.toString(), discount: disc.toString(), finalAmount: final.toString(), dueDate: dueDate ? new Date(dueDate) : undefined,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'fee', fee.id, `₹${final} for studentId=${studentId}`, req.ip);
  res.status(201).json({ success: true, data: fee });
}));

router.post('/fees/:feeId/payments', validate(createPaymentSchema), asyncHandler(async (req, res) => {
  const { amount, paymentMode, transactionId, receiptNumber, notes } = req.body;
  const feeId = String(req.params.feeId);
  if (!amount || !paymentMode) throw new ApiError(400, 'amount and paymentMode are required');
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) throw new ApiError(400, 'amount must be a positive number');
  const allowedModes = ['cash', 'upi', 'card', 'net_banking', 'other'];
  if (!allowedModes.includes(paymentMode)) throw new ApiError(400, `paymentMode must be one of: ${allowedModes.join(', ')}`);
  const [fee] = await db.select().from(schema.fees).where(eq(schema.fees.id, feeId)).limit(1);
  if (!fee) throw new ApiError(404, 'Fee record not found');

  // M1: reject overpayment — paid + this amount may never exceed final_amount.
  // studentId is derived from the fee row; the body's studentId is never trusted.
  const [{ total: paidTotal }] = await db
    .select({ total: sql<string>`COALESCE(SUM(${schema.payments.amount}::numeric), 0)::text` })
    .from(schema.payments)
    .where(eq(schema.payments.feeId, fee.id));
  const alreadyPaid = Number(paidTotal ?? 0);
  const finalAmount = Number(fee.finalAmount);
  if (alreadyPaid + parsedAmount > finalAmount) {
    throw new ApiError(422, `Payment exceeds the outstanding balance (outstanding: ${Math.max(finalAmount - alreadyPaid, 0).toFixed(2)})`);
  }

  const [payment] = await db.insert(schema.payments).values({
    feeId: fee.id, studentId: fee.studentId, amount: amount.toString(),
    paymentMode, transactionId, receiptNumber, notes, recordedBy: req.user!.id,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'payment', payment.id, `₹${amount} recorded for feeId=${fee.id}`, req.ip);

  // Notify student of payment receipt via SSE + DB notification
  const amountFormatted = `₹${Number(amount).toLocaleString('en-IN')}`;
  const [notif] = await db.insert(schema.notifications).values({
    receiverId: fee.studentId, senderId: req.user!.id, type: 'fee',
    title: 'Payment Received',
    message: `${amountFormatted} payment recorded via ${paymentMode || 'cash'}. Receipt #${receiptNumber || payment.id.slice(-6).toUpperCase()}.`,
  }).returning();
  emitToUser(fee.studentId, { id: notif.id, title: notif.title, message: notif.message, type: 'fee', createdAt: new Date().toISOString(), isRead: false });

  res.status(201).json({ success: true, data: payment });
}));

router.get('/fees/:feeId/receipt', asyncHandler(async (req, res) => {
  const feeId = String(req.params.feeId);
  const [fee] = await db
    .select({
      id: schema.fees.id, totalAmount: schema.fees.totalAmount, discount: schema.fees.discount,
      finalAmount: schema.fees.finalAmount, dueDate: schema.fees.dueDate, createdAt: schema.fees.createdAt,
      courseName: schema.courses.name, studentName: schema.users.name, studentEmail: schema.users.email,
    })
    .from(schema.fees)
    .leftJoin(schema.courses, eq(schema.fees.courseId, schema.courses.id))
    .leftJoin(schema.users, eq(schema.fees.studentId, schema.users.id))
    .where(eq(schema.fees.id, feeId)).limit(1);
  if (!fee) throw new ApiError(404, 'Fee not found');
  const payments = await db.select().from(schema.payments).where(eq(schema.payments.feeId, feeId)).orderBy(desc(schema.payments.paidAt));
  res.json({ success: true, data: { fee, payments } });
}));

// ── Subjects (per course) ───────────────────────────────────────────────────
router.get('/courses/:courseId/subjects', asyncHandler(async (req, res) => {
  const courseId = String(req.params.courseId);
  const data = await db.select().from(schema.subjects).where(eq(schema.subjects.courseId, courseId)).orderBy(schema.subjects.order);
  res.json({ success: true, data });
}));

router.post('/courses/:courseId/subjects', validate(subjectBodySchema), asyncHandler(async (req, res) => {
  const courseId = String(req.params.courseId);
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const existing = await db.select({ order: schema.subjects.order }).from(schema.subjects).where(eq(schema.subjects.courseId, courseId)).orderBy(desc(schema.subjects.order)).limit(1);
  const order = existing.length ? (existing[0].order ?? 0) + 1 : 1;
  const [sub] = await db.insert(schema.subjects).values({ courseId, name, description, order }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'subject', sub.id, name, req.ip);
  res.status(201).json({ success: true, data: sub });
}));

router.put('/courses/:courseId/subjects/:subId', validate(updateSubjectSchema), asyncHandler(async (req, res) => {
  const subId = String(req.params.subId);
  const { name, description } = req.body;
  if (name !== undefined || description !== undefined) {
    await db.update(schema.subjects).set({ name, description }).where(eq(schema.subjects.id, subId));
  }
  res.json({ success: true, message: 'Subject updated' });
}));

router.delete('/courses/:courseId/subjects/:subId', asyncHandler(async (req, res) => {
  const subId = String(req.params.subId);
  await db.delete(schema.subjects).where(eq(schema.subjects.id, subId));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'subject', subId, undefined, req.ip);
  res.json({ success: true, message: 'Subject deleted' });
}));

// ── Chapters (per subject) ──────────────────────────────────────────────────
router.get('/subjects/:subjectId/chapters', asyncHandler(async (req, res) => {
  const subjectId = String(req.params.subjectId);
  const data = await db.select().from(schema.chapters).where(eq(schema.chapters.subjectId, subjectId)).orderBy(schema.chapters.order);
  res.json({ success: true, data });
}));

router.post('/subjects/:subjectId/chapters', validate(chapterBodySchema), asyncHandler(async (req, res) => {
  const subjectId = String(req.params.subjectId);
  const { title, description, videoUrl, duration } = req.body;
  if (!title) throw new ApiError(400, 'title is required');
  const existing = await db.select({ order: schema.chapters.order }).from(schema.chapters).where(eq(schema.chapters.subjectId, subjectId)).orderBy(desc(schema.chapters.order)).limit(1);
  const order = existing.length ? (existing[0].order ?? 0) + 1 : 1;
  const [ch] = await db.insert(schema.chapters).values({ subjectId, title, description, videoUrl, duration: duration ? parseInt(duration) : null, order }).returning();
  res.status(201).json({ success: true, data: ch });
}));

router.put('/subjects/:subjectId/chapters/:chapterId', validate(updateChapterSchema), asyncHandler(async (req, res) => {
  const chapterId = String(req.params.chapterId);
  const { title, description, videoUrl, duration } = req.body;
  await db.update(schema.chapters).set({ title, description, videoUrl, duration: duration ? parseInt(duration) : null }).where(eq(schema.chapters.id, chapterId));
  res.json({ success: true, message: 'Chapter updated' });
}));

router.delete('/subjects/:subjectId/chapters/:chapterId', asyncHandler(async (req, res) => {
  const chapterId = String(req.params.chapterId);
  await db.delete(schema.chapters).where(eq(schema.chapters.id, chapterId));
  res.json({ success: true, message: 'Chapter deleted' });
}));

// ── Notification Broadcast ──────────────────────────────────────────────────
router.post('/notifications/broadcast', validate(broadcastNotificationSchema), asyncHandler(async (req, res) => {
  const { title, message, type = 'info', targetRole, batchId } = req.body;
  if (!title || !message) throw new ApiError(400, 'title and message required');
  // Prevent targeting admin accounts — broadcasts are for students/teachers only
  const allowedTargetRoles = ['student', 'teacher'];
  if (targetRole && !allowedTargetRoles.includes(targetRole)) {
    throw new ApiError(400, `targetRole must be one of: ${allowedTargetRoles.join(', ')}`);
  }

  let targetUsers: { id: string }[] = [];
  if (batchId) {
    const batchIdValue = String(batchId);
    const students = await db.select({ id: schema.batchStudents.studentId }).from(schema.batchStudents).where(eq(schema.batchStudents.batchId, batchIdValue));
    const teachers = await db.select({ id: schema.batchTeachers.teacherId }).from(schema.batchTeachers).where(eq(schema.batchTeachers.batchId, batchIdValue));
    targetUsers = [...students.map(s => ({ id: s.id })), ...teachers.map(t => ({ id: t.id }))];
  } else if (targetRole) {
    targetUsers = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.role, targetRole));
  } else {
    targetUsers = await db.select({ id: schema.users.id }).from(schema.users).where(ne(schema.users.role, 'admin'));
  }

  if (targetUsers.length) {
    const inserted = await db.insert(schema.notifications).values(
      targetUsers.map(u => ({ receiverId: u.id, senderId: req.user!.id, type, title, message }))
    ).returning();
    // Push SSE to all recipients who are currently connected
    const event = { id: inserted[0]?.id, title, message, type, createdAt: new Date().toISOString(), isRead: false };
    emitToUsers(targetUsers.map(u => u.id), event);
  }
  await logAudit(req.user!.id, req.user!.role, 'BROADCAST', 'notification', undefined, `"${title}" → ${targetUsers.length} users`, req.ip);
  res.json({ success: true, message: `Sent to ${targetUsers.length} users` });
}));

// ── Audit Logs ─────────────────────────────────────────────────────────────
router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page, limit, offset, search, status: entity, order } = parsePagination(req.query, 20);
  const action = (req.query.action as string || '').trim();
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const exportAll = req.query.all === 'true';

  const conditions: any[] = [];
  if (entity) conditions.push(eq(schema.auditLogs.entity, entity));
  if (action) conditions.push(eq(schema.auditLogs.action, action));
  if (from) conditions.push(sql`${schema.auditLogs.createdAt} >= ${new Date(from)}`);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(sql`${schema.auditLogs.createdAt} <= ${toDate}`);
  }
  if (search) {
    conditions.push(or(
      ilike(schema.auditLogs.action, `%${sanitizeSearch(search)}%`),
      ilike(schema.auditLogs.details, `%${sanitizeSearch(search)}%`),
      ilike(schema.users.name, `%${sanitizeSearch(search)}%`),
    )!);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .where(where);

  // Action-level stats for the unfiltered dataset (ignores filters for summary)
  const actionStats = await db
    .select({ action: schema.auditLogs.action, total: count() })
    .from(schema.auditLogs)
    .groupBy(schema.auditLogs.action);

  const baseQuery = db
    .select({
      id: schema.auditLogs.id, action: schema.auditLogs.action, entity: schema.auditLogs.entity,
      entityId: schema.auditLogs.entityId, details: schema.auditLogs.details,
      ipAddress: schema.auditLogs.ipAddress, createdAt: schema.auditLogs.createdAt,
      userName: schema.users.name, userRole: schema.auditLogs.userRole,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
    .where(where)
    .orderBy(order === 'asc' ? asc(schema.auditLogs.createdAt) : desc(schema.auditLogs.createdAt));

  const data = exportAll
    ? await baseQuery.limit(5000)
    : await baseQuery.limit(limit).offset(offset);

  res.json({ success: true, data, pagination: paginationMeta(total, page, limit), total, actionStats });
}));

export default router;
