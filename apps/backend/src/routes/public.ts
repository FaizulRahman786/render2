// ============================================
// PUBLIC WEBSITE API (no authentication)
// ============================================
// Serves the public website with real, database-backed content:
//   - institute info + maintenance flag          GET /status
//   - site config (nav, branding, homepage)      GET /config
//   - homepage (CMS live content + aggregates)   GET /home
//   - courses / faculty / notices / events       GET /courses | /faculty | /notices | /events
//   - CMS collections: admissions, fees, achievements, results, gallery,
//     reviews (approved), blog, faqs, long-form pages
//   - custom pages (HTML/CSS/JS) sandboxed serving
//   - contact form submission                    POST /enquiries
//   - review submission (moderated)              POST /reviews
//
// Security posture:
//   - Read-only for visitors; only POST /enquiries and POST /reviews accept
//     input (validated + rate-limited per IP).
//   - Only published, audience='everyone', in-window content is exposed.
//     Private student/teacher notices are never exposed here.
//   - Custom page code is UNTRUSTED ACTIVE CONTENT: served only as documents
//     with an explicit content-type + nosniff; the browser must render it in a
//     sandboxed iframe with no app session. Drafts are exposed ONLY to an admin
//     holding a valid short-lived HMAC preview token.
//   - No secrets, no internal identifiers beyond public entity ids.

import crypto from 'crypto';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq, and, desc, asc, lte, gte, gt, sql, ilike, or, count, isNotNull } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db, schema } from '../db/index.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { emitToRole } from '../ws/wsManager.js';
import { config } from '../config/env.js';

const router: ExpressRouter = Router();

// -- Settings helpers ---------------------------------------------------------
async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.settings);
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return map;
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Public-safe institute contact info from the settings table. */
function instituteFromSettings(s: Record<string, string>) {
  return {
    name: s.instituteName || 'Our Coaching Institute',
    email: s.email || '',
    phone: s.phone || '',
    website: s.website || '',
    address: s.address || '',
  };
}

function maintenanceEnabled(s: Record<string, string>): boolean {
  return s.maintenanceMode === 'true';
}

// -- Status: institute info + maintenance flag -------------------------------
router.get('/status', asyncHandler(async (req, res) => {
  const s = await getSettingsMap();
  res.json({
    success: true,
    data: {
      maintenance: maintenanceEnabled(s),
      institute: instituteFromSettings(s),
      social: parseJson<Record<string, string>>(s['cms.social.live'], {}),
      seo: parseJson<Record<string, any>>(s['cms.seo.live'], {}),
    },
  });
}));

