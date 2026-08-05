// Applies supabase migrations 0004-0006 to the live project (sjegvuudtzmkxmxkjggu)
// and records them in supabase_migrations.schema_migrations.
const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const MIGRATIONS_DIR = 'D:/c/coaching/second/supabase/migrations';

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });

async function main() {
  const files = ['0004_soft_delete.sql', '0005_rls_policies.sql', '0006_test_answers_integrity.sql'];

  for (const file of files) {
    const version = file.slice(0, 4);
    const name = file.slice(5, -4);
    const body = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Supabase CLI splits migrations on '--> statement-breakpoint'
    const statements = body.split(/-->\s*statement-breakpoint\s*/).filter((s) => s.trim().length > 0);

    console.log(`Applying ${file} (${statements.length} statements)...`);

    for (const stmt of statements) {
      const clean = stmt.trim();
      try {
        await sql.unsafe(clean);
        console.log(`  OK: ${clean.split('\n')[0].slice(0, 80)}`);
      } catch (e) {
        console.error(`  FAIL: ${e.message}`);
        throw e;
      }
    }

    // Record in schema_migrations (version format 'YYYYMMDDHHMMSS' upstream; local convention = 4-digit)
    const existing = await sql`SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ${version}`;
    if (existing.length === 0) {
      await sql`INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES (${version}, ${name})`;
      console.log(`  Recorded ${version} (${name})`);
    } else {
      console.log(`  ${version} already recorded`);
    }
  }

  // Verify final state
  const applied = await sql`SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`;
  console.log('schema_migrations:', JSON.stringify(applied));

  const ta = await sql`SELECT to_regclass('public.test_answers') AS t`;
  console.log('test_answers:', JSON.stringify(ta[0]));

  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('deleted_at','deleted_by')`;
  console.log('users soft-delete cols:', JSON.stringify(cols.map((c) => c.column_name)));

  const fns = await sql`SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('current_app_user_id','current_app_user_role')`;
  console.log('RLS helper fns:', JSON.stringify(fns.map((f) => f.proname)));

  const idx = await sql`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('batch_students_batch_student_unique','batch_teachers_batch_teacher_unique')`;
  console.log('unique batch idx:', JSON.stringify(idx.map((i) => i.indexname)));

  const policies = await sql`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname='public'`;
  console.log('public policies:', policies[0].c);
}

main()
  .catch((e) => {
    console.error('FATAL:', e.message);
    process.exit(1);
  })
  .finally(() => sql.end());