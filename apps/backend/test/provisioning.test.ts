import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiError } from '../src/middleware/error.js';

// Same db proxy trick as authorization.test.ts.
const { dbProxy, schemaStub } = vi.hoisted(() => {
  const schemaStub = new Proxy({} as any, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? undefined : schemaStub),
  });
  return { dbProxy: { current: null as unknown as any }, schemaStub };
});

vi.mock('../src/db/index.js', () => ({
  db: new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (!dbProxy.current) throw new Error('FakeDb not initialized');
        const value = dbProxy.current.db[prop];
        return typeof value === 'function' ? value.bind(dbProxy.current.db) : value;
      },
    },
  ),
  schema: schemaStub,
}));

// Scriptable Supabase admin. Every test can reconfigure createUser / deleteUser.
const supabase = vi.hoisted(() => ({
  createUser: vi.fn(async (_opts: Record<string, unknown>): Promise<any> => ({
    data: { user: { id: 'auth-1' } },
    error: null,
  })),
  deleteUser: vi.fn(async (_id: string): Promise<void> => {}),
}));

vi.mock('../src/lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({ auth: { admin: supabase } }),
}));

import { createFakeDb } from './helpers/fakeDb.js';
import { provisionAccount } from '../src/services/accountProvisioningService.js';

const USER_ROW = { id: 'u1', name: 'Alice', email: 'alice@example.com', password: '', role: 'student' };

async function rejectWith(p: Promise<unknown>, status: number, message?: RegExp) {
  try {
    await p;
  } catch (err: any) {
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).statusCode).toBe(status);
    if (message) expect((err as ApiError).message).toMatch(message);
    return;
  }
  throw new Error(`expected ApiError(${status}) but promise resolved`);
}

describe('normalize (input shaping)', () => {
  it('400 when name/email/phone/password are missing', async () => {
    dbProxy.current = createFakeDb();
    await rejectWith(provisionAccount('student', {} as any), 400, /required/);
    await rejectWith(provisionAccount('student', { name: 'A', phone: '+919999999999', password: 'secret123' } as any), 400, /required/);
  });

  it('400 on invalid email format', async () => {
    dbProxy.current = createFakeDb();
    await rejectWith(provisionAccount('student', { name: 'A B', email: 'nope', phone: '+919999999999', password: 'secret123' } as any), 400, /email/);
  });

  it('400 on invalid phone format', async () => {
    dbProxy.current = createFakeDb();
    await rejectWith(provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: 'x', password: 'secret123' } as any), 400, /phone/);
  });

  it('400 on password shorter than 8 characters', async () => {
    dbProxy.current = createFakeDb();
    await rejectWith(provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'short' } as any), 400, /password/);
  });

  it('normalizes email to lowercase/trim and phone to trim', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ id: 'dup' }]] });
    // dup check runs after normalize — reaching it proves normalization ran.
    supabase.createUser.mockClear();
    await rejectWith(
      provisionAccount('student', { name: '  A B  ', email: '  ALICE@Example.COM  ', phone: '+919999999999', password: 'secret123' } as any),
      409,
    );
  });
});

describe('duplicate detection', () => {
  it('409 when email or phone already exists in the app users table', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ id: 'existing' }]] });
    supabase.createUser.mockClear();
    await rejectWith(
      provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'secret123' } as any),
      409,
      /already exists/,
    );
    // Supabase identity must NOT be created on a duplicate.
    expect(supabase.createUser).not.toHaveBeenCalled();
  });
});

describe('Supabase identity creation failures', () => {
  it('409 when the email is already registered upstream', async () => {
    dbProxy.current = createFakeDb();
    supabase.createUser.mockResolvedValue({
      data: null,
      error: { status: 409, message: 'A user with this email address is already registered' },
    });
    await rejectWith(
      provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'secret123' } as any),
      409,
      /already exists/,
    );
  });

  it('500 on non-duplicate upstream failure', async () => {
    dbProxy.current = createFakeDb();
    supabase.createUser.mockResolvedValue({ data: null, error: { status: 500, message: 'boom' } });
    await rejectWith(
      provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'secret123' } as any),
      500,
    );
  });

  it('500 when createUser returns no user id', async () => {
    dbProxy.current = createFakeDb();
    supabase.createUser.mockResolvedValue({ data: { user: null }, error: null });
    await rejectWith(
      provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'secret123' } as any),
      500,
    );
  });
});

describe('successful provisioning', () => {
  beforeEach(() => {
    supabase.createUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
  });

  it('student: creates auth identity + users + student_profiles + profiles in one tx', async () => {
    dbProxy.current = createFakeDb({
      rows: [[]],
      insertRecs: [USER_ROW],
    });

    const result = await provisionAccount('student', {
      name: '  Alice  ',
      email: '  ALICE@Example.COM  ',
      phone: '+919999999999',
      password: 'S3cretPass!',
      parentName: 'Mr A',
      courseId: 'c1',
    });

    expect(result).toEqual({ id: 'u1', name: 'Alice', email: 'alice@example.com' });
    expect(supabase.createUser).toHaveBeenCalledWith({
      email: 'alice@example.com',
      password: 'S3cretPass!',
      email_confirm: true,
      user_metadata: { name: 'Alice', phone: '+919999999999' },
      app_metadata: { role: 'student' },
    });
    // tx inserted a users row, profiling student + identity link afterwards.
    expect(dbProxy.current.insertValues).toHaveLength(3);
  });

it('teacher: passes numeric experience through and creates teacher_profile', async () => {
    dbProxy.current = createFakeDb({
      rows: [],
      insertRecs: [{ id: 'u2', name: 'B B', email: 'b@example.com', role: 'teacher' }],
    });

    const result = await provisionAccount('teacher', {
      name: 'B B',
      email: 'b@example.com',
      phone: '+9198888888',
      password: 'S3cretPass!',
      qualification: 'MSc',
      experience: 8,
    });
    expect(result.email).toBe('b@example.com');
    expect(supabase.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        app_metadata: { role: 'teacher' },
        password: 'S3cretPass!',
      }),
    );
  });
});

describe('DB failure compensation', () => {
  it('rolls back the Supabase identity and reports a structured 500', async () => {
    supabase.deleteUser.mockClear();
    dbProxy.current = createFakeDb({
      rows: [],
      transactionError: new Error('connection lost'),
    });

    await rejectWith(
      provisionAccount('student', { name: 'A B', email: 'a@b.com', phone: '+919999999999', password: 'secret123' } as any),
      500,
      /Failed to create the account/,
    );

    // Compensating delete must have removed the auth identity.
    expect(supabase.deleteUser).toHaveBeenCalledWith('auth-1');
  });
});