import 'dotenv/config';

const postgres = (await import('postgres')).default;

// Test 1: Transaction Pooler (DATABASE_URL)
const poolerUrl = process.env.DATABASE_URL!;
console.log('--- Test 1: Transaction Pooler ---');
console.log('URL:', poolerUrl.replace(/:([^:@]+)@/, ':***@'));
const sqlPooler = postgres(poolerUrl, { ssl: 'require', connect_timeout: 10 });
try {
  const result = await sqlPooler`SELECT current_user`;
  console.log('✅ Pooler SUCCESS:', result[0]);
} catch (e: any) {
  console.error('❌ Pooler FAILED:', e.message);
} finally {
  await sqlPooler.end();
}

// Test 2: Direct Connection (DIRECT_URL)
const directUrl = process.env.DIRECT_URL!;
console.log('\n--- Test 2: Direct Connection ---');
console.log('URL:', directUrl.replace(/:([^:@]+)@/, ':***@'));
const sqlDirect = postgres(directUrl, { ssl: 'require', connect_timeout: 10 });
try {
  const result = await sqlDirect`SELECT current_user`;
  console.log('✅ Direct SUCCESS:', result[0]);
} catch (e: any) {
  console.error('❌ Direct FAILED:', e.message);
} finally {
  await sqlDirect.end();
  process.exit(0);
}
