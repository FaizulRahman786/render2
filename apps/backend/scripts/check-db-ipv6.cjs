const dotenv = require('dotenv');
dotenv.config({ path: 'D:/c/coaching/second/.env' });
const postgres = require('postgres');

const opts = {
  host: '2406:da1a:314:7101:90bb:4e2a:ab3f:6080',
  port: 5432,
  user: 'postgres',
  password: 'T84eqpEuBh8MywzF',
  database: 'postgres',
  max: 1,
  connect_timeout: 25,
  ssl: true,
};

console.log('connecting with options:', JSON.stringify({ ...opts, password: '***' }));

const sql = postgres(opts);
sql`SELECT now() AS now, current_database() AS db, version() AS v`
  .then((r) => {
    console.log('DB OK:', JSON.stringify(r[0]));
  })
  .catch((e) => {
    console.error('DB FAIL:', e.name, e.code, JSON.stringify(e.message));
  })
  .finally(() => sql.end());