import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import('dotenv').then(dotenv => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
});

setTimeout(async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 30 });

  const courses = await sql`SELECT * FROM public_courses`;
  console.log('public_courses:', JSON.stringify(courses, null, 2));

  const faculty = await sql`SELECT * FROM public_faculty`;
  console.log('public_faculty:', JSON.stringify(faculty, null, 2));

  const courses2 = await sql`SELECT * FROM courses WHERE status='active'`;
  console.log('courses:', JSON.stringify(courses2, null, 2));

  await sql.end();
}, 100);