// -- Homepage: CMS content + real aggregates ---------------------------------
router.get('/home', asyncHandler(async (req, res) => {
  const s = await getSettingsMap();
  if (maintenanceEnabled(s)) {
    res.json({ success: true, data: { maintenance: true, institute: instituteFromSettings(s) } });
    return;
  }

  const now = new Date();

  const homeLive = parseJson<Record<string, any>>(s['cms.home.live'], {});
  const seoLive = parseJson<Record<string, any>>(s['cms.seo.live'], {});
  const footerLive = parseJson<Record<string, any>>(s['cms.footer.live'], {});

  const [studentCount, teacherCount, courseCount] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(eq(schema.users.role, 'student')),
    db.select({ n: count() }).from(schema.users).where(eq(schema.users.role, 'teacher')),
    db.select({ n: count() }).from(schema.courses).where(eq(schema.courses.status, 'active')),
  ]);

  const [courses, upcomingEvents, latestNotices] = await Promise.all([
    db.select({ id: schema.courses.id, name: schema.courses.name, description: schema.courses.description, classLevel: schema.courses.classLevel, duration: schema.courses.duration, fee: schema.courses.fee })
      .from(schema.courses)
      .where(eq(schema.courses.status, 'active'))
      .orderBy(desc(schema.courses.createdAt))
      .limit(4),
    db.select({
      id: schema.events.id, name: schema.events.name, slug: schema.events.slug, description: schema.events.description,
      eventDate: schema.events.eventDate, endDate: schema.events.endDate, startTime: schema.events.startTime, endTime: schema.events.endTime,
      location: schema.events.location, venue: schema.events.venue, bannerUrl: schema.events.bannerUrl,
      registrationUrl: schema.events.registrationUrl, featured: schema.events.featured,
    })
      .from(schema.events)
      .where(and(eq(schema.events.status, 'published'), gte(schema.events.eventDate, sql`now()::date`)))
      .orderBy(asc(schema.events.eventDate))
      .limit(3),
    db.select({ id: schema.notices.id, title: schema.notices.title, description: schema.notices.description, priority: schema.notices.priority, publishedAt: schema.notices.publishedAt, createdAt: schema.notices.createdAt })
      .from(schema.notices)
      .where(and(
        eq(schema.notices.status, 'published'),
        eq(schema.notices.audience, 'everyone'),
        or(
          sql`${schema.notices.expireAt} IS NULL`,
          gt(schema.notices.expireAt, now),
        ),
      ))
      .orderBy(desc(schema.notices.publishedAt))
      .limit(3),
  ]);

  const stats = {
    students: studentCount[0]?.n ?? 0,
    teachers: teacherCount[0]?.n ?? 0,
    courses: courseCount[0]?.n ?? 0,
  };

  res.json({
    success: true,
    data: {
      maintenance: false,
      institute: instituteFromSettings(s),
      home: homeLive,
      seo: seoLive,
      footer: footerLive,
      social: parseJson<Record<string, string>>(s['cms.social.live'], {}),
      whatsapp: { number: s.whatsappNumber || '', message: s.whatsappMessage || '' },
      homepageMode: s.homepageMode || 'cms',
      customHomepageSlug: s.homepageCustomPageSlug || '',
      stats,
      courses,
      events: upcomingEvents,
      notices: latestNotices,
    },
  });
}));

// -- Courses -----------------------------------------------------------------
router.get('/courses', asyncHandler(async (req, res) => {
  const data = await db.select({
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
  })
    .from(schema.publicCourses)
    .where(eq(schema.publicCourses.cmsStatus, 'published'))
    .orderBy(asc(schema.publicCourses.displayOrder), asc(schema.publicCourses.name));

res.json({ success: true, data });
}));
// -- Faculty -----------------------------------------------------------------
router.get('/faculty', asyncHandler(async (req, res) => {
  const data = await db.select({
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
  })
    .from(schema.publicFaculty)
    .where(eq(schema.publicFaculty.cmsStatus, 'published'))
    .orderBy(asc(schema.publicFaculty.displayOrder), asc(schema.publicFaculty.name));

res.json({ success: true, data });
}));
// -- Notices (public audience only) -----------------------------------------
router.get('/notices', asyncHandler(async (req, res) => {
  const now = new Date();
  const data = await db.select({
    id: schema.notices.id, title: schema.notices.title, description: schema.notices.description,
    attachmentUrl: schema.notices.attachmentUrl, priority: schema.notices.priority,
    publishedAt: schema.notices.publishedAt, createdAt: schema.notices.createdAt,
  })
    .from(schema.notices)
    .where(and(
      eq(schema.notices.status, 'published'),
      eq(schema.notices.audience, 'everyone'),
      or(
        sql`${schema.notices.expireAt} IS NULL`,
        gt(schema.notices.expireAt, now),
      ),
    ))
    .orderBy(desc(schema.notices.publishedAt));

  res.json({ success: true, data });
}));

// -- Events (published, from today forward) ----------------------------------
router.get('/events', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.events.id, name: schema.events.name, slug: schema.events.slug, description: schema.events.description,
    shortDescription: schema.events.shortDescription, eventDate: schema.events.eventDate, endDate: schema.events.endDate,
    startTime: schema.events.startTime, endTime: schema.events.endTime, location: schema.events.location,
    venue: schema.events.venue, organizer: schema.events.organizer, contactPhone: schema.events.contactPhone,
    registrationUrl: schema.events.registrationUrl, bannerUrl: schema.events.bannerUrl, featured: schema.events.featured,
  })
    .from(schema.events)
    .where(and(eq(schema.events.status, 'published'), gte(schema.events.eventDate, sql`now()::date`)))
    .orderBy(asc(schema.events.eventDate));

  res.json({ success: true, data });
}));

