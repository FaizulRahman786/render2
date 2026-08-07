import type { User as SupabaseUser } from '@supabase/supabase-js';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { ApiError } from '../middleware/error.js';
import type { AuthUser } from '../../../../packages/shared-types/src/index';
import { UserRole, UserStatus } from '../../../../packages/shared-types/src/index.js';
import { isDbConnected } from '../config/database.js';
import { config } from '../config/env.js';

type AuthEventStatus = 'success' | 'failure';

type AuthEventInput = {
  userId?: string;
  supabaseAuthId?: string;
  eventType: string;
  provider?: string;
  status: AuthEventStatus;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

async function logAuthEvent(input: AuthEventInput) {
  try {
    await db.insert(schema.authEvents).values({
      userId: input.userId,
      supabaseAuthId: input.supabaseAuthId,
      eventType: input.eventType,
      provider: input.provider,
      status: input.status,
      reason: input.reason,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  } catch {
    // Authentication must not fail because audit persistence failed.
  }
}

function getPrimaryProvider(user: SupabaseUser): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === 'string' && provider) return provider;
  if (user.phone) return 'phone';
  return 'unknown';
}

function isVerifiedEmail(user: SupabaseUser): boolean {
  return Boolean(user.email && (user.email_confirmed_at || user.confirmed_at));
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

async function selectAppUserById(id: string) {
  const [user] = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      role: schema.users.role,
      status: schema.users.status,
      profileImage: schema.users.profileImage,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);

  return user;
}

/**
 * Ensures a role-specific profile row exists for the user.
 * On first login the row may not exist (e.g. admin created the user but the profile
 * sub-table insert was deferred). We auto-create a minimal record rather than
 * blocking the user with a 403. Admins have no separate profile table.
 */
async function ensureRoleProfileExists(userId: string, role: UserRole): Promise<void> {
  if (role === 'student') {
    const [existing] = await db
      .select({ id: schema.studentProfiles.id })
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.userId, userId))
      .limit(1);
    if (!existing) {
      await db.insert(schema.studentProfiles).values({ userId });
      console.info(`[Auth] Auto-created studentProfile for user ${userId}`);
    }
    return;
  }

  if (role === 'teacher') {
    const [existing] = await db
      .select({ id: schema.teacherProfiles.id })
      .from(schema.teacherProfiles)
      .where(eq(schema.teacherProfiles.userId, userId))
      .limit(1);
    if (!existing) {
      await db.insert(schema.teacherProfiles).values({ userId });
      console.info(`[Auth] Auto-created teacherProfile for user ${userId}`);
    }
  }
  // admin — no separate profile table required
}

async function getLinkedProfile(supabaseAuthId: string) {
  const [profile] = await db
    .select({
      id: schema.profiles.id,
      userId: schema.profiles.userId,
      supabaseAuthId: schema.profiles.supabaseAuthId,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.supabaseAuthId, supabaseAuthId))
    .limit(1);

  return profile;
}

