// Test script to start server, run tests, and shutdown
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/test`);
      if (res.ok || res.status === 500) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not start in time');
}

async function runTests() {
  console.log('Starting server...');
  // Use the DIRECT_URL pattern with pooler port for runtime
  const testEnv = {
    ...process.env,
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:T84eqpEuBh8MywzF@db.sjegvuudtzmkxmxkjggu.supabase.co:5432/postgres?sslmode=require',
    ENABLE_AUTH_MOCK: 'true',
  };
  const server = spawn('cmd.exe', ['/c', 'npx', 'tsx', 'watch', 'apps/backend/src/server.ts'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: testEnv,
  });

  // Wait for server to be ready
  try {
    await waitForServer(3001);
    console.log('Server is ready!');
  } catch (err) {
    console.error('Server failed to start:', err);
    server.kill();
    process.exit(1);
  }

  // Run E2E tests
  console.log('Running E2E tests...');
  const testProcess = spawn('node', ['apps/backend/test/e2e/http-e2e.mjs'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
  });

  await new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Tests failed with code ${code}`));
    });
    testProcess.on('error', reject);
  });

  console.log('Tests passed!');
  server.kill();
}

runTests().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});