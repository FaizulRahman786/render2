// Sentry integration - optional, only activates if @sentry/react is installed and VITE_SENTRY_DSN is set
// This file uses dynamic import to avoid build errors if @sentry/react is not installed

let Sentry: any = null;
let browserTracingIntegration: any = null;
let replayIntegration: any = null;

try {
  Sentry = require('@sentry/react');
  browserTracingIntegration = Sentry.browserTracingIntegration;
  replayIntegration = Sentry.replayIntegration;
} catch {
  // @sentry/react not installed
}

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !Sentry) {
    if (!Sentry) console.warn('[Sentry] @sentry/react not installed — skipping initialization');
    else console.warn('[Sentry] VITE_SENTRY_DSN not set — skipping initialization');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    integrations: [
      browserTracingIntegration(),
      replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    release: import.meta.env.VITE_APP_VERSION || 'unknown',
    beforeSend(event: any) {
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.value?.includes('Not found')) return null;
      }
      return event;
    },
    enableTracing: true,
  });
}

export const sentryErrorBoundary = Sentry?.withProfiler ?? ((Component: any) => Component);