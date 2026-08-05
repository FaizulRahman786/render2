import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

const rows = await sql`SELECT slug, title, created_by FROM blog_posts WHERE title LIKE 'E2E%' ORDER BY created_at DESC LIMIT 10`;
console.log('existing E2E rows:', rows.map((r: any) => `${r.slug} / ${r.title} / ${r.created_by}`).join('\n'));

const triggers = await sql`SELECT tgname, tgrelid::regclass AS tbl, pg_get_triggerdef(oid) AS def FROM pg_trigger WHERE NOT tgisinternal AND tgrelid = 'blog_posts'::regclass`;
console.log('triggers:', triggers.map((t: any) => `${t.tgname}: ${t.def}`).join('\n'));

const constraints = await sql`SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid = 'blog_posts'::regclass`;
console.log('constraints:', constraints.map((c: any) => `${c.conname}: ${c.def}`).join('\n'));

await sql.end();