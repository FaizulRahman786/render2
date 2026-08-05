import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiError } from '../src/middleware/error.js';

// The authz service imports { db, schema } from '../db/index.js'. We proxy `db`
// to a per-test scripted fake (set in beforeEach) and stub schema (the fake
// ignores table arguments), so no DATABASE_URL or Postgres is ever needed.
// dbProxy.current is swapped per test; schemaStub resolves any table.column
// chain to a chainable placeholder (the scripted fake ignores those args).
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

import { createFakeDb } from './helpers/fakeDb.js';
import * as authz from '../src/services/authorization.js';

function expectStatus(promise: Promise<unknown>, status: number) {
  return promise.then(
    () => {
      throw new Error(`expected ApiError(${status}) but promise resolved`);
    },
    (err: any) => {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(status);
      expect(err.isOperational).toBe(true);
    },
  );
}

describe('getStudentBatchIds / getTeacherBatchIds / getStudentCourseId', () => {
  it('maps membership rows to batch ids', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }, { batchId: 'b2' }]] });
    await expect(authz.getStudentBatchIds('stu-1')).resolves.toEqual(['b1', 'b2']);
  });

  it('returns an empty array when there is no membership (fail closed)', async () => {
    dbProxy.current = createFakeDb();
    await expect(authz.getStudentBatchIds('stu-1')).resolves.toEqual([]);
    await expect(authz.getTeacherBatchIds('t-1')).resolves.toEqual([]);
  });

  it('returns the student course id when assigned, else null', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ courseId: 'c1' }]] });
    await expect(authz.getStudentCourseId('s-1')).resolves.toBe('c1');
    dbProxy.current = createFakeDb();
    await expect(authz.getStudentCourseId('s-1')).resolves.toBeNull();
  });
});

describe('assertStudentOfBatch', () => {
  it('403 when the student is not in the batch', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b-other' }]] });
    await expectStatus(authz.assertStudentOfBatch('stu-1', 'b-never'), 403);
  });

  it('passes when the student IS in the batch', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }]] });
    await expect(authz.assertStudentOfBatch('stu-1', 'b1')).resolves.toBeUndefined();
  });
});

describe('assertTeacherOfBatch', () => {
  it('403 when the teacher is not assigned (unknown batch too)', async () => {
    dbProxy.current = createFakeDb(); // no membership found
    await expectStatus(authz.assertTeacherOfBatch('t-1', 'b1'), 403);
  });

  it('passes with a matching membership', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ id: 'm1' }]] });
    await expect(authz.assertTeacherOfBatch('t-1', 'b1')).resolves.toBeUndefined();
  });
});

describe('assertTeacherCanAccessStudent (shared batch)', () => {
  it('denies when the teacher has no batches at all (fail closed)', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] }); // getTeacherBatchIds → []
    await expectStatus(authz.assertTeacherCanAccessStudent('t-1', 's-9'), 403);
  });

  it('denies when the student shares no batch with the teacher', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }], []] });
    await expectStatus(authz.assertTeacherCanAccessStudent('t-1', 's-9'), 403);
  });

  it('passes when they share a batch', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }], [{ id: 'bs1' }]] });
    await expect(authz.assertTeacherCanAccessStudent('t-1', 's-1')).resolves.toBeUndefined();
  });
});

describe('assertTeacherCanAccessDoubt', () => {
  it('404 when the doubt does not exist', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertTeacherCanAccessDoubt('t-1', 'd-unknown'), 404);
  });

  it('404 when the doubt student shares no batch with the teacher (no enumeration)', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ studentId: 's-other' }], [{ batchId: 'b1' }], []],
    });
    await expectStatus(authz.assertTeacherCanAccessDoubt('t-1', 'd-1'), 404);
  });

  it('passes when they share a batch', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ studentId: 's-1' }], [{ batchId: 'b1' }], [{ id: 'm1' }]],
    });
    await expect(authz.assertTeacherCanAccessDoubt('t-1', 'd-1')).resolves.toBeUndefined();
  });
});

describe('assertTeacherOwnsTest', () => {
  it('404 when the test does not exist', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertTeacherOwnsTest('t-1', 'test-unknown'), 404);
  });

  it('404 when another teacher owns the test', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ teacherId: 't-2' }]] });
    await expectStatus(authz.assertTeacherOwnsTest('t-1', 'test-1'), 404);
  });

  it('passes when the teacher owns the test', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ teacherId: 't-1' }]] });
    await expect(authz.assertTeacherOwnsTest('t-1', 'test-1')).resolves.toBeUndefined();
  });

  it('admins bypass ownership when explicitly flagged with an admin role', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ teacherId: 't-2' }]] });
    await expect(
      authz.assertTeacherOwnsTest('a-1', 'test-1', true, 'admin'),
    ).resolves.toBeUndefined();
  });

  it('does NOT exploit the bypass flag with a non-admin role', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ teacherId: 't-2' }]] });
    await expectStatus(authz.assertTeacherOwnsTest('a-1', 'test-1', true, 'student'), 404);
  });
});

