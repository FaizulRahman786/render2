require('dotenv').config();
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 20 });
sql`SELECT 1`
  .then(() => {
    console.log('DB OK');
    return sql.end();
  })
  .catch((e) => {
    console.error('DB FAIL:');
    console.error('name:', e.name);
    console.error('code:', e.code);
    console.error('message:', JSON.stringify(e.message));
    console.error('hint:', e.hint);
    process.exit(1);
  });
