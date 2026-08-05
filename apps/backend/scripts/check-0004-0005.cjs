const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });

(async () => {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name IN ('deleted_at','deleted_by')`;
  console.log('users soft-delete cols:', JSON.stringify(cols.map((c) => c.column_name)));

  const fns = await sql`SELECT proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('current_app_user_id','current_app_user_role')`;
  console.log('RLS helper fns:', JSON.stringify(fns.map((f) => f.proname)));

  const idx = await sql`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('batch_students_batch_student_unique','batch_teachers_batch_teacher_unique')`;
  console.log('unique batch idx:', JSON.stringify(idx.map((i) => i.indexname)));

  const rls = await sql`SELECT policyname FROM pg_policies WHERE schemaname='public' ORDER BY policyname`;
  console.log('POLICIES (' + rls.length + '):', JSON.stringify(rls.map((p) => p.policyname)));

  const rlsTables = await sql`SELECT relname FROM pg_class c JOIN pg_policy p ON p.polrelid=c.oid WHERE c.relnamespace='public'::regnamespace GROUP BY relname ORDER BY relname`;
  console.log('RLS tables:', JSON.stringify(rlsTables.map((r) => r.relname)));
})().catch((e) => console.error('FAIL:', e.name, e.code, JSON.stringify(e.message)))
  .finally(() => sql.end());