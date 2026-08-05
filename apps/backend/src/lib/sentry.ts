// Sentry integration - optional, only activates if @sentry/node is installed and SENTRY_DSN is set
let Sentry: any = null;
try {
  Sentry = require('@sentry/node');
} catch {
  // @sentry/node not installed
}

export function initSentry(dsn?: string) {
  const sentryDsn = dsn || process.env.SENTRY_DSN;
  if (!sentryDsn || !Sentry) {
    if (!Sentry) console.warn('[Sentry] @sentry/node not installed — skipping initialization');
    else console.warn('[Sentry] SENTRY_DSN not set — skipping initialization');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    enableTracing: true,
    beforeSend(event: any, hint: any) {
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const status = (error as any).statusCode;
          if (status === 404 || status === 422) return null;
        }
      }
      return event;
    },
    release: process.env.APP_VERSION || 'unknown',
    serverName: process.env.HOSTNAME || 'coaching-backend',
  });
}

export const sentryMiddleware = Sentry?.Handlers?.requestHandler() ?? ((req: any, res: any, next: any) => next());
export const sentryErrorMiddleware = Sentry?.Handlers?.errorHandler() ?? ((err: any, req: any, res: any, next: any) => next(err));