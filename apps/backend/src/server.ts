import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import type { Express } from 'express';

validateEnv();

const app: Express = express();

// Trust proxy (needed for Render / Replit + rate limiting to correctly identify clients)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

const allowedOrigins = (config.corsOrigin || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    console.log('[CORS Debug] Origin:', origin, 'nodeEnv:', config.nodeEnv, 'allowedOrigins:', allowedOrigins);
    // In production, always require an Origin header to prevent CSRF from non-browser clients
    if (!origin) {
      if (config.nodeEnv !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS: Origin header required in production'));
      }
      return;
    }

    const isDevelopmentOrigin = config.nodeEnv !== 'production'
      && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('app.github.dev'));

    const allowsWildcard = config.nodeEnv !== 'production' && allowedOrigins.includes('*');
    if (allowsWildcard || allowedOrigins.includes(origin) || isDevelopmentOrigin) {
      callback(null, true);
      return;
    }

    console.warn('[CORS Reject] Rejected origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

if (config.nodeEnv === 'development') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Serve uploaded files with security headers to prevent XSS via uploaded HTML/JS files
app.use('/api/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'attachment');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

app.get('/', (_req, res) => {
  res.json({ message: 'Coaching Platform API', version: '1.0.0' });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDatabase();
    const server = app.listen(config.port, () => {
      console.log(`🚀 API Server running on port ${config.port}`);
      console.log(`📡 SSE notifications available at /api/notifications/stream`);
    });

    // Drain in-flight requests and close the DB pool on platform restart/deploy.
    const shutdown = (signal: string) => {
      console.log(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        try {
          await disconnectDatabase();
        } catch (err) {
          console.error('Error during shutdown:', err);
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
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

startServer();

export default app;
