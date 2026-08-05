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
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 30 });

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  console.log('PUBLIC TABLES (' + tables.length + '):');
  console.log(tables.map((t) => t.tablename).join(', '));

  // Check achievements table
  try {
    const achievements = await sql`SELECT * FROM achievements LIMIT 1`;
    console.log('\nachievements columns:', Object.keys(achievements[0] || {}));
  } catch (e) {
    console.log('\nachievements error:', e.message);
  }

  // Check public_courses table
  try {
    const pc = await sql`SELECT * FROM public_courses LIMIT 1`;
    console.log('public_courses columns:', Object.keys(pc[0] || {}));
  } catch (e) {
    console.log('public_courses error:', e.message);
  }

  // Check public_faculty table
  try {
    const pf = await sql`SELECT * FROM public_faculty LIMIT 1`;
    console.log('public_faculty columns:', Object.keys(pf[0] || {}));
  } catch (e) {
    console.log('public_faculty error:', e.message);
  }

  await sql.end();
}, 100);