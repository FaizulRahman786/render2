import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.DATABASE_URL;
if (!url) { console.error('NO DATABASE_URL'); process.exit(2); }

const sql = postgres(url, { max: 1, connect_timeout: 10, prepare: false });
try {
  const t = await sql`select current_database() as db, current_user as usr, version() as ver`;
  console.log('DB:', t[0].db, '| user:', t[0].usr, '| pg:', t[0].ver.split(' ')[1]);

  const cols = await sql`
    select column_name from information_schema.columns
    where table_schema='public' and table_name='users' and column_name in ('deleted_at','deleted_by')
  `;
  console.log('users soft-delete cols:', cols.map(c => c.column_name).join(',') || 'NONE');

  const ta = await sql`
    select to_regclass('public.test_answers') as t
  `;
  console.log('test_answers table:', ta[0].t ?? 'MISSING');

  const pol = await sql`
    select count(*)::int as n from pg_policies where schemaname='public'
  `;
  console.log('RLS policies in public:', pol[0].n);

  const rls = await sql`
    select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relrowsecurity
  `;
  console.log('tables with RLS enabled:', rls.length);

  const users = await sql`select count(*)::int as n, role from users group by role order by role`;
  console.log('user counts by role:', JSON.stringify(users));

  const settings = await sql`select count(*)::int as n from settings`;
  console.log('settings rows:', settings[0].n);
} catch (e) {
  console.error('CONNECT ERROR:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
