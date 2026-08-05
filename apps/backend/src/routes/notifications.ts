import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq, desc, and, count, lt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { emitToUsers, registerSseClient } from '../ws/wsManager.js';
import { assertRecipientsScopedToTeacher } from '../services/authorization.js';
import { validate } from '../middleware/validation.js';
import { sendNotificationSchema } from '../validation/schemas.js';

const router: ExpressRouter = Router();

router.use(authenticate);

// SSE stream. The frontend uses fetch with Authorization headers so bearer
// tokens are not exposed in URLs.
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const cleanup = registerSseClient(req.user!.id, req.user!.role, res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    cleanup();
  });
});

router.get('/', asyncHandler(async (req, res) => {
  const { type, before, limit: limitStr } = req.query as Record<string, string>;
  const limit = Math.min(Number(limitStr) || 30, 50);

  const conditions: any[] = [eq(schema.notifications.receiverId, req.user!.id)];
  if (type && type !== 'all') conditions.push(eq(schema.notifications.type, type));
  if (before) conditions.push(lt(schema.notifications.createdAt, new Date(before)));

  const data = await db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(limit);
  res.json({ success: true, data });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const [{ total }] = await db
    .select({ total: count() })
    .from(schema.notifications)
    .where(and(
      eq(schema.notifications.receiverId, req.user!.id),
      eq(schema.notifications.isRead, false),
    ));
  res.json({ success: true, data: { count: total } });
}));

// NOTE: /read-all MUST be defined before /:id/read — otherwise Express matches
// the literal string "read-all" as the :id parameter and Postgres throws a UUID cast error.
router.patch('/read-all', asyncHandler(async (req, res) => {
  await db
    .update(schema.notifications)
    .set({ isRead: true })
    .where(and(
      eq(schema.notifications.receiverId, req.user!.id),
      eq(schema.notifications.isRead, false),
    ));
  res.json({ success: true, message: 'All marked as read' });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const notificationId = String(req.params.id);
  await db
    .update(schema.notifications)
    .set({ isRead: true })
    .where(and(
      eq(schema.notifications.id, notificationId),
      eq(schema.notifications.receiverId, req.user!.id),
    ));
  res.json({ success: true, message: 'Marked as read' });
}));

router.post('/send', validate(sendNotificationSchema), asyncHandler(async (req, res) => {
  if (req.user!.role !== 'admin' && req.user!.role !== 'teacher') {
    throw new ApiError(403, 'Not allowed');
  }
  const { receiverIds, title, message, type = 'general', link } = req.body;
  if (!receiverIds?.length || !title || !message) {
    throw new ApiError(400, 'receiverIds, title, message required');
  }

  // D4: teachers may only notify students enrolled in one of their batches.
  // Admins retain institute-wide send (broadcast handled separately).
  if (req.user!.role === 'teacher') {
    await assertRecipientsScopedToTeacher(req.user!.id, receiverIds);
  }

  const inserted = await db.insert(schema.notifications).values(
    receiverIds.map((rid: string) => ({
      receiverId: rid, senderId: req.user!.id, type, title, message, link,
    }))
  ).returning();

  const wsEvent = { id: inserted[0]?.id, title, message, type, link, createdAt: new Date().toISOString(), isRead: false };
  emitToUsers(receiverIds, wsEvent);

  res.status(201).json({ success: true, message: 'Notifications sent' });
}));

export default router;
