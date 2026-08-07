import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler, asyncHandler, ApiError } from './middleware/error.js';
import { authenticate } from './middleware/auth.js';
import { assertTeacherCanAccessStudent } from './services/authorization.js';
import { logger } from './lib/logger.js';
import { initSentry, sentryMiddleware, sentryErrorMiddleware } from './lib/sentry.js';
import { stopHeartbeat } from './ws/wsManager.js';
import type { Express } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

validateEnv();

initSentry();

const app: Express = express();

// Trust proxy (needed for Render / Replit + rate limiting to correctly identify clients)
app.set('trust proxy', 1);

// Request logging middleware
app.use((req, _res, next) => {
  const start = Date.now();
  req.id = crypto.randomUUID();
  logger.info({ reqId: req.id, method: req.method, url: req.url, ip: req.ip }, 'Incoming request');
  next();
});

// Response logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({ reqId: req.id, method: req.method, url: req.url, status: res.statusCode, durationMs: duration }, 'Request completed');
  });
  next();
});

// Sentry request handler (must be before other middleware)
app.use(sentryMiddleware);

const allowedOrigins = (config.corsOrigin || '').split(',').map((origin) => origin.trim()).filter(Boolean);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'", ...allowedOrigins],
    },
  },
  frameguard: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// CORS runs BEFORE rate limiting so cross-origin OPTIONS preflights are answered
// by the `cors` middleware and never consume the rate-limit budget. The auth
// limiters below additionally skip OPTIONS as defense-in-depth.
app.use(cors({
  origin: (origin, callback) => {
    if (config.nodeEnv !== 'production') {
      logger.debug({ origin, nodeEnv: config.nodeEnv, allowedOrigins }, 'CORS Debug');
    }
    if (!origin) {
      // Requests without an Origin header (health checks, curl, server-to-server,
      // same-origin) are allowed. Browsers always attach Origin for cross-origin
      // fetches, so allowing its absence does not weaken the allow-list below.
      callback(null, true);
      return;
    }

    const isDevelopmentOrigin = config.nodeEnv !== 'production'
      && ['http://localhost:5000', 'http://127.0.0.1:5000', 'https://app.github.dev'].includes(origin);

    const allowsWildcard = config.nodeEnv !== 'production' && allowedOrigins.includes('*');
    if (allowsWildcard || allowedOrigins.includes(origin) || isDevelopmentOrigin) {
      callback(null, true);
      return;
    }

    if (config.nodeEnv !== 'production') {
      logger.warn({ origin }, 'CORS Reject');
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));

// Rate limiting
// Each limit is keyed per-IP (honoring `trust proxy`). Limits are sized so that
// legitimate application behavior NEVER trips them, while open abuse is still
// throttled. The auth routes are monitored independently because:
//   GET  /api/auth/me  — called on page load, after sign-in and on token
//                        refresh events. The frontend de-duplicates these, so a
//                        normal session makes ~2–4 calls per 5 minutes. The
//                        window here (60 / 5 min) still bounds a misbehaving
//                        client without ever locking out a real user.
//   POST /api/auth/logout — rare per user; limit guards token-flooding.
//   PUT  /api/auth/profile — rare per user; limit guards write abuse.
// A blanket 5-per-15-minute limit over the whole prefix was rejected because it
// turned legitimate `/api/auth/me` traffic into a 429 lockout (previously
// triggering ~4 HTTP 429s after exactly 2 requests in this environment).
const skipPreflight = (req: { method: string }) => req.method === 'OPTIONS';
app.use('/api/auth/me', rateLimit({
  windowMs: 5 * 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { success: false, error: 'Too many session checks. Please try again later.' },
}));
app.use('/api/auth/logout', rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { success: false, error: 'Too many logout attempts. Please try again later.' },
}));
app.use('/api/auth/profile', rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { success: false, error: 'Too many profile updates. Please try again later.' },
}));
app.use('/api/admin', rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipPreflight,
  message: { success: false, error: 'Too many admin requests. Please try again later.' },
}));
const skipNonPost = (req: { method: string }) => req.method !== 'POST';
app.use('/api/upload', rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipNonPost,
  message: { success: false, error: 'Too many upload attempts. Please try again later.' },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test route to verify Express is working
app.get('/test', (_req, res) => {
  logger.debug('Test route hit');
  try {
    res.json({ success: true, message: 'Test route works' });
  } catch (err) {
    logger.error({ err }, 'Test route error');
    throw err;
  }
});

// Global error logging
app.use((err: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error({ err, reqId: req.id, method: req.method, url: req.url }, 'Global error');
  next(err);
});

if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'Request');
    next();
  });
}

// ── Private uploads (Phase L) ───────────────────────────────────────────────
// Files under uploads/private/ are NEVER served by express.static. They are
// only reachable through this authorized endpoint, which checks ownership:
// - students: only their own files (404 otherwise — no enumeration)
// - teachers: only students they share a batch with (404 otherwise)
// - admins: any file
app.get('/api/uploads/private/student/:userId/:file', authenticate, asyncHandler(async (req, res) => {
  const owner = String(req.params.userId);
  const fileName = String(req.params.file);

  if (req.user!.role === 'student') {
    if (req.user!.id !== owner) throw new ApiError(404, 'File not found');
  } else if (req.user!.role === 'teacher') {
    await assertTeacherCanAccessStudent(req.user!.id, owner);
  }

  const base = path.join(process.cwd(), 'uploads', 'private', 'student');
  const filePath = path.join(base, owner, fileName);
  // Path containment — reject any traversal outside the student's own folder.
  if (!filePath.startsWith(path.join(base, owner) + path.sep)) {
    throw new ApiError(400, 'Invalid file path');
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new ApiError(404, 'File not found');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'attachment');
  res.sendFile(filePath);
}));

// Serve uploaded files with security headers to prevent XSS via uploaded HTML/JS files.
// The /private/ prefix is reserved for the authorized endpoint above — never static.
app.use('/api/uploads', (req, res, next) => {
  if (req.path.startsWith('/private/')) {
    res.status(403).json({ success: false, error: 'Private files are not served statically' });
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'attachment');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({ message: 'Coaching Platform API', version: '1.0.0' });
});

// Sentry error handler (must be before custom error handler)
app.use(sentryErrorMiddleware);

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(config.port, () => {
      logger.info({ port: config.port }, 'API Server started');
      logger.info('SSE notifications available at /api/notifications/stream');
    });

    // Drain in-flight requests and close the DB pool on platform restart/deploy.
    const shutdown = (signal: string) => {
      logger.info({ signal }, 'Shutting down gracefully');
      stopHeartbeat();
      server.close(async () => {
        try {
          await disconnectDatabase();
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
        } finally {
          process.exit(0);
        }
      });
      // Force-exit if connections do not drain in time.
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => logger.fatal({ reason }, 'Unhandled Rejection'));

startServer();

export default app;
