# Security Notes — Coaching Institute Management Platform

## Security model

**Backend-centric access.** The Express API (`apps/backend`) is the primary
security boundary. It connects to PostgreSQL as the table owner, enforces
object-level authorization via `services/authorization.ts` (fail closed, 404
over 403 where existence is sensitive), and is the only component that ever
reads or writes domain tables with elevated privileges. The frontend never
queries domain tables directly.

**RLS is defense-in-depth, not the primary control.** `supabase/migrations/
0002_enable_rls.sql` enables row-level security on every table, and
`0005_rls_policies.sql` adds explicit, per-user-scoped policies for
`profiles`, `notifications`, `test_results`, `materials`, `batch_students`
and `batch_teachers`. Callers are resolved through
`profiles.supabase_auth_id` → `users.id`. Tables without policies (users,
courses, fees, tests, …) remain deny-all for direct clients. These policies
only constrain direct database access; they never weaken access, and the
runtime API role is unaffected.

## Non-negotiable invariants (never regress)

- Production + mock auth → refuses to start / returns 503. Mock data never in prod.
- Every `:id` endpoint answers "can THIS user access THIS object?" (IDOR defense).
- Role alone is never sufficient for object access.
- Backend enforces what UI hides; UI hiding is only UX.
- No secrets in code, logs, frontend, or docs. `SUPABASE_SERVICE_ROLE_KEY` is backend-only.
- `users.password` is never used for authentication; no new password system.
- Teacher/student creation cannot escalate roles via body payload.
- Fail closed. 404 over 403 where existence is sensitive.

## Known residual risks (accepted, owner-visible)

- **Bearer token in localStorage** (Vite SPA architecture). Mitigations: CSP
  at the static host (`script-src 'self'`, `frame-ancestors 'none'`), no
  `dangerouslySetInnerHTML` with untrusted input, HTTPS at the edge. Moving to
  httpOnly secure cookies is future work and would require reworking OAuth
  session refresh — explicitly out of scope this pass.
- **RLS without a least-privilege runtime role.** The API runs as the table
  owner, so RLS policies do not constrain the API itself. Optional hardening
  (owner action, done in the Supabase dashboard): create an `app_runtime`
  role, GRANT the exact DML needed, and point `DATABASE_URL` at it while
  keeping migrations on the admin connection.

## Improvements implemented

- Centralized auth state reset on logout.
- Replace-based redirects to prevent browser history access to protected pages.
- Route-level role checks for admin, teacher, and student areas.
- Environment variables moved to .env.example for configuration.
- Backend auth endpoints validate tokens and roles consistently.
- Fail-closed mock auth: startup refuses when `NODE_ENV=production` and
  `ENABLE_AUTH_MOCK=true`; API returns 503 when the DB is offline and mock
  auth is disabled.
- IDOR defenses: student cross-batch scoping, teacher object ownership checks,
  teacher-scoped notification recipients, student-scoped test access.
- Account provisioning is backend-only (service role), rejects role
  escalation, and compensates (deletes the Supabase auth user) if DB writes fail.
- Postgres error codes mapped to safe HTTP statuses (409/422/400); no leaks of
  constraint names, stacks, or connection strings.
- Inputs are validated and normalized centrally (`src/validation/schemas.ts`);
  uploads keep the MIME allowlist, server-generated filenames, and `nosniff`.

## Recommended next steps (owner-gated)

- Rotate `DATABASE_URL` / `DIRECT_URL` / `SUPABASE_*` / `CLOUDINARY_URL` at the providers.
- Enable `SUPABASE_SERVICE_ROLE_KEY` for the backend; confirm Email/Google provider settings.
- Create the least-privilege `app_runtime` DB role (see above).
- Deploy only with explicit approval: `NODE_ENV=production`, mock disabled,
  `VITE_API_URL` and CORS origins correct, CSP headers set.
- Add rate limiting and audit logging for auth actions.