// Event detail  matched by slug (preferred) or public id.
router.get('/events/:slug', asyncHandler(async (req, res) => {
  const idOrSlug = String(req.params.slug).toLowerCase().trim();
  // Only compare against the uuid id column when the value looks like a uuid;
  // otherwise Postgres raises "invalid input syntax for type uuid"  500.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(idOrSlug);
  const [event] = await db.select({
    id: schema.events.id, name: schema.events.name, slug: schema.events.slug,
    description: schema.events.description, shortDescription: schema.events.shortDescription,
    eventDate: schema.events.eventDate, endDate: schema.events.endDate, startTime: schema.events.startTime,
    endTime: schema.events.endTime, location: schema.events.location, venue: schema.events.venue,
    organizer: schema.events.organizer, contactPhone: schema.events.contactPhone,
    registrationUrl: schema.events.registrationUrl, bannerUrl: schema.events.bannerUrl,
    featured: schema.events.featured, seoTitle: schema.events.seoTitle, seoDescription: schema.events.seoDescription,
  })
    .from(schema.events)
    .where(and(
      eq(schema.events.status, 'published'),
      isUuid ? or(eq(schema.events.slug, idOrSlug), eq(schema.events.id, idOrSlug)) : eq(schema.events.slug, idOrSlug),
    ));
  if (!event) throw new ApiError(404, 'Event not found');
  res.json({ success: true, data: event });
}));

// -- Enquiries (contact form) ------------------------------------------------
// Per-IP rate limit keeps the public form spam-resistant without blocking
// legitimate visitors. Validation is applied inline (public.ts has no
// authenticated user; schemas.ts stays admin/teacher-oriented).
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
});

router.post('/enquiries', enquiryLimiter, asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw new ApiError(400, 'name is required (max 120 characters)');
  }
  if (typeof email !== 'string' || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 200) {
    throw new ApiError(400, 'a valid email is required');
  }
  if (phone !== undefined && phone !== null && phone !== '' && (typeof phone !== 'string' || phone.length > 30)) {
    throw new ApiError(400, 'phone is too long');
  }
  if (typeof subject !== 'string' || !subject.trim() || subject.trim().length > 200) {
    throw new ApiError(400, 'subject is required (max 200 characters)');
  }
  if (typeof message !== 'string' || !message.trim() || message.trim().length < 10 || message.trim().length > 4000) {
    throw new ApiError(400, 'message must be between 10 and 4000 characters');
  }

  const [inserted] = await db.insert(schema.enquiries).values({
    name: name.trim().slice(0, 120),
    email: email.trim().slice(0, 200),
    phone: (phone ?? '').trim().slice(0, 30) || null,
    subject: subject.trim().slice(0, 200),
    message: message.trim().slice(0, 4000),
    ipAddress: req.ip,
  }).returning();

  // Alert admins in-app (SSE + persisted notification).
  try {
    const admins = await db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), eq(schema.users.status, 'active')));
    const adminIds = admins.map((a) => a.id);
    if (adminIds.length) {
      await db.insert(schema.notifications).values(adminIds.map((aid) => ({
        receiverId: aid,
        type: 'enquiry',
        title: 'New enquiry received',
        message: `${inserted.name}  ${inserted.subject}`,
        link: '/admin/website/enquiries',
      })));
      emitToRole('admin', {
        title: 'New enquiry received',
        message: `${inserted.name}  ${inserted.subject}`,
        link: '/admin/website/enquiries',
        type: 'enquiry',
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }
  } catch {
    // Notification failures must never fail the visitor's submission.
  }

  res.status(201).json({ success: true, message: 'Your message has been sent. We will get back to you soon.' });
}));

