import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { isDbConnected } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/error.js';
import { validate } from '../middleware/validation.js';
import { updateProfileSchema } from '../validation/schemas.js';

const router: ExpressRouter = Router();

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  // In offline/degraded mode, return the mock user from the auth middleware directly
  if (!isDbConnected) {
    res.json({ success: true, data: req.user });
    return;
  }

  const [user] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      profileImage: schema.users.profileImage,
      status: schema.users.status,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, req.user!.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
}));

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // In offline/degraded mode, skip DB write and return success
  if (!isDbConnected) {
    res.json({ success: true, message: 'Logged out' });
    return;
  }

  await db.insert(schema.authEvents).values({
    userId: req.user!.id,
    supabaseAuthId: req.user!.supabaseAuthId,
    eventType: 'logout',
    status: 'success',
    ipAddress: req.ip,
    userAgent: req.get('user-agent') ?? undefined,
  });

  res.json({ success: true, message: 'Logged out' });
}));

// PUT /api/auth/profile
router.put('/profile', authenticate, validate(updateProfileSchema), asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      throw new ApiError(400, 'name must be between 2 and 100 characters');
    }
  }
  if (phone !== undefined && phone !== null && phone !== '') {
    if (!/^\+?[\d\s\-().]{7,20}$/.test(String(phone).trim())) {
      throw new ApiError(400, 'Invalid phone number format');
    }
  }
  const updates: any = { updatedAt: new Date() };
  if (name) updates.name = String(name).trim();
  if (phone !== undefined) updates.phone = phone;
  await db.update(schema.users).set(updates).where(eq(schema.users.id, req.user!.id));
  res.json({ success: true, message: 'Profile updated' });
}));

export default router;
