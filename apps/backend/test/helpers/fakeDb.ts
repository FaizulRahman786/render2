// ============================================
// Scripted Drizzle fake for DB-free unit tests
// ============================================
// The authorization/provisioning services call a small, fixed set of Drizzle
// shapes:
//   db.select({...}).from(t).where(cond).limit(n)   → row[]
//   db.select({...}).from(t).where(cond)            → row[]
//   db.insert(t).values(v).returning()              → [row]
//   db.transaction(fn)                              → fn(tx)
// This fake scripts those calls from a plain queue, so each test controls
// exactly what the "database" returns without touching a real Postgres.

export interface FakeDbScript {
  /** Sequential results for select()...where() calls (default: []). */
  rows?: unknown[][];
  /** Sequential records for insert()...values(...).returning() calls. */
  insertRecs?: unknown[];
  /** When set, transaction() rejects with this error (simulates DB failure). */
  transactionError?: Error;
}

export function createFakeDb(script: FakeDbScript = {}) {
  const rows = [...(script.rows ?? [])];
  const insertRecs = [...(script.insertRecs ?? [])];
  const selectCalls: unknown[] = [];
  const insertValues: unknown[] = [];

  const takeRows = (): unknown[] => {
    const next = rows.length ? rows.shift()! : [];
    return Array.isArray(next) ? next : [];
  };

  const select = () => ({
    from: () => ({
      where: (cond: unknown) => {
        selectCalls.push(cond);
        const result = takeRows();
        // Plain arrays are awaitable as-is; .limit(n) returns the same rows.
        return Object.assign(result.slice(), {
          limit: () => result.slice(),
        });
      },
    }),
  });

  const insert = () => ({
    values: (v: unknown) => {
      insertValues.push(v);
      return {
        returning: async () => {
          const rec = insertRecs.length
            ? insertRecs.shift()
            : { id: 'generated-id', name: 'Generated', email: 'generated@example.com' };
          return [rec];
        },
      };
    },
  });

  const db: any = {
    select,
    insert,
    transaction: (fn: (tx: unknown) => Promise<unknown>) => {
      if (script.transactionError) return Promise.reject(script.transactionError);
      return fn(db);
    },
  };

  return { db, selectCalls, insertValues };
}

export type FakeDb = ReturnType<typeof createFakeDb>['db'];