import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 20 });

try {
  const res = await sql`SELECT now() AS now, current_database() AS db`;
  console.log('DB OK:', JSON.stringify(res[0]));

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log('PUBLIC TABLES (' + tables.length + '):');
  console.log(tables.map((t) => t.tablename).join(', '));
} catch (e) {
  console.error('DB FAIL:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}