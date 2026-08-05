// ============================================
// ACCOUNT PROVISIONING SERVICE
// ============================================
// Creates a real, login-capable account for admin-created students/teachers:
//
//   1. Validate + normalize input (email lowercase/trim, phone trim).
//   2. Duplicate checks (app DB by email/phone → 409).
//   3. Create the Supabase Auth identity (email+password, email_confirm=true,
//      role in app_metadata — the user can log in immediately via
//      EMAIL + PASSWORD on the login page).
//   4. Insert users + role profile + profiles (identity link) in ONE DB
//      transaction.
//   5. On DB failure → compensating delete of the Supabase identity (no
//      orphan auth users). Structured 500 to the caller.
//
// Roles are HARD-CODED by the caller (admin routes never accept a role from
// the request body), so creation cannot escalate privileges.

import { eq, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { ApiError } from '../middleware/error.js';
import { getSupabaseAdmin } from '../lib/supabaseAdmin.js';

export interface ProvisionStudentInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  courseId?: string;
}

export interface ProvisionTeacherInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  qualification?: string;
  experience?: number;
  specialization?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

function normalize(input: { name?: unknown; email?: unknown; phone?: unknown; password?: unknown }) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!name || !email || !phone || !password) {
    throw new ApiError(400, 'name, email, phone, and password are required');
  }
  if (name.length < 2 || name.length > 100) {
    throw new ApiError(400, 'name must be between 2 and 100 characters');
  }
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }
  if (!PHONE_RE.test(phone)) {
    throw new ApiError(400, 'Invalid phone number format');
  }
  if (password.length < 8 || password.length > 72) {
    throw new ApiError(400, 'password must be between 8 and 72 characters');
  }
  return { name, email, phone, password };
}

/** 409 unless neither email nor phone exists in the application users table. */
async function assertNoDuplicateUser(email: string, phone: string): Promise<void> {
  const [dup] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.phone, phone)))
    .limit(1);
  if (dup) {
    throw new ApiError(409, 'A user with this email or phone already exists');
  }
}

/** Create the Supabase Auth identity; 409 when the email is already registered. */
async function createSupabaseIdentity(email: string, password: string, name: string, phone: string, role: 'student' | 'teacher'): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
    app_metadata: { role },
  });

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    const isDuplicate =
      error.status === 409 ||
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('duplicate');
    if (isDuplicate) {
      throw new ApiError(409, 'A Supabase account already exists for this email');
    }
    console.error('[Provisioning] Supabase createUser failed:', error.message, error.status);
    throw new ApiError(500, 'Failed to create the user identity');
  }

  if (!data?.user?.id) {
    throw new ApiError(500, 'Failed to create the user identity');
  }
  return data.user.id;
}

/** Compensating delete — removes the auth identity when the DB insert fails. */
async function rollbackSupabaseIdentity(authId: string): Promise<void> {
  try {
    await getSupabaseAdmin().auth.admin.deleteUser(authId);
  } catch (err) {
    // Log safely; never throw from a rollback path.
    console.error('[Provisioning] Failed to roll back Supabase identity', authId, err);
  }
}

/**
 * Provision a new student or teacher with a real Supabase login identity.
 * Role is fixed by the caller — never read from the request body.
 */
export async function provisionAccount(
  role: 'student' | 'teacher',
  input: ProvisionStudentInput | ProvisionTeacherInput,
): Promise<{ id: string; name: string; email: string }> {
  const { name, email, phone, password } = normalize(input);

  await assertNoDuplicateUser(email, phone);

  const supabaseAuthId = await createSupabaseIdentity(email, password, name, phone, role);

  try {
    const [user] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(schema.users)
        .values({ name, email, phone, password: '', role })
        .returning();

      if (role === 'student') {
        const s = input as ProvisionStudentInput;
        await tx.insert(schema.studentProfiles).values({
          userId: created.id,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          address: s.address,
          courseId: s.courseId || null,
        });
      } else {
        const t = input as ProvisionTeacherInput;
        await tx.insert(schema.teacherProfiles).values({
          userId: created.id,
          qualification: t.qualification,
          experience: typeof t.experience === 'number' ? t.experience : (t.experience ? parseInt(String(t.experience), 10) : null),
          specialization: t.specialization,
        });
      }

      // Link the Supabase identity so first login resolves to this user.
      await tx.insert(schema.profiles).values({
        supabaseAuthId,
        userId: created.id,
        primaryProvider: 'email',
      });

      return [created];
    });

    return { id: user.id, name: user.name, email: user.email };
  } catch (err) {
    // DB failed — undo the Auth identity so no orphan login exists.
    await rollbackSupabaseIdentity(supabaseAuthId);
    console.error('[Provisioning] DB insert failed; rolled back Supabase identity', supabaseAuthId);
    throw new ApiError(500, 'Failed to create the account');
  }
}