# Authentication Flow

## Login Flow
1. The user opens the single `/login` page.
2. The user signs in with Supabase Phone OTP or Google OAuth.
3. Supabase owns the browser session and access token.
4. The frontend sends the Supabase access token as `Authorization: Bearer <token>`.
5. Express verifies the token with Supabase and loads the matching application user.
6. The backend resolves the role from PostgreSQL only and redirects the user to `/student`, `/teacher`, or `/admin`.

## Logout Flow
1. The frontend records logout with `/api/auth/logout` when possible.
2. The frontend signs out through Supabase.
3. Legacy local storage auth keys are cleared.
4. The browser returns to `/login`.

## Token Lifecycle
- Supabase manages session persistence and token refresh.
- The backend never issues custom JWTs or refresh tokens.
- Expired or invalid Supabase access tokens return `401`.

## Route Protection
- `/student/*` requires the student role.
- `/teacher/*` requires the teacher role.
- `/admin/*` requires the admin role.
- Unauthenticated users are redirected to `/login`.
- Role mismatches are blocked by route guards and backend middleware.

## Role Resolution
- Supabase is identity only.
- PostgreSQL is the authorization source of truth.
- Roles are never accepted from client input, Google metadata, or phone metadata.
