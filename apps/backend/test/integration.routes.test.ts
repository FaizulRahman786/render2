// ============================================
// OPTIONAL HTTP INTEGRATION SUITE (real DB)
// ============================================
// Runs the FULL Express app (real routes, middleware, DB pool) against a real
// database. SKIPPED unless TEST_DATABASE_URL is set — the owner provisions a
// disposable database (e.g. `supabase db reset` sandbox) and exports:
//
//   set TEST_DATABASE_URL=postgres://...  ; pnpm --filter coaching-backend test
//
// The suite is deliberately data-independent: it asserts routing, validation
// wiring, auth gating, and error handling, never specific rows. Server binds
// to port 0 (ephemeral) so it can never collide with a dev instance.

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

const testDbUrl = process.env.TEST_DATABASE_URL;
const describeGated = describe.skipIf(!testDbUrl);

describeGated('HTTP integration against a real database', () => {
  it('boots the real app and exercises the request pipeline', async () => {
    vi.resetModules();
    process.env.PORT = '0';
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = testDbUrl;

    const { default: app } = await import('../src/server.js');

    // Health route.
    const health = await request(app).get('/');
    expect(health.status).toBe(200);
    expect(health.body.message).toContain('Coaching Platform');

    // Unknown route → clean 404 via notFoundHandler.
    const missing = await request(app).get('/api/definitely-not-a-route');
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);

    // Unauthenticated access to a protected route is rejected.
    const protectedRes = await request(app).get('/api/student/dashboard');
    expect([401, 403]).toContain(protectedRes.status);

    // Validation middleware runs before auth (role smuggling is rejected
    // before any identity checks).
    const smuggled = await request(app).post('/api/admin/students').send({
      name: 'Eve',
      email: 'eve@example.com',
      phone: '+919777777777',
      role: 'admin',
    });
    expect(smuggled.status).toBe(400);
    expect(JSON.stringify(smuggled.body.details)).toContain('role cannot be set');

    // Private uploads are never served statically.
    const privateFile = await request(app).get('/api/uploads/private/anything/file.pdf');
    expect(privateFile.status).toBe(403);
  }, 30000);
});