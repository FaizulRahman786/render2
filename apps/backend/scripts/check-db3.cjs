const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const postgres = require('postgres');

const url = process.env.DATABASE_URL;
console.log('DATABASE_URL loaded:', url ? 'yes' : 'NO');

const sql = postgres(url, { max: 1, connect_timeout: 25 });
sql`SELECT now() AS now, current_database() AS db, version() AS v`
  .then((r) => {
    console.log('DB OK:', JSON.stringify(r[0]));
    return sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`.then((t) => {
      console.log('PUBLIC TABLES (' + t.length + '): ' + t.map((x) => x.tablename).join(', '));
    });
  })
  .catch((e) => {
    console.error('DB FAIL:');
    console.error('name:', e.name, 'code:', e.code);
    console.error('message:', JSON.stringify(e.message));
    process.exit(1);
  })
  .finally(() => sql.end());
