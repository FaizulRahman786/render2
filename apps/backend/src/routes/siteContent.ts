// ============================================
// ADMIN PUBLIC SITE CMS (requireAdmin)
// ============================================
// Structured content management for the public institute website:
//   admissions, fee structures, achievements, public results, gallery,
//   reviews (moderation), blog posts, FAQs, navigation, homepage sections,
//   long-form pages (story), custom pages (HTML/CSS/JS, sandboxed serving).
//
// Conventions:
//   - Every entity: list (paginated + search + status filter), create,
//     update, archive (soft), publish/unpublish.
//   - Writes are sanitized + audit-logged. Destructive actions archive.
//   - Custom page code is UNTRUSTED ACTIVE CONTENT: served only through the
//     isolated sandboxed iframe route (/public/custom/*), never inside the
//     privileged application shell.

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import crypto from 'crypto';
import { eq, and, desc, asc, count, or, ilike } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { config } from '../config/env.js';

const router: ExpressRouter = Router();
router.use(authenticate, requireAdmin);

// ── Helpers ─────────────────────────────────────────────────────────────────
async function logAudit(userId: string | undefined, userRole: string | undefined, action: string, entity: string, entityId?: string, details?: string, ipAddress?: string) {
  try {
    await db.insert(schema.auditLogs).values({ userId, userRole, action, entity, entityId, details, ipAddress });
  } catch {}
}

const nowIso = () => new Date();

function slugify(s: string): string {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export const RESERVED_SLUGS = new Set([
  'admin', 'teacher', 'student', 'login', 'auth', 'api', 'preview',
  'courses', 'faculty', 'notices', 'events', 'contact', 'admissions',
  'fees', 'achievements', 'results', 'gallery', 'reviews', 'story', 'blog', 'faqs',
  'assets', 'public', 'uploads', 'home', 'index',
]);

const STATUS_ENUM = ['draft', 'published', 'archived'] as const;

// Generic CRUD factory — consistent list/create/update/archive/publish for all
// structured CMS entities. `fields` selects the exposed columns; `textFields`
// are the searchable text columns.
function crudRoutes(config2: {
  base: string;
  entity: string;
  table: any;
  fields: Record<string, any>;
  search: string[];
  listOrder?: any;
  statusField?: string;
  extra?: (router2: ExpressRouter) => void;
}) {
  const { base, entity, table, fields, search, listOrder, statusField = 'cmsStatus', extra } = config2;

  router.get(`/${base}`, asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
    const offset = (page - 1) * limit;
    const q = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const conditions: any[] = [];
    if (status) conditions.push(eq(table[statusField], status as any));
    if (q) {
      conditions.push(or(...search.map((f) => ilike(table[f], `%${q}%`))));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(table).where(where);
    const data = await db.select(fields).from(table).where(where)
      .orderBy(listOrder ?? desc(table.createdAt))
      .limit(limit).offset(offset);

    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }));

  // Register extra routes BEFORE the generic POST/PUT/DELETE handlers so
  // middleware routes (e.g. blog slug uniquify) actually take effect.
  if (extra) extra(router);

  router.post(`/${base}`, asyncHandler(async (req, res) => {
    const values: Record<string, any> = { ...req.body };
    delete values.id; delete values.createdAt; delete values.updatedAt; delete values.publishedAt;
    delete values.createdBy; delete values.updatedBy;
    if (statusField in values) delete values[statusField];
    values.createdBy = req.user!.id;
    const [inserted] = await db.insert(table).values(values).returning(fields);
    await logAudit(req.user!.id, req.user!.role, 'CREATE', entity, inserted?.id, JSON.stringify(values).slice(0, 500), req.ip);
    res.status(201).json({ success: true, data: inserted, message: 'Created' });
  }));

  router.put(`/${base}/:id`, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const patch: Record<string, any> = { ...req.body };
    delete patch.id; delete patch.createdAt; delete patch.publishedAt;
    delete patch.createdBy; delete patch.updatedBy; delete patch.updatedAt;
    patch.updatedBy = req.user!.id;
    patch.updatedAt = nowIso();
    const [updated] = await db.update(table).set(patch).where(eq(table.id, id)).returning(fields);
    if (!updated) throw new ApiError(404, `${entity} not found`);
    await logAudit(req.user!.id, req.user!.role, 'UPDATE', entity, id, JSON.stringify(patch).slice(0, 500), req.ip);
    res.json({ success: true, data: updated, message: 'Updated' });
  }));

  router.post(`/${base}/:id/publish`, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const [updated] = await db.update(table).set({ [statusField]: 'published', publishedAt: nowIso(), updatedAt: nowIso(), updatedBy: req.user!.id })
      .where(eq(table.id, id)).returning(fields);
    if (!updated) throw new ApiError(404, `${entity} not found`);
    await logAudit(req.user!.id, req.user!.role, 'PUBLISH', entity, id, 'Published', req.ip);
    res.json({ success: true, data: updated, message: 'Published — visible on the public site now' });
  }));

  router.post(`/${base}/:id/unpublish`, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const [updated] = await db.update(table).set({ [statusField]: 'draft', updatedAt: nowIso(), updatedBy: req.user!.id })
      .where(eq(table.id, id)).returning(fields);
    if (!updated) throw new ApiError(404, `${entity} not found`);
    await logAudit(req.user!.id, req.user!.role, 'UNPUBLISH', entity, id, 'Unpublished', req.ip);
    res.json({ success: true, data: updated, message: 'Unpublished — removed from the public site' });
  }));

  // Archive = soft delete; records are never hard-deleted from the CMS.
  router.delete(`/${base}/:id`, asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const [updated] = await db.update(table).set({ [statusField]: 'archived', updatedAt: nowIso(), updatedBy: req.user!.id })
      .where(eq(table.id, id)).returning(fields);
    if (!updated) throw new ApiError(404, `${entity} not found`);
    await logAudit(req.user!.id, req.user!.role, 'ARCHIVE', entity, id, 'Archived', req.ip);
    res.json({ success: true, message: 'Archived' });
  }));
}