async function findCandidateUser(user: SupabaseUser) {
  if (user.phone) {
    const normalizedPhone = normalizePhone(user.phone);
    const phoneDigits = normalizedPhone.replace(/^\+/, '');
    const phoneMatches = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`
        regexp_replace(${schema.users.phone}, '[^0-9+]', '', 'g') = ${normalizedPhone}
        OR regexp_replace(${schema.users.phone}, '[^0-9]', '', 'g') = ${phoneDigits}
      `);

    if (phoneMatches.length > 1) {
      throw new ApiError(403, 'Multiple users match this phone number');
    }

    if (phoneMatches.length === 1) return phoneMatches[0];
  }

  if (isVerifiedEmail(user) && user.email) {
    const email = user.email.toLowerCase();
    const emailMatches = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${email}`);

    if (emailMatches.length > 1) {
      throw new ApiError(403, 'Multiple users match this email address');
    }

    if (emailMatches.length === 1) return emailMatches[0];
  }

  return null;
}

async function linkSupabaseUser(supabaseUser: SupabaseUser, appUserId: string, provider: string) {
  const [existingForUser] = await db
    .select({
      id: schema.profiles.id,
      supabaseAuthId: schema.profiles.supabaseAuthId,
    })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, appUserId))
    .limit(1);

  if (existingForUser && existingForUser.supabaseAuthId !== supabaseUser.id) {
    throw new ApiError(403, 'This application user is already linked to another identity');
  }

  if (existingForUser) {
    await db
      .update(schema.profiles)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.profiles.id, existingForUser.id));
    return;
  }

  await db.insert(schema.profiles).values({
    supabaseAuthId: supabaseUser.id,
    userId: appUserId,
    primaryProvider: provider,
    linkedAt: new Date(),
    lastLoginAt: new Date(),
  });
}

function toAuthUser(appUser: Awaited<ReturnType<typeof selectAppUserById>>, supabaseUser: SupabaseUser): AuthUser {
  if (!appUser) throw new ApiError(404, 'User not found');

  return {
    id: appUser.id,
    email: appUser.email,
    role: appUser.role as UserRole,
    supabaseAuthId: supabaseUser.id,
    name: appUser.name,
    phone: appUser.phone,
    profileImage: appUser.profileImage ?? undefined,
  };
}

// Static mock user table — only used when ENABLE_AUTH_MOCK=true AND database is unavailable.
// Key can be an email address OR an E.164 phone number (e.g. "+917858062571").
const MOCK_USERS: ReadonlyMap<string, { role: UserRole; name: string }> = new Map([
  // ── email-based (Google OAuth in mock mode) ────────────────────────────────
  ['admin@demo.com',        { role: UserRole.ADMIN,   name: 'Demo Admin'        }],
  ['teacher@demo.com',      { role: UserRole.TEACHER, name: 'Demo Teacher'      }],
  ['student@demo.com',      { role: UserRole.STUDENT, name: 'Demo Student'      }],
  ['google-user@demo.com',  { role: UserRole.STUDENT, name: 'Demo Google User'  }],
  // ── phone-based (Phone OTP in mock mode) ──────────────────────────────────
  ['+917858062571',         { role: UserRole.STUDENT, name: 'Dev Phone Student' }],
]);

// ── Resolved-user cache ─────────────────────────────────────────────────────
// `resolveSupabaseAuthUser` runs on EVERY authenticated request (every API call
// carries the access token). The full path below costs ~5 DB round-trips
// including writes (lastLoginAt update + role-profile probe + audit insert).
// We cache the resolved user per Supabase identity with a short TTL so the
// heavy work happens only on a cache miss (~once per 30s per user), while a
// blocked/inactive account or role change still propagates within the TTL.
const CACHE_TTL_MS = 30_000;
const CACHE_MAX_ENTRIES = 2_000;
const resolvedUserCache = new Map<string, { user: AuthUser; expiresAt: number }>();

function cacheResolvedUser(supabaseAuthId: string, user: AuthUser): void {
  if (resolvedUserCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = resolvedUserCache.keys().next().value;
    if (oldestKey !== undefined) resolvedUserCache.delete(oldestKey);
  }
  resolvedUserCache.set(supabaseAuthId, { user, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCachedResolvedUser(supabaseAuthId: string): AuthUser | null {
  const entry = resolvedUserCache.get(supabaseAuthId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    resolvedUserCache.delete(supabaseAuthId);
    return null;
  }
  return entry.user;
}

/** Invalidate cache entries (used by tests; optionally scoped to one identity). */
export function invalidateResolvedUserCache(supabaseAuthId?: string): void {
  if (supabaseAuthId) {
    resolvedUserCache.delete(supabaseAuthId);
    return;
  }
  resolvedUserCache.clear();
}

export async function resolveSupabaseAuthUser(
  supabaseUser: SupabaseUser,
  metadata: { ipAddress?: string; userAgent?: string } = {},
): Promise<AuthUser> {
  const provider = getPrimaryProvider(supabaseUser);

  // Offline / degraded mode — only allowed when ENABLE_AUTH_MOCK=true.
  // NEVER silently fall through to mock data in production or when the flag is not set.
  if (!isDbConnected) {
    if (!config.enableAuthMock) {
      throw new ApiError(
        503,
        'Authentication service unavailable. The database is not reachable. ' +
        'Please check DATABASE_URL and try again later.',
      );
    }

    // Phone OTP users have a phone but no email — look up by phone first, then email.
    // Supabase stores phone numbers WITHOUT the leading '+' (e.g. "917858062571").
    // Normalise to strip '+' for consistent lookups.
    const rawPhone = supabaseUser.phone || '';
    const phone = rawPhone.startsWith('+') ? rawPhone.slice(1) : rawPhone;
    const email = supabaseUser.email?.toLowerCase() || '';
    // Build the MOCK_USERS lookup key — strip '+' from map keys too
    const lookupKey = phone
      ? (MOCK_USERS.has(`+${phone}`) ? `+${phone}` : phone)
      : email;

    const mockUser = MOCK_USERS.get(lookupKey);
    if (!mockUser) {
      // Phone OTP users who aren't in MOCK_USERS default to student role so
      // development is not blocked. Add the phone to MOCK_USERS to override.
      if (phone) {
        console.warn(
          `[MockAuth] No mock entry for phone "${phone}" — defaulting to STUDENT role. ` +
          `Add "${phone}" to MOCK_USERS in authService.ts to assign a different role.`,
        );
        return {
          id: `mock-phone-${phone.replace(/\D/g, '')}`,
          name: `Phone User (${phone})`,
          email: '',
          phone,
          role: UserRole.STUDENT,
          profileImage: undefined,
          supabaseAuthId: supabaseUser.id,
        };
      }
      throw new ApiError(403,
        `No mock user defined for "${lookupKey}". Add it to MOCK_USERS in authService.ts.`,
      );
    }

    return {
      id: `mock-user-id-${mockUser.role}`,
      name: mockUser.name,
      email,
      phone,
      role: mockUser.role,
      profileImage: undefined,
      supabaseAuthId: supabaseUser.id,
    };
  }

  try {
    // Fast path: already resolved within the TTL → no DB round-trips.
    const cached = getCachedResolvedUser(supabaseUser.id);
    if (cached) return cached;

    let profile = await getLinkedProfile(supabaseUser.id);
    let appUser = profile ? await selectAppUserById(profile.userId) : null;

    if (!appUser) {
      const candidate = await findCandidateUser(supabaseUser);
      if (!candidate) {
        throw new ApiError(403, 'No active application user is linked to this identity');
      }

      appUser = await selectAppUserById(candidate.id);
      if (!appUser) throw new ApiError(404, 'User not found');
      await linkSupabaseUser(supabaseUser, appUser.id, provider);
      profile = await getLinkedProfile(supabaseUser.id);
    } else {
      await db
        .update(schema.profiles)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(schema.profiles.supabaseAuthId, supabaseUser.id),
          eq(schema.profiles.userId, appUser.id),
        ));
    }

    if (appUser.status !== 'active') {
      throw new ApiError(401, 'Account is not active');
    }

    await ensureRoleProfileExists(appUser.id, appUser.role as UserRole);

    await logAuthEvent({
      userId: appUser.id,
      supabaseAuthId: supabaseUser.id,
      eventType: profile ? 'session_verified' : 'identity_linked',
      provider,
      status: 'success',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    const resolved = toAuthUser(appUser, supabaseUser);
    cacheResolvedUser(supabaseUser.id, resolved);
    return resolved;
  } catch (error) {
    await logAuthEvent({
      supabaseAuthId: supabaseUser.id,
      eventType: 'session_verified',
      provider,
      status: 'failure',
      reason: error instanceof Error ? error.message : 'Unknown authentication failure',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
    throw error;
  }
}
