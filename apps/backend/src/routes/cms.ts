// ============================================
// ADMIN CMS + SITE TOOLS (requireAdmin)
// ============================================
//   - CMS content (homepage draft/live, SEO, social, footer)   GET/PUT/POST
//   - Notices / Events management                               CRUD + lifecycle
//   - Enquiries inbox                                          list + status
//   - Media library metadata (Cloudinary assets)               list / alt / delete
//   - Global admin search                                      GET /search
//   - System health (no secrets)                               GET /system
//
// Every write is validated and audit-logged (logAudit). Media deletion is
// reference-checked: an asset referenced by published content (materials,
// events, CMS JSON) is never deleted.

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq, desc, asc, count, and, or, ilike, like, gte, lte, sql, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validation.js';
import {
  createNoticeSchema, updateNoticeSchema,
  createEventSchema, updateEventSchema,
  updateEnquiryStatusSchema, updateMediaAltSchema, cmsSaveSchema, searchSchema,
} from '../validation/schemas.js';
import { deleteCloudinaryAsset } from '../lib/storage.js';

const router: ExpressRouter = Router();
router.use(authenticate, requireAdmin);

function sanitizeSearch(term: string): string {
  return term.replace(/[%_]/g, '\\$&');
}

async function logAudit(userId: string | undefined, userRole: string | undefined, action: string, entity: string, entityId?: string, details?: string, ipAddress?: string) {
  try {
    await db.insert(schema.auditLogs).values({ userId, userRole, action, entity, entityId, details, ipAddress });
  } catch {} // never block request for logging
}

// Append-only journal of CMS snapshots so editors can review or roll back.
async function recordCmsVersion(section: string, content: unknown, action: 'save' | 'publish' | 'restore', userId: string | undefined) {
  try {
    await db.insert(schema.cmsVersions).values({ section: `cms.${section}`, content: content as any, action, createdBy: userId });
  } catch {} // history is best-effort; never block the primary write
}

// ── Settings-backed CMS content (draft + live) ─────────────────────────────
// Keys: cms.home.live|draft, cms.seo.live|draft, cms.social.live|draft, cms.footer.live|draft.
const CMS_KEYS = ['cms.home', 'cms.seo', 'cms.social', 'cms.footer'] as const;
type CmsKey = (typeof CMS_KEYS)[number];

async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.settings);
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  return map;
}

async function upsertSetting(key: string, value: string, audit: (k: string) => void) {
  await db.insert(schema.settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  audit(key);
}

const parseJson = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
};

const stringify = (value: unknown) => JSON.stringify(value ?? {});

// GET /cms → { home: {live, draft}, seo: {...}, social: {...}, footer: {...}, settings: {...} }
router.get('/cms', asyncHandler(async (req, res) => {
  const s = await getSettingsMap();
  const result: Record<string, any> = {};
  for (const key of CMS_KEYS) {
    const live = parseJson<Record<string, any>>(s[`${key}.live`], {});
    const draft = parseJson<Record<string, any>>(s[`${key}.draft`], live);
    result[key.replace('cms.', '')] = { live, draft };
  }
  res.json({ success: true, data: result });
}));

// GET /cms/preview?section=home|seo|social|footer — draft content for the
// admin draft-preview (admin-only; the public API never serves drafts).
router.get('/cms/preview', asyncHandler(async (req, res) => {
  const section = String(req.query.section ?? 'home').trim();
  const cmsKey = `cms.${section}` as CmsKey;
  if (!CMS_KEYS.includes(cmsKey)) throw new ApiError(400, 'Invalid CMS section');
  const s = await getSettingsMap();
  const live = parseJson<Record<string, any>>(s[`${cmsKey}.live`], {});
  const draft = parseJson<Record<string, any>>(s[`${cmsKey}.draft`], live);
  res.json({ success: true, data: { section, live, draft } });
}));