// ── Content entities (structured collections) ───────────────────────────────
const PUBLISHED_FILTER = eq(schema.admissions.cmsStatus, 'published');

crudRoutes({
  base: 'admissions',
  entity: 'admission',
  table: schema.admissions,
  fields: { id: schema.admissions.id, session: schema.admissions.session, status: schema.admissions.status, title: schema.admissions.title, subtitle: schema.admissions.subtitle, description: schema.admissions.description, openingDate: schema.admissions.openingDate, closingDate: schema.admissions.closingDate, eligibility: schema.admissions.eligibility, documents: schema.admissions.documents, process: schema.admissions.process, programs: schema.admissions.programs, instructions: schema.admissions.instructions, contactPhone: schema.admissions.contactPhone, contactEmail: schema.admissions.contactEmail, ctaLabel: schema.admissions.ctaLabel, ctaUrl: schema.admissions.ctaUrl, featured: schema.admissions.featured, cmsStatus: schema.admissions.cmsStatus, sortOrder: schema.admissions.sortOrder, publishedAt: schema.admissions.publishedAt, updatedAt: schema.admissions.updatedAt },
  search: ['session', 'title'],
  listOrder: desc(schema.admissions.createdAt),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'fee-structures',
  entity: 'fee structure',
  table: schema.feeStructures,
  fields: { id: schema.feeStructures.id, session: schema.feeStructures.session, classLevel: schema.feeStructures.classLevel, admissionFee: schema.feeStructures.admissionFee, tuitionFee: schema.feeStructures.tuitionFee, monthlyFee: schema.feeStructures.monthlyFee, examFee: schema.feeStructures.examFee, transportFee: schema.feeStructures.transportFee, otherCharges: schema.feeStructures.otherCharges, totalFee: schema.feeStructures.totalFee, discountInfo: schema.feeStructures.discountInfo, notes: schema.feeStructures.notes, paymentSchedule: schema.feeStructures.paymentSchedule, cmsStatus: schema.feeStructures.cmsStatus, sortOrder: schema.feeStructures.sortOrder, publishedAt: schema.feeStructures.publishedAt, updatedAt: schema.feeStructures.updatedAt },
  search: ['session', 'classLevel'],
  listOrder: asc(schema.feeStructures.session),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'achievements',
  entity: 'achievement',
  table: schema.achievements,
  fields: { id: schema.achievements.id, title: schema.achievements.title, description: schema.achievements.description, category: schema.achievements.category, achievementDate: schema.achievements.achievementDate, imageUrl: schema.achievements.imageUrl, awardOrganization: schema.achievements.awardOrganization, studentName: schema.achievements.studentName, level: schema.achievements.level, featured: schema.achievements.featured, cmsStatus: schema.achievements.cmsStatus, sortOrder: schema.achievements.sortOrder, publishedAt: schema.achievements.publishedAt, updatedAt: schema.achievements.updatedAt },
  search: ['title', 'studentName', 'awardOrganization'],
  listOrder: desc(schema.achievements.achievementDate),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'public-results',
  entity: 'public result',
  table: schema.publicResults,
  fields: { id: schema.publicResults.id, session: schema.publicResults.session, exam: schema.publicResults.exam, classLevel: schema.publicResults.classLevel, studentName: schema.publicResults.studentName, rank: schema.publicResults.rank, percentage: schema.publicResults.percentage, grade: schema.publicResults.grade, description: schema.publicResults.description, resultType: schema.publicResults.resultType, displayDate: schema.publicResults.displayDate, featured: schema.publicResults.featured, cmsStatus: schema.publicResults.cmsStatus, sortOrder: schema.publicResults.sortOrder, publishedAt: schema.publicResults.publishedAt, updatedAt: schema.publicResults.updatedAt },
  search: ['studentName', 'exam', 'classLevel', 'session'],
  listOrder: desc(schema.publicResults.displayDate),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'gallery-items',
  entity: 'gallery item',
  table: schema.galleryItems,
  fields: { id: schema.galleryItems.id, title: schema.galleryItems.title, caption: schema.galleryItems.caption, altText: schema.galleryItems.altText, imageUrl: schema.galleryItems.imageUrl, category: schema.galleryItems.category, takenAt: schema.galleryItems.takenAt, featured: schema.galleryItems.featured, cmsStatus: schema.galleryItems.cmsStatus, sortOrder: schema.galleryItems.sortOrder, publishedAt: schema.galleryItems.publishedAt, updatedAt: schema.galleryItems.updatedAt },
  search: ['title', 'caption', 'category'],
  listOrder: desc(schema.galleryItems.createdAt),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'faqs',
  entity: 'FAQ',
  table: schema.faqs,
  fields: { id: schema.faqs.id, category: schema.faqs.category, question: schema.faqs.question, answer: schema.faqs.answer, cmsStatus: schema.faqs.cmsStatus, sortOrder: schema.faqs.sortOrder, updatedAt: schema.faqs.updatedAt },
  search: ['question', 'answer', 'category'],
  listOrder: asc(schema.faqs.sortOrder),
  statusField: 'cmsStatus',
});

