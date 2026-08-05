const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 25, ssl: 'require' });
sql`SELECT now() AS now, current_database() AS db`
  .then((r) => {
    console.log('DB OK:', JSON.stringify(r[0]));
    return sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
      .then((t) => console.log('PUBLIC TABLES (' + t.length + '): ' + t.map((x) => x.tablename).join(', ')));
  })
  .catch((e) => {
    console.error('DB FAIL:', e.name, e.code, JSON.stringify(e.message));
  })
  .finally(() => sql.end());