import postgres from 'postgres';
import { randomUUID } from 'crypto';

const databaseUrl = process.env.DATABASE_URL;
const sql = postgres(databaseUrl, { max: 2 });

async function check() {
  const assignments = await sql`SELECT id, batch_id FROM public.assignments WHERE batch_id = '00000000-0000-4000-8000-000000000020'`;
  console.log('Assignments:', assignments);
  
  const tests = await sql`SELECT id FROM public.tests WHERE id = '4f1bd10f-9c2c-4a53-9fde-6223121de29e'`;
  console.log('Tests:', tests);
  
  const doubts = await sql`SELECT id FROM public.doubts WHERE id = '5ef12b53-9e0a-4559-be82-425e30546a02'`;
  console.log('Doubts:', doubts);
  
  await sql.end();
}

check().catch(console.error);