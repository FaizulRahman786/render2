import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  ApiError,
  errorHandler,
  notFoundHandler,
} from '../src/middleware/error.js';

function buildApp(behavior: (req: Request, res: Response, next: NextFunction) => void) {
  const app = express();
  app.get('/boom', behavior);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.spyOn(console, 'error').mockRestore();
  });

  it('surfaces ApiError status and message (operational)', async () => {
    const app = buildApp((_req, _res, next) => {
      next(new ApiError(404, 'Test not found'));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Test not found' });
  });

  it('maps Postgres unique violation (23505) to 409 without leaking SQL', async () => {
    const app = buildApp((_req, _res, next) => {
      next(Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), { code: '23505' }));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('This record already exists');
    expect(JSON.stringify(res.body)).not.toContain('users_email_key');
  });

  it('maps FK violation (23503) to 422', async () => {
    const app = buildApp((_req, _res, next) => {
      next(Object.assign(new Error('fk'), { code: '23503' }));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(422);
  });

  it('does not leak unexpected error internals in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = buildApp((_req, _res, next) => {
      next(new Error('secret-sql-internal'));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('leaks the message + stack in development only', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const app = buildApp((_req, _res, next) => {
      next(new Error('dev debug detail'));
    });
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('dev debug detail');
    expect(typeof res.body.stack).toBe('string');
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with the route in the message', async () => {
    const app = express();
    app.use(notFoundHandler);
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('/nope');
  });
});