// -- Site config: branding, navigation, homepage mode ------------------------
router.get('/config', asyncHandler(async (req, res) => {
  const s = await getSettingsMap();

  const [nav, customNav] = await Promise.all([
    db.select({
      id: schema.navigationItems.id, label: schema.navigationItems.label, href: schema.navigationItems.href,
      parentId: schema.navigationItems.parentId, position: schema.navigationItems.position,
      target: schema.navigationItems.target, isSystem: schema.navigationItems.isSystem,
    }).from(schema.navigationItems).where(eq(schema.navigationItems.visibility, true))
      .orderBy(asc(schema.navigationItems.position), asc(schema.navigationItems.label)),
    db.select({
      label: schema.customPages.navigationLabel, slug: schema.customPages.slug,
      position: schema.customPages.navigationPosition,
    }).from(schema.customPages).where(and(
      eq(schema.customPages.status, 'published'),
      eq(schema.customPages.navigationVisibility, true),
    )).orderBy(asc(schema.customPages.navigationPosition), asc(schema.customPages.navigationLabel)),
  ]);

  res.json({
    success: true,
    data: {
      maintenance: maintenanceEnabled(s),
      institute: instituteFromSettings(s),
      social: parseJson<Record<string, string>>(s['cms.social.live'], {}),
      seo: parseJson<Record<string, any>>(s['cms.seo.live'], {}),
      footer: parseJson<Record<string, any>>(s['cms.footer.live'], {}),
      whatsapp: { number: s.whatsappNumber || '', message: s.whatsappMessage || '' },
      homepageMode: s.homepageMode || 'cms',
      customHomepageSlug: s.homepageCustomPageSlug || '',
      navigation: [
        ...nav.map((n) => ({ id: n.id, label: n.label, href: n.href, parentId: n.parentId, position: n.position, target: n.target, isSystem: n.isSystem })),
        ...customNav.map((c) => ({ id: `custom-${c.slug}`, label: c.label || c.slug, href: `/${c.slug}`, parentId: null, position: c.position, target: 'self', isSystem: false, custom: true })),
      ].sort((a, b) => a.position - b.position),
    },
  });
}));

// -- CMS collections (published content only) --------------------------------
router.get('/admissions', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.admissions.id, session: schema.admissions.session, status: schema.admissions.status,
    title: schema.admissions.title, subtitle: schema.admissions.subtitle, description: schema.admissions.description,
    openingDate: schema.admissions.openingDate, closingDate: schema.admissions.closingDate,
    eligibility: schema.admissions.eligibility, documents: schema.admissions.documents,
    process: schema.admissions.process, programs: schema.admissions.programs,
    instructions: schema.admissions.instructions, contactPhone: schema.admissions.contactPhone,
    contactEmail: schema.admissions.contactEmail, ctaLabel: schema.admissions.ctaLabel, ctaUrl: schema.admissions.ctaUrl,
    featured: schema.admissions.featured, sortOrder: schema.admissions.sortOrder,
    publishedAt: schema.admissions.publishedAt, updatedAt: schema.admissions.updatedAt,
  }).from(schema.admissions).where(eq(schema.admissions.cmsStatus, 'published'))
    .orderBy(desc(schema.admissions.sortOrder), desc(schema.admissions.session));
  res.json({ success: true, data });
}));

router.get('/fees', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.feeStructures.id, session: schema.feeStructures.session,
    classLevel: schema.feeStructures.classLevel, admissionFee: schema.feeStructures.admissionFee,
    tuitionFee: schema.feeStructures.tuitionFee, monthlyFee: schema.feeStructures.monthlyFee,
    examFee: schema.feeStructures.examFee, transportFee: schema.feeStructures.transportFee,
    otherCharges: schema.feeStructures.otherCharges, totalFee: schema.feeStructures.totalFee,
    discountInfo: schema.feeStructures.discountInfo, notes: schema.feeStructures.notes,
    paymentSchedule: schema.feeStructures.paymentSchedule,
  }).from(schema.feeStructures).where(eq(schema.feeStructures.cmsStatus, 'published'))
    .orderBy(asc(schema.feeStructures.session), asc(schema.feeStructures.sortOrder));
  res.json({ success: true, data });
}));

router.get('/achievements', asyncHandler(async (req, res) => {
  const category = String(req.query.category ?? '').trim();
  const conditions: any[] = [eq(schema.achievements.cmsStatus, 'published')];
  if (category) conditions.push(eq(schema.achievements.category, category));
  const data = await db.select({
    id: schema.achievements.id, title: schema.achievements.title, description: schema.achievements.description,
    category: schema.achievements.category, achievementDate: schema.achievements.achievementDate,
    imageUrl: schema.achievements.imageUrl, awardOrganization: schema.achievements.awardOrganization,
    studentName: schema.achievements.studentName, level: schema.achievements.level,
    featured: schema.achievements.featured,
  }).from(schema.achievements).where(and(...conditions))
    .orderBy(desc(schema.achievements.achievementDate), desc(schema.achievements.sortOrder));
  res.json({ success: true, data });
}));