describe('assertStudentCanAccessTest', () => {
  it('404 when the test does not exist', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertStudentCanAccessTest('s-1', 'test-x'), 404);
  });

  it('404 when the test has no batch or the student is not enrolled', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b2' }], [{ batchId: 'b1' }]] });
    await expectStatus(authz.assertStudentCanAccessTest('s-1', 'test-1'), 404);
  });

  it('passes when the student is enrolled in the test batch', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }], [{ batchId: 'b1' }]] });
    await expect(authz.assertStudentCanAccessTest('s-1', 'test-1')).resolves.toBeUndefined();
  });
});

describe('assertStudentCanAccessMaterial', () => {
  it('404 when the material does not exist', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertStudentCanAccessMaterial('s-1', 'm-unknown'), 404);
  });

  it('404 when the material is hidden', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ id: 'm1', visibility: false, batchId: null, courseId: null }]],
    });
    await expectStatus(authz.assertStudentCanAccessMaterial('s-1', 'm1'), 404);
  });

  it('passes for institute-wide materials (no batch, no course)', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ id: 'm1', visibility: true, batchId: null, courseId: null }]],
    });
    await expect(authz.assertStudentCanAccessMaterial('s-1', 'm1')).resolves.toBeUndefined();
  });

  it('passes when the material targets one of the student batches', async () => {
    dbProxy.current = createFakeDb({
      rows: [
        [{ id: 'm1', visibility: true, batchId: 'b1', courseId: null }],
        [{ batchId: 'b1' }],
        [{ courseId: 'c-other' }],
      ],
    });
    await expect(authz.assertStudentCanAccessMaterial('s-1', 'm1')).resolves.toBeUndefined();
  });

  it('passes when the material targets the student course', async () => {
    dbProxy.current = createFakeDb({
      rows: [
        [{ id: 'm1', visibility: true, batchId: null, courseId: 'c1' }],
        [{ batchId: 'b-other' }],
        [{ courseId: 'c1' }],
      ],
    });
    await expect(authz.assertStudentCanAccessMaterial('s-1', 'm1')).resolves.toBeUndefined();
  });

  it('404 when the material targets neither the student batch nor course', async () => {
    dbProxy.current = createFakeDb({
      rows: [
        [{ id: 'm1', visibility: true, batchId: 'b9', courseId: 'c9' }],
        [{ batchId: 'b1' }],
        [{ courseId: 'c1' }],
      ],
    });
    await expectStatus(authz.assertStudentCanAccessMaterial('s-1', 'm1'), 404);
  });
});

describe('assertStudentCanAccessLiveClass', () => {
  it('404 when the class does not exist', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertStudentCanAccessLiveClass('s-1', 'lc-unknown'), 404);
  });

  it('404 when the class batch is not one of the student batches', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b2' }], [{ batchId: 'b1' }]] });
    await expectStatus(authz.assertStudentCanAccessLiveClass('s-1', 'lc-1'), 404);
  });

  it('passes when the class batch matches', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ batchId: 'b1' }], [{ batchId: 'b1' }]] });
    await expect(authz.assertStudentCanAccessLiveClass('s-1', 'lc-1')).resolves.toBeUndefined();
  });
});

describe('assertRecipientsScopedToTeacher', () => {
  it('passes with an empty recipient list (no-op)', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expect(authz.assertRecipientsScopedToTeacher('t-1', [])).resolves.toBeUndefined();
  });

  it('403 when the teacher has no batches', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expectStatus(authz.assertRecipientsScopedToTeacher('t-1', ['s-1']), 403);
  });

  it('403 when any recipient is outside the teacher batches', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ batchId: 'b1' }], [{ studentId: 's-1' }]],
    });
    await expectStatus(authz.assertRecipientsScopedToTeacher('t-1', ['s-1', 's-2']), 403);
  });

  it('passes when every recipient is in the teacher batches', async () => {
    dbProxy.current = createFakeDb({
      rows: [[{ batchId: 'b1' }], [{ studentId: 's-1' }, { studentId: 's-2' }]],
    });
    await expect(
      authz.assertRecipientsScopedToTeacher('t-1', ['s-1', 's-2']),
    ).resolves.toBeUndefined();
  });
});

describe('teacherInBatch / teacherAndStudentShareBatch primitives', () => {
  it('teacherInBatch is true only with an existing membership', async () => {
    dbProxy.current = createFakeDb({ rows: [[{ id: 'm1' }]] });
    await expect(authz.teacherInBatch('t-1', 'b1')).resolves.toBe(true);
    dbProxy.current = createFakeDb();
    await expect(authz.teacherInBatch('t-1', 'b1')).resolves.toBe(false);
  });

  it('teacherAndStudentShareBatch fails closed for a batch-less teacher', async () => {
    dbProxy.current = createFakeDb({ rows: [[]] });
    await expect(authz.teacherAndStudentShareBatch('t-1', 's-1')).resolves.toBe(false);
  });
});