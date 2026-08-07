import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { clearAuthStorage } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { AuthContextType, User } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function redirectForRole(user: User) {
  if (typeof window === 'undefined') return;
  const path = user.role === 'admin' ? '/admin' : user.role === 'teacher' ? '/teacher' : '/student';
  if (!window.location.pathname.startsWith(path)) {
    window.location.replace(path);
  }
}

// Statuses that prove this identity is definitively not authenticated on the
// backend. Anything else (429, 5xx, network, timeout) is a TRANSIENT failure
// and must never be treated as "logged out".
function isDefinitiveAuthFailure(err: any): boolean {
  const status = err?.status;
  return status === 401 || status === 404;
}

function isTransientAuthFailure(err: any): boolean {
  const status = err?.status;
  return status === undefined || status === 0 || status === 408 || status === 429 || status >= 500;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A burst of callers (signIn + the SIGNED_IN event that follows it) must not
// each trigger their own /api/auth/me round-trip.
const REFRESH_DEDUPE_MS = 2000;
// After a transient failure, short-circuit repeat callers so a degraded
// backend cannot turn into a request storm.
const FAILURE_COOLDOWN_MS = 5000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshInFlight = useRef<{ promise: Promise<User | null>; resolve: (u: User | null) => void } | null>(null);
  const lastRefresh = useRef<{ at: number; value: User | null; failed: boolean } | null>(null);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    // Dedupe: reuse the result of a very recent refresh instead of re-hitting
    // /api/auth/me (e.g. signIn + the SIGNED_IN event it triggers).
    const now = Date.now();
    const last = lastRefresh.current;
    if (last) {
      if (last.failed && now - last.at < FAILURE_COOLDOWN_MS) {
        const err: any = new Error('Authentication service is temporarily unavailable');
        err.status = 503;
        throw err;
      }
      if (!last.failed && now - last.at < REFRESH_DEDUPE_MS) {
        return last.value;
      }
    }

    if (refreshInFlight.current) return refreshInFlight.current.promise;
    const promise = new Promise<User | null>((resolve) => {
      refreshInFlight.current = { promise, resolve };
    });
    try {
      const res = await api.auth.me();
      const nextUser = res.success && res.data ? (res.data as User) : null;
      setUser(nextUser);
      lastRefresh.current = { at: Date.now(), value: nextUser, failed: false };
      return nextUser;
    } catch (err: any) {
      if (isDefinitiveAuthFailure(err)) {
        // Definitive: this identity is not authenticated on the backend.
        setUser(null);
        lastRefresh.current = { at: Date.now(), value: null, failed: false };
        return null;
      }
      // Transient (429 / 5xx / network / timeout): keep the current user
      // state; never log the user out because of a temporary error.
      lastRefresh.current = { at: Date.now(), value: null, failed: true };
      throw err;
    } finally {
      refreshInFlight.current = null;
    }
  }, []);

  // Session restoration runs exactly once on mount. There is deliberately NO
  // periodic /api/auth/me polling here: Supabase's SDK already auto-refreshes
  // the access token, and polling the backend only consumed the auth rate
  // limit and produced the historical 429 lockout loop.
  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();

    const restoreSession = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (mounted) setUser(null);
          return;
        }

        let nextUser: User | null = null;
        try {
          nextUser = await refreshUser();
        } catch {
          // Transient backend failure — retry once with a short delay before
          // giving up. The Supabase session stays stored so any later event
          // (or page load) can restore it; we never clear it here.
          await sleep(1500);
          try {
            nextUser = await refreshUser();
          } catch {
            nextUser = null;
          }
        }
        if (mounted && nextUser) setUser(nextUser);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Transient failures are deliberately swallowed — they must never
        // sign the user out. Definitive failures already set user to null
        // inside refreshUser.
        void refreshUser().catch(() => undefined);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshUser]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      let nextUser: User | null = null;
      try {
        nextUser = await refreshUser();
      } catch {
        throw new Error('Authentication service is temporarily unavailable. Please try again in a moment.');
      }
      if (!nextUser) throw new Error('No application account is linked to this identity.');
      toast.success(`Welcome back, ${nextUser.name}!`);
      return nextUser;
    } catch (error: any) {
      setUser(null);
      const status = error?.status;
      const message = isTransientAuthFailure(error) && status === 429
        ? 'Too many authentication attempts. Please wait a moment and try again.'
        : (error.message || 'Sign-in failed');
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout().catch(() => undefined);
      await getSupabaseClient().auth.signOut();
    } finally {
      clearAuthStorage(); // clears legacy keys AND sb-mock-session
      setUser(null);
      toast.info('Logged out successfully');
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      signInWithPassword,
      logout,
      refreshUser,
    }),
    [user, isLoading, signInWithPassword, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export function AuthCallback() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    let mounted = true;
    const complete = async () => {
      try {
        const supabase = getSupabaseClient();
        // Wait for Supabase to finish processing the OAuth/OTP callback URL.
        // getSession() flushes any PKCE code exchange or token hash from the URL.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) throw new Error('No session found after callback. Please try signing in again.');

        // The session is confirmed — load the application user from the backend.
        let nextUser: User | null = null;
        try {
          nextUser = await refreshUser();
        } catch {
          // Transient backend failure — retry once before deciding.
          await sleep(1500);
          try {
            nextUser = await refreshUser();
          } catch {
            throw new Error('Authentication service is temporarily unavailable. Please try again in a moment.');
          }
        }
        if (!nextUser) throw new Error('No application account is linked to this identity.');

        if (!mounted) return;
        redirectForRole(nextUser);
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error.message || 'Unable to complete sign in');
        if (isDefinitiveAuthFailure(error)) {
          await getSupabaseClient().auth.signOut();
          clearAuthStorage();
        }
        window.location.replace('/login');
      }
    };

    void complete();
    return () => { mounted = false; };
  }, [refreshUser]);

  return null;
}
