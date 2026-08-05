const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });

(async () => {
  const admin = await sql`SELECT id, name, email, role, status, created_at FROM users WHERE email = ${'rahmanadnan412@gmail.com'}`;
  console.log('ADMIN users row:', JSON.stringify(admin));

  const prof = await sql`SELECT * FROM profiles WHERE supabase_auth_id = ${'cc5aa11c-9818-4244-a258-960a3d38322a'}`;
  console.log('ADMIN profile rows:', JSON.stringify(prof));

  const junk = await sql`SELECT * FROM "Faizul Rahman" LIMIT 5`;
  console.log('JUNK TABLE rows:', JSON.stringify(junk));
  const junkCount = await sql`SELECT count(*)::int AS c FROM "Faizul Rahman"`;
  console.log('JUNK TABLE count:', JSON.stringify(junkCount[0]));

  const users = await sql`SELECT id, email, role, status FROM users ORDER BY created_at LIMIT 20`;
  console.log('ALL USERS:');
  users.forEach((u) => console.log(' ', u.id, '|', u.email, '|', u.role, '|', u.status));
})().catch((e) => console.error('FAIL:', e.name, e.code, JSON.stringify(e.message)))
  .finally(() => sql.end());