const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });

(async () => {
  await sql`DROP TABLE IF EXISTS "Faizul Rahman"`;
  console.log('junk table dropped');
  const t = await sql`SELECT to_regclass('public."Faizul Rahman"') AS t`;
  console.log('exists after drop:', JSON.stringify(t[0]));
})().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
}).finally(() => sql.end());