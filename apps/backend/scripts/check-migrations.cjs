const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });

(async () => {
  const journals = await sql`SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE '%migration%' ORDER BY 1,2`;
  console.log('MIGRATION TABLES:', JSON.stringify(journals));

  const supabaseMig = await sql`SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`.catch((e) => {
    console.log('supabase_migrations absent:', e.message);
    return [];
  });
  console.log('SUPABASE MIGRATIONS (' + supabaseMig.length + '):', JSON.stringify(supabaseMig));

  const ta = await sql`SELECT to_regclass('public.test_answers') AS exists`;
  console.log('test_answers exists:', JSON.stringify(ta[0]));

  const bshapes = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('batch_students','batch_teachers','test_answers') ORDER BY 1`;
  console.log('shape tables:', JSON.stringify(bshapes.map((r) => r.table_name)));
})().catch((e) => console.error('FAIL:', e.name, e.code, JSON.stringify(e.message)))
  .finally(() => sql.end());