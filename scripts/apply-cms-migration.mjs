import { readFileSync } from 'node:fs';
import 'dotenv/config';
import postgres from 'postgres';

const pg = postgres(process.env.DIRECT_URL, { max: 1 });
try {
  const sql = readFileSync('supabase/migrations/0007_public_site_cms.sql', 'utf8');
  const stmts = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
  for (const st of stmts) {
    await pg.unsafe(st);
  }
  const r = await pg.unsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('notices','events','enquiries','media_assets') ORDER BY tablename"
  );
  console.log('TABLES NOW:', r.map((x) => x.tablename).join(','));
} catch (err) {
  console.error('MIGRATION FAILED:', err);
  process.exitCode = 1;
} finally {
  await pg.end();
}