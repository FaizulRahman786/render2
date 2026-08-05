-- =============================================================================
-- 0005_rls_policies.sql — Defense-in-depth RLS policies (Phase G)
--
-- Model: the Express API is the PRIMARY security boundary (it connects as the
-- table owner and enforces object-level authz via services/authorization.ts).
-- RLS here is a SECONDARY layer that constrains any direct database access
-- (Supabase anon/authenticated clients, mistakes, lapses) to each user's own
-- data. We never weaken RLS to make queries work; the API role bypasses these
-- policies at runtime.
--
-- Identity mapping: app accounts live in public.users (app-managed UUIDs).
-- public.profiles.supabase_auth_id links the Supabase auth.users UUID to an
-- app user id, so policies resolve the caller via auth.uid().
-- =============================================================================

-- Scope helpers (resolution through profiles, cheap and stable).
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
parallel safe
as $$
  select user_id
  from profiles
  where supabase_auth_id = auth.uid()::text
  limit 1;
$$;

create or replace function public.current_app_user_role()
returns text
language sql
stable
parallel safe
as $$
  select u.role
  from users u
  join profiles p on p.user_id = u.id
  where p.supabase_auth_id = auth.uid()::text
  limit 1;
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
-- A user may read their own identity link (needed so current_app_user_*() can
-- resolve). No direct INSERT/UPDATE: provisioning is backend-only (service
-- role), last_login_at updates go through the API.
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles
  for select
  using (supabase_auth_id = auth.uid()::text);

-- ── notifications ───────────────────────────────────────────────────────────
-- A user may read and mark-read their own notifications (receiver_id).
drop policy if exists "notifications_select_own" on notifications;
create policy "notifications_select_own"
  on notifications
  for select
  using (receiver_id = public.current_app_user_id());

drop policy if exists "notifications_update_own" on notifications;
create policy "notifications_update_own"
  on notifications
  for update
  using (receiver_id = public.current_app_user_id())
  with check (receiver_id = public.current_app_user_id());

-- ── test_results ────────────────────────────────────────────────────────────
-- Students see their own results; teachers see results for tests they own.
drop policy if exists "test_results_select_own" on test_results;
create policy "test_results_select_own"
  on test_results
  for select
  using (
    student_id = public.current_app_user_id()
    or public.current_app_user_role() = 'teacher'
       and test_id in (select id from tests where teacher_id = public.current_app_user_id())
  );

-- ── materials ───────────────────────────────────────────────────────────────
-- Published institute-wide materials (no batch) are visible; batch-scoped
-- materials only to enrolled students; teachers see what they uploaded and
-- admins everything. The API enforces the full rule set; this is a coarse
-- ceiling, intentionally simpler than backend logic.
drop policy if exists "materials_select_scoped" on materials;
create policy "materials_select_scoped"
  on materials
  for select
  using (
    public.current_app_user_role() = 'admin'
    or uploaded_by = public.current_app_user_id()
    or (visibility = true and (
          batch_id is null
          or batch_id in (
            select b.batch_id from batch_students b where b.student_id = public.current_app_user_id()
          )
       ))
  );

-- ── batch membership ────────────────────────────────────────────────────────
-- Users read only their own batch memberships (used by UI to render batches).
drop policy if exists "batch_students_select_own" on batch_students;
create policy "batch_students_select_own"
  on batch_students
  for select
  using (student_id = public.current_app_user_id());

drop policy if exists "batch_teachers_select_own" on batch_teachers;
create policy "batch_teachers_select_own"
  on batch_teachers
  for select
  using (teacher_id = public.current_app_user_id());

-- NOTE: least-privilege RUNTIME role (Phase G step 3) is an owner action:
-- create an `app_runtime` Postgres role with GRANT SELECT/INSERT/UPDATE on the
-- tables the API touches and point the backend at it. Documented in SECURITY.md;
-- keeping migrations on the admin connection so the API owner access is unchanged.