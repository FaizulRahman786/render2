import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
import('dotenv').then(dotenv => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
});

setTimeout(async () => {
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 30 });

  try {
    const res = await sql`SELECT now() AS now, current_database() AS db`;
    console.log('DB OK:', JSON.stringify(res[0]));

    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    console.log('PUBLIC TABLES (' + tables.length + '):');
    console.log(tables.map((t) => t.tablename).join(', '));
  } catch (e) {
    console.error('DB FAIL:', e.message);
    console.error(e);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}, 100);