// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'This record already exists' },
  '23503': { status: 422, message: 'The referenced record does not exist or is in use' },
  '23502': { status: 400, message: 'A required field is missing' },
  '22P02': { status: 400, message: 'Invalid identifier format' },
  '22003': { status: 400, message: 'Numeric value out of range' },
};

// ORMs (drizzle) wrap driver errors in their own Error subclass and attach the
// underlying PostgresError as `cause`. Unpack the full chain so the real PG
// error code (e.g. 23503 FK violation) is surfaced for mapping.
function unwrapPgsError(err: unknown): { code?: string; message?: string } | null {
  let current: any = err;
  const seen = new Set<any>();
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (typeof current.code === 'string' && /^[A-Z0-9]{5}$/.test(current.code)) {
      return { code: current.code, message: current.message };
    }
    current = current.cause;
  }
  return null;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.log('[ERROR HANDLER CALLED]', err?.message);
  const pgError = unwrapPgsError(err);
  const pgCode = pgError?.code;
  const pgMapping = typeof pgCode === 'string' ? PG_ERROR_MAP[pgCode] : undefined;
  const statusCode = pgMapping?.status ?? err.statusCode ?? 500;
  const message = err.message || 'Internal server error';

  console.error('Error:', {
    statusCode,
    message,
    pgCode: pgCode ?? undefined,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Only surface messages we deliberately raised (ApiError) or explicit PG
  // mappings. Unexpected driver errors never leak internals to clients.
  let safeMessage: string;
  if (pgMapping) {
    safeMessage = pgMapping.message;
  } else if (err.isOperational || process.env.NODE_ENV === 'development') {
    safeMessage = message;
  } else {
    safeMessage = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    error: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
}

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper to catch errors in async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
