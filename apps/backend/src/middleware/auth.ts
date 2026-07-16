// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

import type { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { resolveSupabaseAuthUser } from '../services/authService.js';
import type { AuthUser, UserRole } from '../../../../packages/shared-types/src/index';

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

    const { data, error } = await getSupabaseClient().auth.getUser(token);
    if (error || !data.user) {
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
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 401;
    res.status(statusCode).json({
      success: false,
      error: error?.message || 'Authentication failed',
    });
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