crudRoutes({
  base: 'blog-posts',
  entity: 'blog post',
  table: schema.blogPosts,
  fields: { id: schema.blogPosts.id, slug: schema.blogPosts.slug, title: schema.blogPosts.title, excerpt: schema.blogPosts.excerpt, content: schema.blogPosts.content, coverImage: schema.blogPosts.coverImage, category: schema.blogPosts.category, tags: schema.blogPosts.tags, author: schema.blogPosts.author, featured: schema.blogPosts.featured, cmsStatus: schema.blogPosts.cmsStatus, publishAt: schema.blogPosts.publishAt, publishedAt: schema.blogPosts.publishedAt, seoTitle: schema.blogPosts.seoTitle, seoDescription: schema.blogPosts.seoDescription, ogImage: schema.blogPosts.ogImage, updatedAt: schema.blogPosts.updatedAt },
  search: ['title', 'excerpt', 'category'],
  listOrder: desc(schema.blogPosts.publishedAt),
  statusField: 'cmsStatus',
  extra: (r) => {
    // Slug is unique — validate + auto-uniquify before insert/update.
    r.post('/blog-posts', asyncHandler(async (req, res, next) => {
      try {
        let slug = slugify(req.body?.slug || req.body?.title);
        if (!slug) throw new ApiError(400, 'A slug or title is required');
        const existing = await db.select({ id: schema.blogPosts.id }).from(schema.blogPosts).where(eq(schema.blogPosts.slug, slug));
        if (existing.length) slug = `${slug}-${Date.now().toString(36)}`;
        req.body = { ...req.body, slug };
        next();
      } catch (e) { next(e); }
    }));
  },
});

// ── Reviews (moderation workflow) ───────────────────────────────────────────
crudRoutes({
  base: 'reviews',
  entity: 'review',
  table: schema.reviews,
  fields: { id: schema.reviews.id, name: schema.reviews.name, relationship: schema.reviews.relationship, rating: schema.reviews.rating, review: schema.reviews.review, profileImage: schema.reviews.profileImage, consent: schema.reviews.consent, status: schema.reviews.status, featured: schema.reviews.featured, sortOrder: schema.reviews.sortOrder, source: schema.reviews.source, adminNote: schema.reviews.adminNote, reviewedAt: schema.reviews.reviewedAt, createdAt: schema.reviews.createdAt, updatedAt: schema.reviews.updatedAt },
  search: ['name', 'review'],
  listOrder: desc(schema.reviews.createdAt),
  statusField: 'status',
  extra: (r) => {
    // Moderation: approve/reject stamps reviewed_at/reviewed_by.
    r.put('/reviews/:id/moderate', asyncHandler(async (req, res) => {
      const id = String(req.params.id);
      const { decision } = req.body as { decision?: string };
      if (!['approved', 'rejected'].includes(decision || '')) throw new ApiError(400, 'decision must be approved or rejected');
      const [updated] = await db.update(schema.reviews).set({
        status: decision as any, reviewedAt: nowIso(), reviewedBy: req.user!.id, updatedAt: nowIso(),
      }).where(eq(schema.reviews.id, id)).returning();
      if (!updated) throw new ApiError(404, 'Review not found');
      await logAudit(req.user!.id, req.user!.role, decision === 'approved' ? 'APPROVE' : 'REJECT', 'review', id, decision, req.ip);
      res.json({ success: true, data: updated, message: decision === 'approved' ? 'Review approved and published' : 'Review rejected' });
    }));
  },
});

// ── Public Faculty CMS ───────────────────────────────────────────────────────
crudRoutes({
  base: 'faculty',
  entity: 'faculty member',
  table: schema.publicFaculty,
  fields: {
    id: schema.publicFaculty.id,
    name: schema.publicFaculty.name,
    designation: schema.publicFaculty.designation,
    department: schema.publicFaculty.department,
    subject: schema.publicFaculty.subject,
    qualification: schema.publicFaculty.qualification,
    experience: schema.publicFaculty.experience,
    specialization: schema.publicFaculty.specialization,
    bio: schema.publicFaculty.bio,
    profileImage: schema.publicFaculty.profileImage,
    featured: schema.publicFaculty.featured,
    displayOrder: schema.publicFaculty.displayOrder,
    cmsStatus: schema.publicFaculty.cmsStatus,
    publishedAt: schema.publicFaculty.publishedAt,
    updatedAt: schema.publicFaculty.updatedAt,
  },
  search: ['name', 'designation', 'department', 'subject', 'specialization'],
  listOrder: asc(schema.publicFaculty.displayOrder),
  statusField: 'cmsStatus',
});

