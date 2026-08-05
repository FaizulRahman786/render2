import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.BACKEND_PORT || process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  authProvider: process.env.AUTH_PROVIDER || 'supabase',
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:5002,http://127.0.0.1:5000,http://127.0.0.1:5002',
  // Must be explicitly set to 'true' to enable offline mock mode. Never enable in production.
  enableAuthMock: process.env.ENABLE_AUTH_MOCK === 'true',
  // Backend-only Supabase admin key used for account provisioning (admin.createUser).
  // NEVER exposed to the frontend. Optional at startup; required only for provisioning endpoints.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  // Cloudinary media URL (cloudinary://<key>:<secret>@<cloud>). Optional —
  // material uploads fall back to local disk serving when unset.
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  // Custom page preview token signing secret (64-char hex). Required for admin preview.
  customPageSecret: process.env.CUSTOM_PAGE_SECRET || '',
  // Sentry DSN for error tracking
  sentryDsn: process.env.SENTRY_DSN || '',
} as const;

export function validateEnv() {
  const missing = [] as string[];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!['legacy', 'supabase', 'dual'].includes(config.authProvider)) {
    throw new Error('AUTH_PROVIDER must be one of: legacy, supabase, dual');
  }

  // FAIL-CLOSED GUARD: mock auth may NEVER run in production.
  // If someone sets ENABLE_AUTH_MOCK=true alongside NODE_ENV=production,
  // the server refuses to start rather than serving fake identities/data.
  if (config.nodeEnv === 'production' && config.enableAuthMock) {
    throw new Error(
      'ENABLE_AUTH_MOCK must not be "true" in production. Mock auth is a development-only safety valve and bypasses all real security. Refusing to start.'
    );
  }

  // CUSTOM_PAGE_SECRET is required for custom page preview tokens
  if (!config.customPageSecret) {
    if (config.nodeEnv === 'production') {
      throw new Error('CUSTOM_PAGE_SECRET is required in production for secure preview tokens');
    } else {
      console.warn('[CONFIG] CUSTOM_PAGE_SECRET not set — custom page preview tokens will not work in development');
    }
  }

  // Validate Cloudinary URL format if provided
  if (config.cloudinaryUrl && !/^cloudinary:\/\//.test(config.cloudinaryUrl)) {
    throw new Error('CLOUDINARY_URL must start with "cloudinary://"');
  }

  // Validate DATABASE_URL format if provided
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      throw new Error('DATABASE_URL is not a valid URL');
    }
  }
}
