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
}
