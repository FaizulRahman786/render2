// ============================================
// BOOTSTRAP ADMIN — creates the platform admin
// ============================================
// Idempotent. Creates (or finds) the Supabase Auth identity for the admin
// email, forces its uid / app-user uid to ADMIN_UID, and verifies the
// email+password login with signInWithPassword.
//
// Requires (in .env):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL,
//   ADMIN_EMAIL, ADMIN_UID, ADMIN_PASSWORD
//
// Usage: node scripts/bootstrap-admin.mjs

import 'dotenv/config';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const env = process.env;
const ADMIN_EMAIL = (env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_UID = (env.ADMIN_UID || '').trim();
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || '';
const ADMIN_NAME = env.ADMIN_NAME || 'Platform Admin';

function fail(msg) {
  console.error(`[bootstrap-admin] ERROR: ${msg}`);
  process.exit(1);
}

if (!env.SUPABASE_URL) fail('SUPABASE_URL is not set in .env');
if (!env.SUPABASE_SERVICE_ROLE_KEY) fail('SUPABASE_SERVICE_ROLE_KEY is not set in .env — get it from Supabase Dashboard → Settings → API → service_role');
if (!env.DATABASE_URL) fail('DATABASE_URL is not set in .env');
if (!ADMIN_EMAIL || !ADMIN_UID || !ADMIN_PASSWORD) fail('ADMIN_EMAIL, ADMIN_UID and ADMIN_PASSWORD must be set in .env');
if (ADMIN_PASSWORD.length < 8) fail('ADMIN_PASSWORD must be at least 8 characters');

const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(env.DATABASE_URL, { max: 2 });

async function findAuthUserByEmail(email) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Failed to list users: ${error.message}`);
    const hit = (data.users || []).find((u) => (u.email || '').toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function listAuthColumns(tx) {
  const rows = await tx`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users'
    ORDER BY ordinal_position`;
  return rows.map((r) => r.column_name);
}

async function rePointAuthIdentity(tx, oldId, newId) {
  // GoTrue schemas differ by version; auth.sessions / auth.refresh_tokens may not exist.
  for (const [table, col] of [['identities', 'user_id'], ['sessions', 'user_id'], ['refresh_tokens', 'user_id']]) {
    const [meta] = await tx`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'auth' AND table_name = ${table} AND table_type = 'BASE TABLE'`;
    if (!meta) {
      console.log(`[bootstrap-admin] auth.${table} absent — skipping re-point`);
      continue;
    }
    await tx`
      UPDATE auth.${tx(table)} SET ${tx(col)} = ${newId}
      WHERE ${tx(col)} = ${oldId}`;
  }
}

async function main() {
  console.log(`[bootstrap-admin] Ensuring auth identity for ${ADMIN_EMAIL} ...`);

  let authUser = await findAuthUserByEmail(ADMIN_EMAIL);
  if (!authUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME },
      app_metadata: { role: 'admin' },
    });
    if (error) fail(`createUser failed: ${error.message} (status ${error.status})`);
    authUser = data.user;
    console.log(`[bootstrap-admin] Created auth identity ${authUser.id}`);
  } else {
    console.log(`[bootstrap-admin] Auth identity already exists: ${authUser.id}`);
  }

  const authId = authUser.id;

  // 1) If the DB already uses a different auth uid, force it to ADMIN_UID.
  if (authId !== ADMIN_UID) {
    console.log(`[bootstrap-admin] Re-pointing auth identity ${authId} -> ${ADMIN_UID} ...`);
    await sql.begin(async (tx) => {
      const cols = await listAuthColumns(tx);
      if (!cols.includes('id')) fail('auth.users has no id column');
      // Copy the row with the new id, re-point children, delete the old row.
      const insertCols = cols.map((c) => `"${c}"`).join(', ');
      const selectCols = cols.map((c) => (c === 'id' ? `'${ADMIN_UID}'::uuid` : `"${c}"`)).join(', ');
      await tx.unsafe(`INSERT INTO auth.users (${insertCols}) SELECT ${selectCols} FROM auth.users WHERE id = '${authId}'`);
      await tablePointAuthUser(tx, authId, ADMIN_UID);
      await tx`DELETE FROM auth.users WHERE id = ${authId}`;
    });
    console.log(`[bootstrap-admin] Auth uid is now ${ADMIN_UID}`);
  }

  // 2) Upsert public.users (role admin) — the app's authoritative user row.
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO public.users (id, name, email, phone, password, role, status, created_at, updated_at)
      VALUES (${ADMIN_UID}, ${ADMIN_NAME}, ${ADMIN_EMAIL}, '', '', 'admin', 'active', now(), now())
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = 'admin', status = 'active'`;

    // profiles links auth identity <-> app user. Unique target = supabase_auth_id.
    await tx`
      INSERT INTO public.profiles (supabase_auth_id, user_id, primary_provider)
      VALUES (${ADMIN_UID}, ${ADMIN_UID}, 'email')
      ON CONFLICT (supabase_auth_id) DO UPDATE SET user_id = EXCLUDED.user_id`;
  });
  console.log(`[bootstrap-admin] public.users + profiles rows ready for ${ADMIN_EMAIL}`);

  // 4) Verify the real email+password login (anon key = regular sign-in).
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || '', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signin, error: signinError } = await anon.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (signinError) fail(`Sign-in verification failed: ${signinError.message}`);
  console.log(`[bootstrap-admin] ✅ password login verified for ${signin.user.email} (uid ${signin.user.id})`);

  await sql.end();
  console.log('[bootstrap-admin] Done — admin account is provisioned.');
}

async function tablePointAuthUser(tx, oldId, newId) {
  for (const [table, col] of [
    ['identities', 'user_id'],
    ['sessions', 'user_id'],
    ['refresh_tokens', 'user_id'],
  ]) {
    const [meta] = await tx`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'auth' AND table_name = ${table} AND table_type = 'BASE TABLE'`;
    if (!meta) continue;
    await tx.unsafe(`UPDATE auth."${table}" SET "${col}" = '${newId}' WHERE "${col}" = '${oldId}'`);
  }
}

main().catch((err) => {
  console.error('[bootstrap-admin] FATAL:', err);
  process.exit(1);
});