// ── Public Courses CMS ───────────────────────────────────────────────────────
crudRoutes({
  base: 'courses',
  entity: 'course',
  table: schema.publicCourses,
  fields: {
    id: schema.publicCourses.id,
    name: schema.publicCourses.name,
    shortDescription: schema.publicCourses.shortDescription,
    description: schema.publicCourses.description,
    duration: schema.publicCourses.duration,
    eligibility: schema.publicCourses.eligibility,
    level: schema.publicCourses.level,
    subjects: schema.publicCourses.subjects,
    highlights: schema.publicCourses.highlights,
    feeReference: schema.publicCourses.feeReference,
    admissionAvailable: schema.publicCourses.admissionAvailable,
    imageUrl: schema.publicCourses.imageUrl,
    featured: schema.publicCourses.featured,
    displayOrder: schema.publicCourses.displayOrder,
    cmsStatus: schema.publicCourses.cmsStatus,
    publishedAt: schema.publicCourses.publishedAt,
    updatedAt: schema.publicCourses.updatedAt,
  },
  search: ['name', 'shortDescription', 'level', 'subjects'],
  listOrder: asc(schema.publicCourses.displayOrder),
  statusField: 'cmsStatus',
});

// ── Long-form pages (Our Story) ─────────────────────────────────────────────
router.get('/site-pages', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.sitePages.id, slug: schema.sitePages.slug, title: schema.sitePages.title,
    subtitle: schema.sitePages.subtitle, content: schema.sitePages.content, coverImage: schema.sitePages.coverImage,
    status: schema.sitePages.status, publishedAt: schema.sitePages.publishedAt, updatedAt: schema.sitePages.updatedAt,
  }).from(schema.sitePages).orderBy(asc(schema.sitePages.slug));
  res.json({ success: true, data });
}));

router.put('/site-pages/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  if (!slug) throw new ApiError(400, 'slug is required');
  const { title, subtitle, content, coverImage, seoTitle, seoDescription, status } = req.body ?? {};
  const patch: Record<string, any> = {
    title: String(title || slug).slice(0, 200),
    subtitle: subtitle ? String(subtitle).slice(0, 500) : null,
    content: (content && typeof content === 'object') ? content : {},
    coverImage: coverImage ? String(coverImage).slice(0, 2000) : null,
    seoTitle: seoTitle ? String(seoTitle).slice(0, 200) : null,
    seoDescription: seoDescription ? String(seoDescription).slice(0, 500) : null,
    status: STATUS_ENUM.includes(status) ? status : 'draft',
    updatedBy: req.user!.id,
    updatedAt: nowIso(),
  };
  if (patch.status === 'published') patch.publishedAt = nowIso();
  const [row] = await db.select().from(schema.sitePages).where(eq(schema.sitePages.slug, slug));
  if (row) {
    await db.update(schema.sitePages).set(patch).where(eq(schema.sitePages.slug, slug));
  } else {
    await db.insert(schema.sitePages).values({
      slug,
      title: String(patch.title || slug),
      subtitle: patch.subtitle ?? null,
      content: patch.content ?? {},
      coverImage: patch.coverImage ?? null,
      seoTitle: patch.seoTitle ?? null,
      seoDescription: patch.seoDescription ?? null,
      status: patch.status,
      publishedAt: patch.publishedAt ?? null,
      createdBy: req.user!.id,
      updatedAt: patch.updatedAt,
    });
  }
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'site page', slug, `Saved "${patch.title}"`, req.ip);
  res.json({ success: true, message: 'Page saved' });
}));

router.post('/site-pages/:slug/publish', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const [updated] = await db.update(schema.sitePages).set({ status: 'published', publishedAt: nowIso(), updatedAt: nowIso() })
    .where(eq(schema.sitePages.slug, slug)).returning();
  if (!updated) throw new ApiError(404, 'Page not found');
  await logAudit(req.user!.id, req.user!.role, 'PUBLISH', 'site page', slug, 'Published', req.ip);
  res.json({ success: true, message: 'Published' });
}));

// ── Homepage sections ───────────────────────────────────────────────────────
router.get('/homepage-sections', asyncHandler(async (req, res) => {
  const data = await db.select().from(schema.homepageSections).orderBy(asc(schema.homepageSections.sortOrder));
  res.json({ success: true, data });
}));

router.put('/homepage-sections/:key', asyncHandler(async (req, res) => {
  const key = String(req.params.key);
  const allowed: Record<string, any> = {};
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (['enabled', 'title', 'subtitle', 'sortOrder', 'ctaLabel', 'ctaUrl', 'featuredIds', 'settings'].includes(k)) {
      allowed[k] = v;
    }
  }
  if ('featuredIds' in allowed && !Array.isArray(allowed.featuredIds)) throw new ApiError(400, 'featuredIds must be an array');
  if ('settings' in allowed && typeof allowed.settings !== 'object') throw new ApiError(400, 'settings must be an object');
  allowed.updatedAt = nowIso();
  const [row] = await db.select().from(schema.homepageSections).where(eq(schema.homepageSections.key, key));
  if (row) {
    await db.update(schema.homepageSections).set(allowed).where(eq(schema.homepageSections.key, key));
  } else {
    await db.insert(schema.homepageSections).values({ key, ...allowed });
  }
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'homepage section', key, 'Updated', req.ip);
  res.json({ success: true, message: 'Section updated' });
}));

// ── Navigation ──────────────────────────────────────────────────────────────
router.get('/navigation', asyncHandler(async (req, res) => {
  const data = await db.select().from(schema.navigationItems).orderBy(asc(schema.navigationItems.position), asc(schema.navigationItems.label));
  res.json({ success: true, data });
}));