router.get('/results', asyncHandler(async (req, res) => {
  const exam = String(req.query.exam ?? '').trim();
  const conditions: any[] = [eq(schema.publicResults.cmsStatus, 'published')];
  if (exam) conditions.push(eq(schema.publicResults.exam, exam));
  const data = await db.select({
    id: schema.publicResults.id, session: schema.publicResults.session, exam: schema.publicResults.exam,
    classLevel: schema.publicResults.classLevel, studentName: schema.publicResults.studentName,
    rank: schema.publicResults.rank, percentage: schema.publicResults.percentage, grade: schema.publicResults.grade,
    description: schema.publicResults.description, resultType: schema.publicResults.resultType,
    displayDate: schema.publicResults.displayDate,
  }).from(schema.publicResults).where(and(...conditions))
    .orderBy(desc(schema.publicResults.displayDate), desc(schema.publicResults.sortOrder));
  res.json({ success: true, data });
}));

router.get('/gallery', asyncHandler(async (req, res) => {
  const category = String(req.query.category ?? '').trim();
  const conditions: any[] = [eq(schema.galleryItems.cmsStatus, 'published')];
  if (category) conditions.push(eq(schema.galleryItems.category, category));
  const data = await db.select({
    id: schema.galleryItems.id, title: schema.galleryItems.title, caption: schema.galleryItems.caption,
    altText: schema.galleryItems.altText, imageUrl: schema.galleryItems.imageUrl,
    category: schema.galleryItems.category, takenAt: schema.galleryItems.takenAt,
  }).from(schema.galleryItems).where(and(...conditions))
    .orderBy(desc(schema.galleryItems.sortOrder), desc(schema.galleryItems.createdAt));
  res.json({ success: true, data });
}));

router.get('/reviews', asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
  const data = await db.select({
    id: schema.reviews.id, name: schema.reviews.name, relationship: schema.reviews.relationship,
    rating: schema.reviews.rating, review: schema.reviews.review, profileImage: schema.reviews.profileImage,
    featured: schema.reviews.featured, createdAt: schema.reviews.createdAt,
  }).from(schema.reviews).where(eq(schema.reviews.status, 'approved'))
    .orderBy(desc(schema.reviews.featured), desc(schema.reviews.createdAt)).limit(limit);
  res.json({ success: true, data });
}));

router.get('/blog', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit ?? '9'))));
  const offset = (page - 1) * limit;
  const [{ total }] = await db.select({ total: count() }).from(schema.blogPosts).where(eq(schema.blogPosts.cmsStatus, 'published'));
  const data = await db.select({
    id: schema.blogPosts.id, slug: schema.blogPosts.slug, title: schema.blogPosts.title, excerpt: schema.blogPosts.excerpt,
    coverImage: schema.blogPosts.coverImage, category: schema.blogPosts.category, tags: schema.blogPosts.tags,
    author: schema.blogPosts.author, featured: schema.blogPosts.featured, publishedAt: schema.blogPosts.publishedAt,
  }).from(schema.blogPosts).where(and(eq(schema.blogPosts.cmsStatus, 'published'), isNotNull(schema.blogPosts.publishedAt)))
    .orderBy(desc(schema.blogPosts.publishedAt)).limit(limit).offset(offset);
  res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/blog/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const [post] = await db.select({
    id: schema.blogPosts.id, slug: schema.blogPosts.slug, title: schema.blogPosts.title, excerpt: schema.blogPosts.excerpt,
    content: schema.blogPosts.content, coverImage: schema.blogPosts.coverImage, category: schema.blogPosts.category,
    tags: schema.blogPosts.tags, author: schema.blogPosts.author, featured: schema.blogPosts.featured,
    publishedAt: schema.blogPosts.publishedAt, seoTitle: schema.blogPosts.seoTitle, seoDescription: schema.blogPosts.seoDescription,
    updatedAt: schema.blogPosts.updatedAt,
  }).from(schema.blogPosts).where(and(eq(schema.blogPosts.slug, slug), eq(schema.blogPosts.cmsStatus, 'published')));
  if (!post) throw new ApiError(404, 'Post not found');
  res.json({ success: true, data: post });
}));