// PUT /cms → { key: 'home'|'seo'|'social'|'footer', content: {...} } — save draft (never touches live)
router.put('/cms', validate(cmsSaveSchema), asyncHandler(async (req, res) => {
  const { key, content } = req.body as { key: string; content: Record<string, any> };
  const cmsKey = `cms.${key}` as CmsKey;
  if (!CMS_KEYS.includes(cmsKey)) throw new ApiError(400, 'Invalid CMS section');
  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === 'string') sanitized[k] = v.slice(0, 2000);
    else if (typeof v === 'number' || typeof v === 'boolean') sanitized[k] = v;
    else if (Array.isArray(v)) sanitized[k] = v.slice(0, 50).map((item) => {
      if (typeof item === 'string') return item.slice(0, 1000);
      if (typeof item === 'object' && item !== null) return item;
      return String(item).slice(0, 200);
    });
    else if (v === null || v === undefined) sanitized[k] = null;
    else sanitized[k] = String(v).slice(0, 500);
  }
  await upsertSetting(`${cmsKey}.draft`, stringify(sanitized), () => {});
  await recordCmsVersion(key, sanitized, 'save', req.user!.id);
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'cms', cmsKey, `Draft saved for section ${key}`, req.ip);
  res.json({ success: true, message: 'Draft saved' });
}));

// POST /cms/publish → { key: 'home'|'seo'|'social'|'footer' } — copy draft → live
router.post('/cms/publish', validate(cmsSaveSchema), asyncHandler(async (req, res) => {
  const { key } = req.body as { key: string };
  const cmsKey = `cms.${key}` as CmsKey;
  if (!CMS_KEYS.includes(cmsKey)) throw new ApiError(400, 'Invalid CMS section');
  const s = await getSettingsMap();
  const draft = s[`${cmsKey}.draft`];
  if (!draft) throw new ApiError(400, 'No draft to publish for this section');
  await upsertSetting(`${cmsKey}.live`, draft, () => {});
  await recordCmsVersion(key, parseJson<Record<string, any>>(draft, {}), 'publish', req.user!.id);
  await logAudit(req.user!.id, req.user!.role, 'PUBLISH', 'cms', cmsKey, `Published section ${key}`, req.ip);
  res.json({ success: true, message: 'Published' });
}));

// ── CMS version history ─────────────────────────────────────────────────────
// GET /cms/versions?section=home|seo|social|footer — newest-first journal.
router.get('/cms/versions', asyncHandler(async (req, res) => {
  const section = String(req.query.section ?? '').trim();
  const cmsKey = `cms.${section}` as CmsKey;
  if (!CMS_KEYS.includes(cmsKey)) throw new ApiError(400, 'Invalid CMS section');
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'))));

  const data = await db
    .select({
      id: schema.cmsVersions.id,
      section: schema.cmsVersions.section,
      content: schema.cmsVersions.content,
      action: schema.cmsVersions.action,
      createdBy: schema.cmsVersions.createdBy,
      createdAt: schema.cmsVersions.createdAt,
    })
    .from(schema.cmsVersions)
    .where(eq(schema.cmsVersions.section, cmsKey))
    .orderBy(desc(schema.cmsVersions.createdAt), desc(schema.cmsVersions.id))
    .limit(limit);

  // Only expose the actor name, never extra user data.
  const ids = Array.from(new Set(data.map((v) => v.createdBy).filter((x): x is string => !!x)));
  const actors = ids.length
    ? await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, ids))
    : [];
  const actorNames = new Map(actors.map((a) => [a.id, a.name]));

  res.json({
    success: true,
    data: data.map((v) => ({
      id: v.id,
      section: v.section,
      action: v.action,
      createdBy: v.createdBy ? actorNames.get(v.createdBy) ?? null : null,
      createdAt: v.createdAt,
      content: v.content,
    })),
  });
}));