router.post('/navigation', asyncHandler(async (req, res) => {
  const { label, href, parentId, position, visibility, target, isSystem } = req.body ?? {};
  if (!label || !String(label).trim()) throw new ApiError(400, 'label is required');
  if (!href || !String(href).trim()) throw new ApiError(400, 'href is required');
  const cleanHref = String(href).trim();
  if (/^\s*javascript:/i.test(cleanHref)) throw new ApiError(400, 'javascript: URLs are not allowed');
  const [inserted] = await db.insert(schema.navigationItems).values({
    label: String(label).trim().slice(0, 80),
    href: cleanHref.slice(0, 500),
    parentId: parentId || null,
    position: parseInt(position ?? '0') || 0,
    visibility: visibility !== false,
    target: target === '_blank' ? '_blank' : 'self',
    isSystem: isSystem === true,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'navigation item', inserted.id, cleanHref, req.ip);
  res.status(201).json({ success: true, data: inserted, message: 'Navigation item created' });
}));

router.put('/navigation/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const patch: Record<string, any> = {};
  const { label, href, parentId, position, visibility, target } = req.body ?? {};
  if (label !== undefined) {
    if (!String(label).trim()) throw new ApiError(400, 'label is required');
    patch.label = String(label).trim().slice(0, 80);
  }
  if (href !== undefined) {
    if (!String(href).trim()) throw new ApiError(400, 'href is required');
    if (/^\s*javascript:/i.test(String(href))) throw new ApiError(400, 'javascript: URLs are not allowed');
    patch.href = String(href).trim().slice(0, 500);
  }
  if (parentId !== undefined) patch.parentId = parentId || null;
  if (position !== undefined) patch.position = parseInt(position) || 0;
  if (visibility !== undefined) patch.visibility = visibility !== false;
  if (target !== undefined) patch.target = target === '_blank' ? '_blank' : 'self';
  patch.updatedAt = nowIso();
  const [updated] = await db.update(schema.navigationItems).set(patch).where(eq(schema.navigationItems.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Navigation item not found');
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'navigation item', id, 'Updated', req.ip);
  res.json({ success: true, data: updated, message: 'Navigation item updated' });
}));

router.delete('/navigation/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [item] = await db.select().from(schema.navigationItems).where(eq(schema.navigationItems.id, id));
  if (!item) throw new ApiError(404, 'Navigation item not found');
  if (item.isSystem) throw new ApiError(403, 'System navigation items cannot be deleted — hide them instead');
  await db.delete(schema.navigationItems).where(eq(schema.navigationItems.id, id));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'navigation item', id, 'Deleted', req.ip);
  res.json({ success: true, message: 'Navigation item deleted' });
}));

// ── Public site overview (CMS status) ───────────────────────────────────────
router.get('/cms-stats', asyncHandler(async (req, res) => {
  const [
    pendingReviews, newEnquiries, upcomingEvents, draftPosts, publishedCounts,
    galleryCount, faqCount, achievementCount, customPageCount, recentActivity,
  ] = await Promise.all([
    db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.status, 'pending')),
    db.select({ n: count() }).from(schema.enquiries).where(eq(schema.enquiries.status, 'new')),
    db.select({ n: count() }).from(schema.events).where(and(eq(schema.events.status, 'published'), eq(schema.events.featured, true))),
    db.select({ n: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.cmsStatus, 'draft')),
    db.select({ n: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.cmsStatus, 'published')),
    db.select({ n: count() }).from(schema.galleryItems).where(eq(schema.galleryItems.cmsStatus, 'published')),
    db.select({ n: count() }).from(schema.faqs).where(eq(schema.faqs.cmsStatus, 'published')),
    db.select({ n: count() }).from(schema.achievements).where(eq(schema.achievements.cmsStatus, 'published')),
    db.select({ n: count() }).from(schema.customPages).where(eq(schema.customPages.status, 'published')),
    db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entity, 'cms')).orderBy(desc(schema.auditLogs.createdAt)).limit(10),
  ]);

  const settings = await db.select().from(schema.settings);
  const map: Record<string, string> = {};
  settings.forEach((r) => { map[r.key] = r.value; });

  const sections = await db.select().from(schema.homepageSections).orderBy(asc(schema.homepageSections.sortOrder));

  res.json({
    success: true,
    data: {
      counts: {
        pendingReviews: pendingReviews[0]?.n ?? 0,
        newEnquiries: newEnquiries[0]?.n ?? 0,
        featuredUpcomingEvents: upcomingEvents[0]?.n ?? 0,
        draftBlogPosts: draftPosts[0]?.n ?? 0,
        publishedBlogPosts: publishedCounts[0]?.n ?? 0,
        galleryItems: galleryCount[0]?.n ?? 0,
        publishedFaqs: faqCount[0]?.n ?? 0,
        publishedAchievements: achievementCount[0]?.n ?? 0,
        publishedCustomPages: customPageCount[0]?.n ?? 0,
      },
      homepageMode: map.homepageMode || 'cms',
      maintenance: map.maintenanceMode === 'true',
      sections: sections.map((s) => ({ key: s.key, enabled: s.enabled, sortOrder: s.sortOrder })),
      recentActivity: recentActivity.map((a) => ({
        action: a.action, details: a.details, createdAt: a.createdAt,
      })),
    },
  });
}));

// ── Custom pages ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 512 * 1024; // 512KB per text file
const MAX_ASSET_SIZE = 8 * 1024 * 1024; // 8MB per binary asset
const MAX_FILES = 50;

function fileKindFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js' || ext === 'mjs') return 'js';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'ico', 'avif'].includes(ext)) return 'image';
  if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) return 'asset';
  return 'asset';
}

