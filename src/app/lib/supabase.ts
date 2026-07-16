import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return { url, anonKey };
}

// Persistent subscribers for offline mock auth state changes
type AuthChangeCallback = (event: string, session: any) => void;
const mockSubscribers: AuthChangeCallback[] = [];

// Reusable mock client interface for offline/sandbox development
const mockSupabaseClient = {
  auth: {
    signInWithOtp: async (credentials: { email?: string; phone?: string }) => {
      if (credentials.email) {
        console.log('Offline Mock: sending OTP for email:', credentials.email);
      } else if (credentials.phone) {
        console.log('Offline Mock: sending OTP for phone:', credentials.phone);
      }
      return { data: {}, error: null };
    },
    signInWithOAuth: async (options: any) => {
      console.log('Offline Mock: signInWithOAuth called with options:', options);
      const provider = options?.provider || 'google';
      const mockSession = {
        access_token: `mock-oauth-token-${provider}`,
        user: {
          id: `mock-oauth-uuid-${provider}`,
          email: `${provider}-user@demo.com`,
          app_metadata: { provider },
          user_metadata: {
            full_name: `Demo ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
            avatar_url: '',
          },
        },
      };
      // Set the mock session in localStorage
      localStorage.setItem('sb-mock-session', JSON.stringify(mockSession));
      // Notify all registered onAuthStateChange subscribers
      mockSubscribers.forEach(cb => cb('SIGNED_IN', mockSession));

      // Simulate the redirect to the callback page
      const redirectTo = options?.options?.redirectTo || `${window.location.origin}/auth/callback`;
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 500);

      return { data: { provider, url: redirectTo }, error: null };
    },
    verifyOtp: async (params: { email?: string; phone?: string; token: string }) => {
      const email = params.email || (params.phone ? `${params.phone.replace(/\D/g, '')}@demo.com` : 'student@demo.com');
      console.log('Offline Mock: verifying OTP', params.token, 'for', email);
      const mockSession = {
        access_token: `mock-token-${email}`,
        user: {
          id: `mock-uuid-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
          phone: params.phone || '',
          email: email,
          app_metadata: { provider: 'email' },
          user_metadata: {},
        },
      };
      localStorage.setItem('sb-mock-session', JSON.stringify(mockSession));
      // Notify all registered onAuthStateChange subscribers
      mockSubscribers.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { session: mockSession, user: mockSession.user }, error: null };
    },
    getSession: async () => {
      const sess = localStorage.getItem('sb-mock-session');
      return { data: { session: sess ? JSON.parse(sess) : null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      // Register persistent subscriber
      mockSubscribers.push(callback);
      // Fire immediately with existing session (if any)
      const sess = localStorage.getItem('sb-mock-session');
      const session = sess ? JSON.parse(sess) : null;
      if (session) {
        setTimeout(() => callback('SIGNED_IN', session), 0);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const idx = mockSubscribers.indexOf(callback);
              if (idx !== -1) mockSubscribers.splice(idx, 1);
            },
          },
        },
      };
    },
    signOut: async () => {
      localStorage.removeItem('sb-mock-session');
      mockSubscribers.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
  },
} as unknown as SupabaseClient;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabaseConfig();
    const rawClient = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });

    if (import.meta.env.VITE_ENABLE_AUTH_MOCK === 'true') {
      // Wrap the real client in a Proxy to fallback to the mock client if network requests fail.
      // IMPORTANT: The Supabase SDK catches fetch errors internally and returns them as
      // { data: null, error: TypeError("Failed to fetch") } rather than throwing.
      // So we must check BOTH the thrown exception AND the returned result.error.
      console.warn('[Proxy Setup] Wrapping SupabaseClient in Proxy (mock mode enabled)...');
      client = new Proxy(rawClient, {
        get(target, prop, receiver) {
          if (prop === 'auth') {
            const originalAuth = Reflect.get(target, prop, receiver);
            return new Proxy(originalAuth, {
              get(authTarget, authProp) {
                const originalMethod = Reflect.get(authTarget, authProp);
                if (typeof originalMethod !== 'function') return originalMethod;

                // onAuthStateChange: also register in mockSubscribers for mock callbacks
                if (authProp === 'onAuthStateChange') {
                  return (callback: AuthChangeCallback) => {
                    mockSubscribers.push(callback);
                    const realResult = originalMethod.apply(authTarget, [callback]);
                    return {
                      data: {
                        subscription: {
                          unsubscribe: () => {
                            const idx = mockSubscribers.indexOf(callback);
                            if (idx !== -1) mockSubscribers.splice(idx, 1);
                            realResult?.data?.subscription?.unsubscribe?.();
                          },
                        },
                      },
                    };
                  };
                }

                // getSession: if real client has no session but we have a mock session, return mock
                if (authProp === 'getSession') {
                  return async () => {
                    try {
                      const result = await originalMethod.apply(authTarget, []);
                      if (!result?.data?.session) {
                        const mockSess = localStorage.getItem('sb-mock-session');
                        if (mockSess) {
                          return { data: { session: JSON.parse(mockSess) }, error: null };
                        }
                      }
                      return result;
                    } catch {
                      const mockSess = localStorage.getItem('sb-mock-session');
                      return { data: { session: mockSess ? JSON.parse(mockSess) : null }, error: null };
                    }
                  };
                }

                // signInWithOtp: mock directly in mock mode to avoid rate limiting / network dependency
                if (authProp === 'signInWithOtp') {
                  return async (...args: any[]) => {
                    console.warn('[Proxy Auth] Routing to mock signInWithOtp...');
                    const mockMethod = Reflect.get(mockSupabaseClient.auth, authProp);
                    return await mockMethod.apply(mockSupabaseClient.auth, args);
                  };
                }

                // verifyOtp: mock directly in mock mode to avoid rate limiting / network dependency
                if (authProp === 'verifyOtp') {
                  return async (...args: any[]) => {
                    console.warn('[Proxy Auth] Routing to mock verifyOtp...');
                    const mockMethod = Reflect.get(mockSupabaseClient.auth, authProp);
                    return await mockMethod.apply(mockSupabaseClient.auth, args);
                  };
                }

                // signInWithOAuth: proactively route to mock OAuth
                if (authProp === 'signInWithOAuth') {
                  return async (...args: any[]) => {
                    console.warn('[Proxy Auth] Routing to mock signInWithOAuth...');
                    const mockMethod = Reflect.get(mockSupabaseClient.auth, authProp);
                    return await mockMethod.apply(mockSupabaseClient.auth, args);
                  };
                }

                return async (...args: any[]) => {
                  const isNetworkError = (err: any) => {
                    if (!err) return false;
                    const errMsg = String(err.message || err).toLowerCase();
                    const errName = String(err.name || '').toLowerCase();
                    // Classic network / CORS failures
                    const isNetworkLevel =
                      errName.includes('typeerror') ||
                      errName.includes('networkerror') ||
                      err instanceof TypeError ||
                      errMsg.includes('fetch') ||
                      errMsg.includes('network') ||
                      errMsg.includes('enotfound') ||
                      errMsg.includes('failed') ||
                      errMsg.includes('cors');
                    // Supabase GoTrue 500/503 server errors indicating provider misconfiguration
                    const isProviderServerError =
                      (err.status === 500 || err.status === 503) ||
                      errMsg.includes('sms provider') ||
                      errMsg.includes('unable to get') ||
                      errMsg.includes('unexpected_failure');
                    return isNetworkLevel || isProviderServerError;
                  };

                  let result: any;
                  try {
                    result = await originalMethod.apply(authTarget, args);
                  } catch (err: any) {
                    if (isNetworkError(err)) {
                      const mockMethod = Reflect.get(mockSupabaseClient.auth, authProp);
                      if (typeof mockMethod === 'function') {
                        return await mockMethod.apply(mockSupabaseClient.auth, args);
                      }
                    }
                    throw err;
                  }

                  if (result?.error && isNetworkError(result.error)) {
                    const mockMethod = Reflect.get(mockSupabaseClient.auth, authProp);
                    if (typeof mockMethod === 'function') {
                      return await mockMethod.apply(mockSupabaseClient.auth, args);
                    }
                  }

                  return result;
                };
              }
            });
          }
          return Reflect.get(target, prop, receiver);
        }
      });
    } else {
      // Production mode: use the real Supabase client directly, no mock fallback
      client = rawClient;
    }
  }

  return client;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
