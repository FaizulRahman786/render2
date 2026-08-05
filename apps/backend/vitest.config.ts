import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 15000,
    // Integration tests that need a real database + Supabase sandbox are
    // skipped automatically when TEST_DATABASE_URL is not set (see
    // test/integration.routes.test.ts). CI runs them behind --run-in-band
    // when the service is provisioned.
  },
});