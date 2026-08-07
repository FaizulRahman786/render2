// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

import type { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { resolveSupabaseAuthUser } from '../services/authService.js';
import { ApiError } from './error.js';
import { logger } from '../lib/logger.js';
import type { AuthUser } from '../../../../packages/shared-types/src/index';
import { UserRole } from '../../../../packages/shared-types/src/index.js';
import { config } from '../config/env.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7).trim() || null;
}

// Mock user mapping for E2E tests — only active when ENABLE_AUTH_MOCK=true
// Keys are the Bearer token strings used by the test suite
const MOCK_USERS: ReadonlyMap<string, AuthUser> = new Map([
  ['mock-token-admin@demo.com',   { id: '00000000-0000-4000-8000-000000000001', name: 'Demo Admin',   email: 'admin@demo.com',   role: UserRole.ADMIN,   supabaseAuthId: 'mock-token-admin@demo.com',   phone: '+919999999999', profileImage: undefined }],
  ['mock-token-teacher@demo.com', { id: '00000000-0000-4000-8000-000000000002', name: 'Demo Teacher', email: 'teacher@demo.com', role: UserRole.TEACHER, supabaseAuthId: 'mock-token-teacher@demo.com', phone: '+919999999998', profileImage: undefined }],
  ['mock-token-student@demo.com', { id: '00000000-0000-4000-8000-000000000003', name: 'Demo Student', email: 'student@demo.com', role: UserRole.STUDENT, supabaseAuthId: 'mock-token-student@demo.com', phone: '+919999999997', profileImage: undefined }],
  ['mock-token-student2@demo.com',{ id: '00000000-0000-4000-8000-000000000004', name: 'Demo Student 2', email: 'student2@demo.com', role: UserRole.STUDENT, supabaseAuthId: 'mock-token-student2@demo.com', phone: '+919999999995', profileImage: undefined }],
]);

// GoTrue returns this error class for network/5xx failures. Distinguishing it
// from a genuine 401 is what prevents transient outages from logging users out.
function isSupabaseTransientError(error: any): boolean {
  if (!error) return false;
  const status = Number(error.status);
  if (status >= 500) return true;
  if (status >= 400 && status <= 499) return false;
  // No HTTP status → transport-level failure (DNS, connect, CORS, timeout).
  return true;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    // E2E test mock authentication — bypasses Supabase entirely
    if (config.enableAuthMock && MOCK_USERS.has(token)) {
      if (config.nodeEnv === 'production') {
        logger.error('[AUTH] SECURITY: enableAuthMock=true in production — blocking request');
        res.status(500).json({ success: false, error: 'Authentication misconfiguration' });
        return;
      }
      req.user = MOCK_USERS.get(token)!;
      next();
      return;
    }

    const { data, error } = await getSupabaseClient().auth.getUser(token);
    if (error || !data.user) {
      if (isSupabaseTransientError(error)) {
        res.status(503).json({
          success: false,
          error: 'Authentication service temporarily unavailable. Please try again.',
        });
        return;
      }
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    req.user = await resolveSupabaseAuthUser(data.user, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    });
    next();
  } catch (error: any) {
    // Deliberate auth failures (ApiError) keep their exact status + safe message.
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    // Anything else (DB driver failures, unexpected bugs) is delegated to the
    // central error handler so internal details are never exposed to clients
    // and unexpected errors surface as sanitized 500s, not misleading 401s.
    logger.error({ err: error, reqId: req.id }, 'Unexpected authentication failure');
    next(error);
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
}

export const requireAdmin = authorize('admin' as UserRole);
export const requireTeacher = authorize('teacher' as UserRole, 'admin' as UserRole);
export const requireStudent = authorize('student' as UserRole);