function sanitizePath(p: string): string {
  const clean = String(p).replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (clean.includes('..') || clean.startsWith('/') || /^[a-z]:/i.test(clean)) throw new ApiError(400, 'Unsafe file path');
  return clean.slice(0, 200);
}

router.get('/custom-pages', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.customPages.id, name: schema.customPages.name, slug: schema.customPages.slug,
    pageType: schema.customPages.pageType, entryFile: schema.customPages.entryFile,
    status: schema.customPages.status, version: schema.customPages.version,
    navigationLabel: schema.customPages.navigationLabel, navigationVisibility: schema.customPages.navigationVisibility,
    robots: schema.customPages.robots, updatedAt: schema.customPages.updatedAt, publishedAt: schema.customPages.publishedAt,
  }).from(schema.customPages).orderBy(desc(schema.customPages.updatedAt));
  const fileCounts = await db.select({ pageId: schema.customPageFiles.pageId, n: count() })
    .from(schema.customPageFiles).groupBy(schema.customPageFiles.pageId);
  const countMap = new Map(fileCounts.map((r) => [r.pageId, r.n]));
  res.json({ success: true, data: data.map((p) => ({ ...p, fileCount: countMap.get(p.id) ?? 0 })) });
}));

router.post('/custom-pages', asyncHandler(async (req, res) => {
  const { name, slug, pageType, description } = req.body ?? {};
  if (!name || !String(name).trim()) throw new ApiError(400, 'name is required');
  const cleanSlug = slugify(slug || name);
  if (!cleanSlug) throw new ApiError(400, 'A valid slug is required');
  if (RESERVED_SLUGS.has(cleanSlug)) throw new ApiError(400, `"${cleanSlug}" is a reserved route`);
  const clash = await db.select({ id: schema.customPages.id }).from(schema.customPages).where(eq(schema.customPages.slug, cleanSlug));
  if (clash.length) throw new ApiError(409, 'A custom page with this slug already exists');

  const entryFile = pageType === 'split' ? 'index.html' : 'index.html';
  const [inserted] = await db.insert(schema.customPages).values({
    name: String(name).trim().slice(0, 200),
    slug: cleanSlug,
    description: description ? String(description).slice(0, 1000) : null,
    pageType: ['html', 'bundle', 'split'].includes(pageType) ? pageType : 'html',
    entryFile,
    createdBy: req.user!.id,
  }).returning();
  // Seed split pages with a blank document so the editor has a starting point.
  if (pageType === 'split') {
    await db.insert(schema.customPageFiles).values([
      { pageId: inserted.id, path: 'index.html', kind: 'html', size: 0, content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello from your custom page</h1>\n</body>\n</html>' },
      { pageId: inserted.id, path: 'styles.css', kind: 'css', size: 0, content: 'body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; }\n' },
      { pageId: inserted.id, path: 'script.js', kind: 'js', size: 0, content: '// Custom page JavaScript runs in an isolated sandbox with no access to the application.\n' },
    ]);
  }
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'custom page', inserted.id, cleanSlug, req.ip);
  res.status(201).json({ success: true, data: { id: inserted.id, slug: cleanSlug }, message: 'Custom page created' });
}));

router.get('/custom-pages/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [page] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  if (!page) throw new ApiError(404, 'Custom page not found');
  const files = await db.select({
    path: schema.customPageFiles.path, content: schema.customPageFiles.content,
    kind: schema.customPageFiles.kind, size: schema.customPageFiles.size, updatedAt: schema.customPageFiles.updatedAt,
  }).from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id)).orderBy(asc(schema.customPageFiles.path));
  res.json({ success: true, data: { ...page, files } });
}));

router.put('/custom-pages/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const patch: Record<string, any> = {};
  const { name, description, entryFile, seoTitle, seoDescription, ogImage, robots, navigationLabel, navigationVisibility, navigationPosition, ackRisks } = req.body ?? {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new ApiError(400, 'name is required');
    patch.name = String(name).trim().slice(0, 200);
  }
  if (description !== undefined) patch.description = description ? String(description).slice(0, 1000) : null;
  if (entryFile !== undefined) {
    const clean = sanitizePath(String(entryFile));
    if (fileKindFor(clean) !== 'html') throw new ApiError(400, 'entry file must be an HTML document');
    patch.entryFile = clean;
  }
  if (seoTitle !== undefined) patch.seoTitle = seoTitle ? String(seoTitle).slice(0, 200) : null;
  if (seoDescription !== undefined) patch.seoDescription = seoDescription ? String(seoDescription).slice(0, 500) : null;
  if (ogImage !== undefined) patch.ogImage = ogImage ? String(ogImage).slice(0, 2000) : null;
  if (robots !== undefined) patch.robots = ['index,follow', 'noindex,nofollow'].includes(robots) ? robots : 'index,follow';
  if (navigationLabel !== undefined) patch.navigationLabel = navigationLabel ? String(navigationLabel).slice(0, 80) : null;
  if (navigationVisibility !== undefined) patch.navigationVisibility = navigationVisibility === true;
  if (navigationPosition !== undefined) patch.navigationPosition = parseInt(navigationPosition) || 0;
  if (ackRisks !== undefined) patch.ackRisks = ackRisks === true;
  patch.updatedBy = req.user!.id;
  patch.updatedAt = nowIso();
  const [updated] = await db.update(schema.customPages).set(patch).where(eq(schema.customPages.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Custom page not found');
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'custom page', id, 'Metadata updated', req.ip);
  res.json({ success: true, data: updated, message: 'Custom page updated' });
}));

