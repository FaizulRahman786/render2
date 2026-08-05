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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshInFlight = useRef<{ promise: Promise<User | null>; resolve: (u: User | null) => void } | null>(null);

  const refreshUser = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current.promise;
    const promise = new Promise<User | null>((resolve) => {
      refreshInFlight.current = { promise, resolve };
    });
    try {
      const res = await api.auth.me();
      const nextUser = res.success && res.data ? (res.data as User) : null;
      setUser(nextUser);
      return nextUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      refreshInFlight.current = null;
    }
  }, []);

  // Proactive token refresh - refresh 5 minutes before expiry
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        await refreshUser();
      } catch {
        // Silently fail - Supabase onAuthStateChange will handle actual expiry
      }
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, [user, refreshUser]);

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

        const nextUser = await refreshUser();
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
        void refreshUser().catch(() => setUser(null));
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

      const nextUser = await refreshUser();
      if (!nextUser) throw new Error('No application account is linked to this identity.');
      toast.success(`Welcome back, ${nextUser.name}!`);
      return nextUser;
    } catch (error: any) {
      setUser(null);
      toast.error(error.message || 'Sign-in failed');
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
        const nextUser = await refreshUser();
        if (!nextUser) throw new Error('No application account is linked to this identity.');

        if (!mounted) return;
        redirectForRole(nextUser);
      } catch (error: any) {
        if (!mounted) return;
        toast.error(error.message || 'Unable to complete sign in');
        await getSupabaseClient().auth.signOut();
        clearAuthStorage();
        window.location.replace('/login');
      }
    };

    void complete();
    return () => { mounted = false; };
  }, [refreshUser]);

  return null;
}
