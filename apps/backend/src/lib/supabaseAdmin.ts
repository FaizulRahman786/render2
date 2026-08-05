// ============================================
// SUPABASE ADMIN CLIENT (service-role)
// ============================================
// BACKEND-ONLY. Uses the SUPABASE_SERVICE_ROLE_KEY for privileged Auth
// operations (admin.createUser / admin.deleteUser) during account
// provisioning. This client MUST NEVER be exposed to the frontend, imported by
// any client bundle, or used for ordinary runtime queries.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import { ApiError } from '../middleware/error.js';

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new ApiError(
      503,
      'Account provisioning is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the backend environment.',
    );
  }

  if (!adminClient) {
    adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        // Server-side client — no token refresh, no session persistence.
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}