// Save/upsert one file (code editor / upload path). Validates type, size, path.
router.put('/custom-pages/:id/files/*path', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const pathClean = sanitizePath(String(req.params.path || ''));
  const { content } = req.body ?? {};
  if (typeof content !== 'string') throw new ApiError(400, 'content must be a string');
  if (content.length > MAX_FILE_SIZE) throw new ApiError(413, `File too large (max ${MAX_FILE_SIZE / 1024} KB)`);

  const [page] = await db.select({ id: schema.customPages.id }).from(schema.customPages).where(eq(schema.customPages.id, id));
  if (!page) throw new ApiError(404, 'Custom page not found');

  const kind = fileKindFor(pathClean) as 'html' | 'css' | 'js' | 'asset' | 'image';
  await db.insert(schema.customPageFiles).values({ pageId: id, path: pathClean, kind, size: Buffer.byteLength(content), content, updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: [schema.customPageFiles.pageId, schema.customPageFiles.path],
      set: { content, kind, size: Buffer.byteLength(content), updatedAt: nowIso() },
    });

  // Editing code creates a draft version snapshot so prior versions survive.
  const [meta] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  const nextVersion = (meta?.version ?? 1) + 1;
  await db.insert(schema.customPageVersions).values({
    pageId: id, version: nextVersion, note: 'Draft edit',
    snapshot: JSON.stringify({ files: await db.select({ path: schema.customPageFiles.path, content: schema.customPageFiles.content }).from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id)) }),
    createdBy: req.user!.id,
  });
  await db.update(schema.customPages).set({ version: nextVersion, updatedBy: req.user!.id, updatedAt: nowIso() }).where(eq(schema.customPages.id, id));

  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'custom page file', id, pathClean, req.ip);
  res.json({ success: true, message: 'File saved' });
}));

router.delete('/custom-pages/:id/files/*path', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const pathClean = sanitizePath(String(req.params.path || ''));
  await db.delete(schema.customPageFiles).where(and(eq(schema.customPageFiles.pageId, id), eq(schema.customPageFiles.path, pathClean)));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'custom page file', id, pathClean, req.ip);
  res.json({ success: true, message: 'File deleted' });
}));

// Validation pipeline — report only, never blocks blindly; the sandbox is the
// security boundary. Report: structure, references, external domains, sizes.
router.post('/custom-pages/:id/validate', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [page] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  if (!page) throw new ApiError(404, 'Custom page not found');
  const files = await db.select().from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id));
  const entry = files.find((f) => f.path === page.entryFile);
  if (!entry) throw new ApiError(400, `Entry file "${page.entryFile}" is missing`);

  const html = entry.content || '';
  const hasViewport = /<meta\s+name=["']viewport["']/i.test(html);
  const hasTitle = /<title>[\s\S]*?<\/title>/i.test(html);
  const inlineScripts = (html.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) || []).length;
  const externalRefs = new Map<string, string[]>();
  const refs = [
    ...[...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]*\bhref=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<img[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...html.matchAll(/<iframe[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]),
  ];
  const domains = new Set<string>();
  for (const r of refs) {
    if (/^(https?:)?\/\//i.test(r)) {
      let d = r.replace(/^https?:\/\//i, '').split('/')[0];
      domains.add(d);
      externalRefs.set(d, [...(externalRefs.get(d) ?? []), r]);
    }
  }

  const referencedLocal = refs
    .filter((r) => !/^(https?:)?\/\//i.test(r))
    .map((r) => r.split('?')[0].replace(/^\.\//, ''));
  const localPaths = new Set(files.map((f) => f.path));
  const brokenLocal = referencedLocal.filter((r) => r && !localPaths.has(r));

  const oversized = files.filter((f) => f.size > 300 * 1024 && f.kind !== 'image');
  const missingViewport = !hasViewport;
  const fixedWidth = /max-width:\s*\d{4,}/i.test(html) || /width:\s*\d{4,}px/i.test(html);

  res.json({
    success: true,
    data: {
      entry: page.entryFile,
      files: { html: files.filter((f) => f.kind === 'html').length, css: files.filter((f) => f.kind === 'css').length, js: files.filter((f) => f.kind === 'js').length, images: files.filter((f) => f.kind === 'image').length, assets: files.filter((f) => f.kind === 'asset').length },
      checks: {
        viewport: hasViewport, title: hasTitle,
        inlineScripts, brokenLocalReferences: brokenLocal,
        oversizedFiles: oversized.map((f) => f.path),
        externalDomains: [...domains],
        fixedWidthWarning: fixedWidth,
        missingViewportWarning: missingViewport,
        hasJavaScript: files.some((f) => f.kind === 'js') || inlineScripts > 0,
      },
      warnings: [
        ...(!hasViewport ? ['No viewport meta tag — the page may not be mobile-responsive.'] : []),
        ...(fixedWidth ? ['Fixed desktop-width layout detected — test on mobile widths.'] : []),
        ...(brokenLocal.length ? [`Broken local references: ${brokenLocal.join(', ')}`] : []),
        ...(oversized.length ? [`Large files: ${oversized.map((f) => f.path).join(', ')}`] : []),
        ...(domains.size ? [`External dependencies: ${[...domains].join(', ')}`] : []),
      ],
    },
  });
}));

router.post('/custom-pages/:id/publish', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [page] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  if (!page) throw new ApiError(404, 'Custom page not found');
  const files = await db.select({ path: schema.customPageFiles.path }).from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id));
  if (!files.some((f) => f.path === page.entryFile)) throw new ApiError(400, `Cannot publish: entry file "${page.entryFile}" is missing`);

  const [updated] = await db.update(schema.customPages).set({ status: 'published', publishedAt: nowIso(), updatedAt: nowIso(), updatedBy: req.user!.id })
    .where(eq(schema.customPages.id, id)).returning();
  await logAudit(req.user!.id, req.user!.role, 'PUBLISH', 'custom page', id, page.slug, req.ip);
  res.json({ success: true, data: updated, message: 'Custom page published at /' + page.slug });
}));