router.get('/faqs', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.faqs.id, category: schema.faqs.category, question: schema.faqs.question,
    answer: schema.faqs.answer,
  }).from(schema.faqs).where(eq(schema.faqs.cmsStatus, 'published'))
    .orderBy(asc(schema.faqs.sortOrder));
  res.json({ success: true, data });
}));

// Long-form published CMS pages (Our Story, About).
router.get('/pages', asyncHandler(async (req, res) => {
  const data = await db.select({
    id: schema.sitePages.id, slug: schema.sitePages.slug, title: schema.sitePages.title,
    subtitle: schema.sitePages.subtitle, coverImage: schema.sitePages.coverImage,
    publishedAt: schema.sitePages.publishedAt, updatedAt: schema.sitePages.updatedAt,
  }).from(schema.sitePages).where(eq(schema.sitePages.status, 'published'))
    .orderBy(asc(schema.sitePages.title));
  res.json({ success: true, data });
}));

router.get('/pages/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const [pageData] = await db.select({
    id: schema.sitePages.id, slug: schema.sitePages.slug, title: schema.sitePages.title,
    subtitle: schema.sitePages.subtitle, content: schema.sitePages.content, coverImage: schema.sitePages.coverImage,
    seoTitle: schema.sitePages.seoTitle, seoDescription: schema.sitePages.seoDescription,
    publishedAt: schema.sitePages.publishedAt, updatedAt: schema.sitePages.updatedAt,
  }).from(schema.sitePages).where(and(eq(schema.sitePages.slug, slug), eq(schema.sitePages.status, 'published')));
  if (!pageData) throw new ApiError(404, 'Page not found');
  res.json({ success: true, data: pageData });
}));

// -- Review submission (moderated  never published instantly) ---------------
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many reviews submitted. Please try again later.' },
});

router.post('/reviews', reviewLimiter, asyncHandler(async (req, res) => {
  const { name, relationship, rating, review, consent } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
    throw new ApiError(400, 'name is required (max 120 characters)');
  }
  const rel = String(relationship || 'student');
  if (!['student', 'parent', 'teacher', 'alumni', 'other'].includes(rel)) {
    throw new ApiError(400, 'relationship is invalid');
  }
  const rate = parseInt(String(rating ?? '5'), 10);
  if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
    throw new ApiError(400, 'rating must be between 1 and 5');
  }
  if (typeof review !== 'string' || review.trim().length < 10 || review.trim().length > 2000) {
    throw new ApiError(400, 'review must be between 10 and 2000 characters');
  }
  if (consent !== true) {
    throw new ApiError(400, 'consent is required before publishing a review');
  }

  const [inserted] = await db.insert(schema.reviews).values({
    name: name.trim().slice(0, 120),
    relationship: rel,
    rating: rate,
    review: review.trim().slice(0, 2000),
    consent: true,
    status: 'pending',
    source: 'public',
  }).returning();

  try {
    const admins = await db.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.role, 'admin'), eq(schema.users.status, 'active')));
    const adminIds = admins.map((a) => a.id);
    if (adminIds.length) {
      await db.insert(schema.notifications).values(adminIds.map((aid) => ({
        receiverId: aid,
        type: 'review',
        title: 'New review awaiting moderation',
        message: `${inserted.name} (${rate})`,
        link: '/admin/website/reviews',
      })));
      emitToRole('admin', {
        title: 'New review awaiting moderation',
        message: `${inserted.name} (${rate})`,
        link: '/admin/website/reviews',
        type: 'review',
        createdAt: new Date().toISOString(),
        isRead: false,
      });
    }
  } catch {
    // Notification failures must never fail the visitor's submission.
  }

  res.status(201).json({ success: true, message: 'Thank you! Your review will appear once approved.' });
}));