// POST /cms/versions/:id/restore → { section } — roll the section's draft AND
// live payloads back to that snapshot and record the restore in the journal.
router.post('/cms/versions/:id/restore', validate(cmsSaveSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { key } = req.body as { key: string };
  const cmsKey = `cms.${key}` as CmsKey;
  if (!CMS_KEYS.includes(cmsKey)) throw new ApiError(400, 'Invalid CMS section');

  const [version] = await db.select().from(schema.cmsVersions)
    .where(and(eq(schema.cmsVersions.id, id), eq(schema.cmsVersions.section, cmsKey)))
    .limit(1);
  if (!version) throw new ApiError(404, 'Version not found for this section');

  const payload = stringify(version.content);
  await db.insert(schema.settings).values({ key: `${cmsKey}.draft`, value: payload, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: payload, updatedAt: new Date() } });
  await db.insert(schema.settings).values({ key: `${cmsKey}.live`, value: payload, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: payload, updatedAt: new Date() } });

  await recordCmsVersion(key, version.content, 'restore', req.user!.id);
  await logAudit(req.user!.id, req.user!.role, 'RESTORE', 'cms', cmsKey, `Restored version ${id} for section ${key}`, req.ip);
  res.json({ success: true, message: 'Version restored' });
}));

// ── Notices ─────────────────────────────────────────────────────────────────
const NOTICE_PUBLIC_FIELDS = {
  id: schema.notices.id, title: schema.notices.title, description: schema.notices.description,
  attachmentUrl: schema.notices.attachmentUrl, audience: schema.notices.audience,
  priority: schema.notices.priority, status: schema.notices.status,
  publishAt: schema.notices.publishAt, expireAt: schema.notices.expireAt,
  publishedAt: schema.notices.publishedAt, createdAt: schema.notices.createdAt, updatedAt: schema.notices.updatedAt,
};

router.get('/notices', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? '').trim();
  const status = String(req.query.status ?? '').trim();
  const audience = String(req.query.audience ?? '').trim();

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.notices.status, status as any));
  if (audience) conditions.push(eq(schema.notices.audience, audience as any));
  if (search) conditions.push(or(
    ilike(schema.notices.title, `%${sanitizeSearch(search)}%`),
    ilike(schema.notices.description ?? schema.notices.title, `%${sanitizeSearch(search)}%`),
  ));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.notices).where(where);
  const data = await db.select(NOTICE_PUBLIC_FIELDS).from(schema.notices).where(where)
    .orderBy(desc(schema.notices.updatedAt)).limit(limit).offset(offset);

  res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/notices', validate(createNoticeSchema), asyncHandler(async (req, res) => {
  const { title, description, attachmentUrl, audience = 'everyone', priority = 'normal', status = 'draft', publishAt, expireAt } = req.body;
  const now = new Date();
  const [inserted] = await db.insert(schema.notices).values({
    title: title.trim(), description: description?.trim() || null, attachmentUrl: attachmentUrl || null,
    audience, priority, status,
    publishAt: publishAt ? new Date(publishAt) : (status === 'published' ? now : null),
    expireAt: expireAt ? new Date(expireAt) : null,
    publishedAt: status === 'published' ? now : null,
    createdBy: req.user!.id,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'notice', inserted.id, title, req.ip);
  res.status(201).json({ success: true, data: inserted, message: 'Notice created' });
}));

router.put('/notices/:id', validate(updateNoticeSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const existing = await db.select().from(schema.notices).where(eq(schema.notices.id, id));
  if (!existing.length) throw new ApiError(404, 'Notice not found');

  const patch: Record<string, any> = {};
  const { title, description, attachmentUrl, audience, priority, status, publishAt, expireAt } = req.body;
  if (title !== undefined) patch.title = title.trim();
  if (description !== undefined) patch.description = description ? description.trim() : null;
  if (attachmentUrl !== undefined) patch.attachmentUrl = attachmentUrl || null;
  if (audience !== undefined) patch.audience = audience;
  if (priority !== undefined) patch.priority = priority;
  if (status !== undefined) {
    const now = new Date();
    patch.status = status;
    patch.publishedAt = status === 'published' ? (existing[0].publishedAt ?? now) : null;
    if (status === 'published' && !patch.publishAt && !existing[0].publishAt) patch.publishAt = now;
  }
  if (publishAt !== undefined) patch.publishAt = publishAt ? new Date(publishAt) : null;
  if (expireAt !== undefined) patch.expireAt = expireAt ? new Date(expireAt) : null;
  patch.updatedAt = new Date();

  const [updated] = await db.update(schema.notices).set(patch).where(eq(schema.notices.id, id)).returning();
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'notice', id, patch.status ? `Status → ${patch.status}` : 'Updated', req.ip);
  res.json({ success: true, data: updated, message: 'Notice updated' });
}));

