const LEGACY_AUTH_KEYS = [
  'auth_token',
  'auth_refresh_token',
  'auth_user',
  'auth_session',
  'token',
  'refreshToken',
  // Mock session key used by the offline auth proxy (dev only)
  'sb-mock-session',
];

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  LEGACY_AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}
