import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  const refreshUser = useCallback(async () => {
    const res = await api.auth.me();
    if (res.success && res.data) {
      const nextUser = res.data as User;
      setUser(nextUser);
      return nextUser;
    }
    setUser(null);
    return null;
  }, []);

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

  const sendEmailOtp = useCallback(async (email: string) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email });
    if (error) throw error;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;

      const nextUser = await refreshUser();
      if (!nextUser) throw new Error('No application account is linked to this identity.');
      toast.success(`Welcome back, ${nextUser.name}!`);
      return nextUser;
    } catch (error: any) {
      setUser(null);
      toast.error(error.message || 'OTP verification failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

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
      sendEmailOtp,
      verifyEmailOtp,
      signInWithGoogle,
      logout,
      refreshUser: async () => { await refreshUser(); },
    }),
    [user, isLoading, sendEmailOtp, verifyEmailOtp, signInWithGoogle, logout, refreshUser],
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

        // Now that the session is confirmed, fetch the application user from the backend.
        const res = await api.auth.me();
        if (!res.success || !res.data) throw new Error('Unable to load your account.');
        const nextUser = res.data as User;

        if (!mounted) return;
        await refreshUser();
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