// DELETE /notices/:id → archive (soft). Records are never hard-deleted to
// preserve audit trails and public links.
router.delete('/notices/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const [updated] = await db.update(schema.notices).set({ status: 'archived', updatedAt: new Date() })
    .where(eq(schema.notices.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Notice not found');
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'notice', id, 'Archived', req.ip);
  res.json({ success: true, message: 'Notice archived' });
}));

// ── Events ──────────────────────────────────────────────────────────────────
const EVENT_PUBLIC_FIELDS = {
  id: schema.events.id, name: schema.events.name, description: schema.events.description,
  eventDate: schema.events.eventDate, startTime: schema.events.startTime, endTime: schema.events.endTime,
  location: schema.events.location, bannerUrl: schema.events.bannerUrl, status: schema.events.status,
  publishedAt: schema.events.publishedAt, createdAt: schema.events.createdAt, updatedAt: schema.events.updatedAt,
};

router.get('/events', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? '').trim();
  const status = String(req.query.status ?? '').trim();

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.events.status, status as any));
  if (search) conditions.push(ilike(schema.events.name, `%${sanitizeSearch(search)}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.events).where(where);
  const data = await db.select(EVENT_PUBLIC_FIELDS).from(schema.events).where(where)
    .orderBy(desc(schema.events.eventDate)).limit(limit).offset(offset);

  res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.post('/events', validate(createEventSchema), asyncHandler(async (req, res) => {
  const { name, description, eventDate, startTime, endTime, location, bannerUrl, status = 'draft' } = req.body;
  const now = new Date();
  const [inserted] = await db.insert(schema.events).values({
    name: name.trim(), description: description?.trim() || null,
    eventDate: new Date(eventDate), startTime: startTime || null, endTime: endTime || null,
    location: location?.trim() || null, bannerUrl: bannerUrl || null,
    status, publishedAt: status === 'published' ? now : null, createdBy: req.user!.id,
  }).returning();
  await logAudit(req.user!.id, req.user!.role, 'CREATE', 'event', inserted.id, name, req.ip);
  res.status(201).json({ success: true, data: inserted, message: 'Event created' });
}));

router.put('/events/:id', validate(updateEventSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const existing = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!existing.length) throw new ApiError(404, 'Event not found');

  const patch: Record<string, any> = {};
  const { name, description, eventDate, startTime, endTime, location, bannerUrl, status } = req.body;
  if (name !== undefined) patch.name = name.trim();
  if (description !== undefined) patch.description = description ? description.trim() : null;
  if (eventDate !== undefined) patch.eventDate = new Date(eventDate);
  if (startTime !== undefined) patch.startTime = startTime || null;
  if (endTime !== undefined) patch.endTime = endTime || null;
  if (location !== undefined) patch.location = location ? location.trim() : null;
  if (bannerUrl !== undefined) patch.bannerUrl = bannerUrl || null;
  if (status !== undefined) {
    const now = new Date();
    patch.status = status;
    patch.publishedAt = status === 'published' ? (existing[0].publishedAt ?? now) : null;
  }
  patch.updatedAt = new Date();

  const [updated] = await db.update(schema.events).set(patch).where(eq(schema.events.id, id)).returning();
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'event', id, patch.status ? `Status → ${patch.status}` : 'Updated', req.ip);
  res.json({ success: true, data: updated, message: 'Event updated' });
}));

router.delete('/events/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const existing = await db.select().from(schema.events).where(eq(schema.events.id, id));
  if (!existing.length) throw new ApiError(404, 'Event not found');
  // Best-effort Cloudinary cleanup when the event owns a library banner.
  if (existing[0].cloudinaryId) {
    await deleteCloudinaryAsset(existing[0].cloudinaryId);
  }
  const [updated] = await db.update(schema.events).set({ status: 'archived', updatedAt: new Date() })
    .where(eq(schema.events.id, id)).returning();
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'event', id, 'Archived', req.ip);
  res.json({ success: true, message: 'Event archived' });
}));

// ── Enquiries inbox ─────────────────────────────────────────────────────────
const ENQUIRY_FIELDS = {
  id: schema.enquiries.id, name: schema.enquiries.name, email: schema.enquiries.email,
  phone: schema.enquiries.phone, subject: schema.enquiries.subject, message: schema.enquiries.message,
  status: schema.enquiries.status, createdAt: schema.enquiries.createdAt,
};

router.get('/enquiries', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? '').trim();
  const status = String(req.query.status ?? '').trim();

  const conditions: any[] = [];
  if (status) conditions.push(eq(schema.enquiries.status, status as any));
  if (search) conditions.push(or(
    ilike(schema.enquiries.name, `%${sanitizeSearch(search)}%`),
    ilike(schema.enquiries.email, `%${sanitizeSearch(search)}%`),
    ilike(schema.enquiries.subject, `%${sanitizeSearch(search)}%`),
  ));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.enquiries).where(where);
  const data = await db.select(ENQUIRY_FIELDS).from(schema.enquiries).where(where)
    .orderBy(desc(schema.enquiries.createdAt)).limit(limit).offset(offset);

  const statusCounts = await db.select({ status: schema.enquiries.status, n: count() })
    .from(schema.enquiries).groupBy(schema.enquiries.status);

  res.json({
    success: true, data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    statusCounts: statusCounts.reduce<Record<string, number>>((acc, r) => { acc[r.status] = r.n; return acc; }, {}),
  });
}));

router.put('/enquiries/:id', validate(updateEnquiryStatusSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { status } = req.body;
  const [updated] = await db.update(schema.enquiries).set({ status })
    .where(eq(schema.enquiries.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Enquiry not found');
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'enquiry', id, `Status → ${status}`, req.ip);
  res.json({ success: true, data: updated, message: 'Enquiry updated' });
}));

// ── Media library ───────────────────────────────────────────────────────────
const MEDIA_FIELDS = {
  id: schema.mediaAssets.id, publicId: schema.mediaAssets.publicId, url: schema.mediaAssets.url,
  resourceType: schema.mediaAssets.resourceType, format: schema.mediaAssets.format,
  bytes: schema.mediaAssets.bytes, width: schema.mediaAssets.width, height: schema.mediaAssets.height,
  altText: schema.mediaAssets.altText, createdAt: schema.mediaAssets.createdAt,
};

router.get('/media', asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'))));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? '').trim();
  const type = String(req.query.type ?? '').trim();

  const conditions: any[] = [];
  if (type) conditions.push(eq(schema.mediaAssets.resourceType, type as any));
  if (search) conditions.push(or(
    ilike(schema.mediaAssets.publicId, `%${sanitizeSearch(search)}%`),
    ilike(schema.mediaAssets.altText, `%${sanitizeSearch(search)}%`),
  ));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(schema.mediaAssets).where(where);
  const data = await db.select(MEDIA_FIELDS).from(schema.mediaAssets).where(where)
    .orderBy(desc(schema.mediaAssets.createdAt)).limit(limit).offset(offset);

  res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.put('/media/:id', validate(updateMediaAltSchema), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const { altText } = req.body;
  const [updated] = await db.update(schema.mediaAssets).set({ altText: altText ?? '' })
    .where(eq(schema.mediaAssets.id, id)).returning();
  if (!updated) throw new ApiError(404, 'Media asset not found');
  await logAudit(req.user!.id, req.user!.role, 'UPDATE', 'media', id, 'Alt text updated', req.ip);
  res.json({ success: true, data: updated, message: 'Media updated' });
}));

/**
 * DELETE /media/:id — reference-checked deletion.
 * The asset is only deleted from Cloudinary + DB when it is NOT referenced by
 * published content: materials.cloudinary_id, events.cloudinary_id, or any
 * CMS live/draft JSON containing the asset URL/public id.
 */
router.delete('/media/:id', asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const existing = await db.select().from(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  if (!existing.length) throw new ApiError(404, 'Media asset not found');
  const asset = existing[0];

  const [materialRefs, eventRefs, settingsRefs] = await Promise.all([
    db.select({ n: count() }).from(schema.materials)
      .where(and(
        eq(schema.materials.cloudinaryId, asset.publicId),
        eq(schema.materials.visibility, true),
      )),
    db.select({ n: count() }).from(schema.events)
      .where(and(
        eq(schema.events.cloudinaryId, asset.publicId),
        eq(schema.events.status, 'published'),
      )),
    db.select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings)
      .where(like(schema.settings.key, 'cms.%')),
  ]);

  const cmsRefs = settingsRefs.filter((r) =>
    r.value.includes(asset.publicId) || r.value.includes(asset.url)
  );

  const materialCount = materialRefs[0]?.n ?? 0;
  const eventCount = eventRefs[0]?.n ?? 0;
  if (materialCount > 0 || eventCount > 0 || cmsRefs.length > 0) {
    throw new ApiError(409, `Cannot delete: asset is referenced by ${materialCount} material(s), ${eventCount} event(s), ${cmsRefs.length} CMS section(s)`);
  }

  await deleteCloudinaryAsset(asset.publicId);
  await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  await logAudit(req.user!.id, req.user!.role, 'DELETE', 'media', id, asset.publicId, req.ip);
  res.json({ success: true, message: 'Media asset deleted' });
}));

// ── Global admin search ─────────────────────────────────────────────────────
// Server-side search across the entities admins actually look up. Each result
// group is capped so the payload stays small even for large datasets.
router.get('/search', validate(searchSchema), asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  if (!q) {
    res.json({ success: true, data: { students: [], teachers: [], courses: [], notices: [], events: [] } });
    return;
  }
  const pattern = `%${q}%`;

  const [students, teachers, courses, notices, events] = await Promise.all([
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone, status: schema.users.status })
      .from(schema.users)
      .where(and(eq(schema.users.role, 'student'), or(ilike(schema.users.name, pattern), ilike(schema.users.email, pattern), ilike(schema.users.phone, pattern))))
      .orderBy(asc(schema.users.name)).limit(8),
    db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone, status: schema.users.status })
      .from(schema.users)
      .where(and(eq(schema.users.role, 'teacher'), or(ilike(schema.users.name, pattern), ilike(schema.users.email, pattern), ilike(schema.users.phone, pattern))))
      .orderBy(asc(schema.users.name)).limit(8),
    db.select({ id: schema.courses.id, name: schema.courses.name, status: schema.courses.status })
      .from(schema.courses)
      .where(ilike(schema.courses.name, pattern))
      .orderBy(asc(schema.courses.name)).limit(8),
    db.select({ id: schema.notices.id, title: schema.notices.title, status: schema.notices.status })
      .from(schema.notices)
      .where(ilike(schema.notices.title, pattern))
      .orderBy(desc(schema.notices.updatedAt)).limit(8),
    db.select({ id: schema.events.id, name: schema.events.name, status: schema.events.status })
      .from(schema.events)
      .where(ilike(schema.events.name, pattern))
      .orderBy(desc(schema.events.updatedAt)).limit(8),
  ]);

  res.json({ success: true, data: { students, teachers, courses, notices, events } });
}));

// ── System health (admin) ───────────────────────────────────────────────────
// Safe operational status only — never secrets, connection strings, or keys.
router.get('/system', asyncHandler(async (req, res) => {
  const dbCheck = await db.execute(sql`SELECT 1 as ok`);
  const dbOk = Array.isArray(dbCheck) && dbCheck.length > 0;

  const [userCount, mediaCount, noticeCount, eventCount, enquiryCount] = await Promise.all([
    db.select({ n: count() }).from(schema.users),
    db.select({ n: count() }).from(schema.mediaAssets),
    db.select({ n: count() }).from(schema.notices),
    db.select({ n: count() }).from(schema.events),
    db.select({ n: count() }).from(schema.enquiries),
  ]);

  res.json({
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      database: { ok: dbOk },
      counts: {
        users: userCount[0]?.n ?? 0,
        mediaAssets: mediaCount[0]?.n ?? 0,
        notices: noticeCount[0]?.n ?? 0,
        events: eventCount[0]?.n ?? 0,
        enquiries: enquiryCount[0]?.n ?? 0,
      },
    },
  });
}));

export default router;