router.post('/custom-pages/:id/unpublish', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [updated] = await db.update(schema.customPages).set({ status: 'draft', updatedAt: nowIso(), updatedBy: req.user!.id })
    .where(eq(schema.customPages.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Custom page not found');
  await logAudit(req.user!.id, req.user!.role, 'UNPUBLISH', 'custom page', id, 'Unpublished', req.ip);
  res.json({ success: true, message: 'Unpublished' });
}));

router.post('/custom-pages/:id/archive', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [updated] = await db.update(schema.customPages).set({ status: 'archived', updatedAt: nowIso(), updatedBy: req.user!.id })
    .where(eq(schema.customPages.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Custom page not found');
  await logAudit(req.user!.id, req.user!.role, 'ARCHIVE', 'custom page', id, 'Archived', req.ip);
  res.json({ success: true, message: 'Archived' });
}));

router.post('/custom-pages/:id/duplicate', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [src] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  if (!src) throw new ApiError(404, 'Custom page not found');
  const baseSlug = `${src.slug}-copy`;
  let slug = baseSlug;
  let n = 2;
  while ((await db.select({ id: schema.customPages.id }).from(schema.customPages).where(eq(schema.customPages.slug, slug))).length) {
    slug = `${baseSlug}-${n++}`;
  }
  const files = await db.select().from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id));
  const [copy] = await db.insert(schema.customPages).values({
    name: `${src.name} (Copy)`, slug, description: src.description,
    pageType: src.pageType, entryFile: src.entryFile, status: 'draft', version: 1,
    createdBy: req.user!.id,
  }).returning();
  if (files.length) {
    await db.insert(schema.customPageFiles).values(files.map((f) => ({ pageId: copy.id, path: f.path, content: f.content, kind: f.kind, size: f.size })));
  }
  await logAudit(req.user!.id, req.user!.role, 'DUPLICATE', 'custom page', copy.id, src.slug, req.ip);
  res.status(201).json({ success: true, data: { id: copy.id, slug }, message: 'Page duplicated as draft' });
}));

router.get('/custom-pages/:id/versions', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const data = await db.select({
    id: schema.customPageVersions.id, version: schema.customPageVersions.version,
    note: schema.customPageVersions.note, createdAt: schema.customPageVersions.createdAt,
    createdBy: schema.customPageVersions.createdBy,
  }).from(schema.customPageVersions).where(eq(schema.customPageVersions.pageId, id)).orderBy(desc(schema.customPageVersions.version)).limit(50);
  res.json({ success: true, data });
}));

router.post('/custom-pages/:id/versions/:version/restore', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const version = parseInt(String(req.params.version), 10);
  const [snap] = await db.select().from(schema.customPageVersions)
    .where(and(eq(schema.customPageVersions.pageId, id), eq(schema.customPageVersions.version, version)));
  if (!snap) throw new ApiError(404, 'Version not found');
  const snapshot = typeof snap.snapshot === 'string' ? JSON.parse(snap.snapshot) : snap.snapshot;
  const files: Array<{ path: string; content: string }> = snapshot?.files ?? [];
  await db.delete(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, id));
  for (const f of files) {
    await db.insert(schema.customPageFiles).values({
      pageId: id, path: sanitizePath(f.path), content: String(f.content ?? '').slice(0, MAX_FILE_SIZE),
      kind: fileKindFor(f.path) as 'html' | 'css' | 'js' | 'asset' | 'image',
      size: Buffer.byteLength(String(f.content ?? '')),
    });
  }
  const [page] = await db.select().from(schema.customPages).where(eq(schema.customPages.id, id));
  const nextVersion = (page?.version ?? 1) + 1;
  await db.insert(schema.customPageVersions).values({ pageId: id, version: nextVersion, note: `Restored version ${version}`, snapshot: JSON.stringify({ files }), createdBy: req.user!.id });
  await db.update(schema.customPages).set({ version: nextVersion, status: 'draft', updatedAt: nowIso(), updatedBy: req.user!.id }).where(eq(schema.customPages.id, id));
  await logAudit(req.user!.id, req.user!.role, 'RESTORE', 'custom page', id, `Version ${version}`, req.ip);
  res.json({ success: true, message: 'Version restored as draft' });
}));

// Signed preview token (admin only) — used by the sandboxed preview iframe so
// DRAFT custom content can be shown to the editing admin without exposing it
// publicly and without granting the iframe any app session.
router.get('/custom-pages/:id/preview-token', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const secret = config.customPageSecret;
  if (!secret) throw new ApiError(500, 'CUSTOM_PAGE_SECRET not configured');
  const payload = `${id}.${Math.floor(Date.now() / 1000) + 15 * 60}`;
  const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  res.json({ success: true, data: { token: `${payload}.${token}` } });
}));

export default router;