// -- Custom pages: sandboxed document serving --------------------------------
// The privileged application NEVER executes this code. This endpoint serves
// uploaded HTML/CSS/JS as plain documents with a strict content-type + nosniff
// so it must be rendered inside a sandboxed iframe with no app session.
// DRAFT content is exposed only to the admin holding a valid HMAC preview
// token minted by the admin preview-token route (15-minute expiry).
function verifyCustomToken(token: string | undefined, pageId: string): boolean {
  if (!token) return false;
  const secret = config.customPageSecret;
  if (!secret) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== pageId) return false;
  const expires = parseInt(parts[1], 10);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${pageId}.${expires}`).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(parts[2] || '', 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const CUSTOM_CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  svg: 'image/svg+xml', gif: 'image/gif', ico: 'image/x-icon', avif: 'image/avif',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject', json: 'application/json',
};

function sanitizePublicPath(p: string): string {
  const clean = String(p).replace(/\\/g, '/').replace(/^\.\/+/, '');
  if (clean.includes('..') || clean.startsWith('/') || /^[a-z]:/i.test(clean)) throw new ApiError(400, 'Unsafe file path');
  return clean.slice(0, 200);
}

// Page metadata + file manifest for the custom page shell.
router.get('/custom/:slug', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const [pageData] = await db.select({
    id: schema.customPages.id, name: schema.customPages.name, slug: schema.customPages.slug,
    pageType: schema.customPages.pageType, entryFile: schema.customPages.entryFile,
    status: schema.customPages.status, version: schema.customPages.version,
    seoTitle: schema.customPages.seoTitle, seoDescription: schema.customPages.seoDescription,
    ogImage: schema.customPages.ogImage, robots: schema.customPages.robots,
    navigationLabel: schema.customPages.navigationLabel,
    publishedAt: schema.customPages.publishedAt, updatedAt: schema.customPages.updatedAt,
  }).from(schema.customPages).where(eq(schema.customPages.slug, slug));
  if (!pageData) throw new ApiError(404, 'Page not found');

  const isDraft = pageData.status !== 'published';
  if (isDraft && !verifyCustomToken(String(req.query.token ?? ''), pageData.id)) {
    throw new ApiError(404, 'Page not found');
  }

  const files = await db.select({
    path: schema.customPageFiles.path, kind: schema.customPageFiles.kind,
    size: schema.customPageFiles.size, updatedAt: schema.customPageFiles.updatedAt,
  }).from(schema.customPageFiles).where(eq(schema.customPageFiles.pageId, pageData.id))
    .orderBy(asc(schema.customPageFiles.path));

  res.json({ success: true, data: { ...pageData, draft: isDraft, files } });
}));

// Serve one page file with an explicit content-type. Relative references
// inside the HTML resolve naturally because the entry file lives here too.
router.get('/custom/:slug/files/*path', asyncHandler(async (req, res) => {
  const slug = String(req.params.slug).toLowerCase().trim();
  const pathClean = sanitizePublicPath(String(req.params.path || ''));
  const [pageData] = await db.select({ id: schema.customPages.id, status: schema.customPages.status })
    .from(schema.customPages).where(eq(schema.customPages.slug, slug));
  if (!pageData) throw new ApiError(404, 'Page not found');
  if (pageData.status !== 'published' && !verifyCustomToken(String(req.query.token ?? ''), pageData.id)) {
    throw new ApiError(404, 'Page not found');
  }

  const [file] = await db.select({ content: schema.customPageFiles.content, kind: schema.customPageFiles.kind })
    .from(schema.customPageFiles)
    .where(and(eq(schema.customPageFiles.pageId, pageData.id), eq(schema.customPageFiles.path, pathClean)));
  if (!file) throw new ApiError(404, 'File not found');

  const ext = pathClean.split('.').pop()?.toLowerCase() ?? '';
  const type = CUSTOM_CONTENT_TYPES[file.kind === 'image' || file.kind === 'asset' ? ext : file.kind] ?? 'application/octet-stream';
  res.set('Content-Type', type);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', pageData.status === 'published' ? 'public, max-age=300' : 'no-store');
  res.set('Content-Security-Policy', "frame-ancestors 'self'; sandbox allow-scripts allow-same-origin allow-forms allow-modals allow-popups");
  res.send(file.content);
}));

// -- Not found for unknown public routes -------------------------------------
router.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

export default router;
