// Live provisioning verification (production backend, real Supabase auth).
// 1) admin sign-in → 2) provision teacher + student via /api/admin → 3) verify
// each new account can sign in with password & call a role-scoped endpoint →
// 4) cleanup (delete auth identities + DB rows).
import 'dotenv/config';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.BASE_URL || 'http://127.0.0.1:3001';
const PRD_SUB_DOMAIN = process.env.PRD_SUB_DOMAIN || 'localhost:5000';
const STAMP = Date.now();
const STUDENT_EMAIL = `live-e2e-stu-${STAMP}@demo.edu`;
const TEACHER_EMAIL = `live-e2e-tea-${STAMP}@demo.edu`;
const PASS = 'LivePass!2026';

const env = process.env;
const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(env.DATABASE_URL, { max: 2 });

async function api(method, p, { token, body } = {}) {
  const headers = { Origin: `http://${PRD_SUB_DOMAIN}` };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(URL + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, ok: res.ok, json, text };
}

let failures = 0;
const ok = (n, cond, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${n}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

(async () => {
  console.log(`Live provision against ${URL}\n`);

  // 1) Admin real-password sign in
  const signin = await anon.auth.signInWithPassword({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
  ok('admin password sign-in', !!signin.data?.session, signin.error?.message || '');
  if (!signin.data?.session) process.exit(1);
  const adminToken = signin.data.session.access_token;
  console.log(`  admin uid ${signin.data.user.id}\n`);

  // 2) Provision teacher + student via live admin API
  const tea = await api('POST', '/api/admin/teachers', {
    token: adminToken,
    body: { name: 'Live E2E Teacher', email: TEACHER_EMAIL, phone: '+15558901234', password: PASS, qualification: 'M.Sc', specialization: 'Physics' },
  });
  ok('admin provisions teacher', tea.status === 201 && tea.json?.success, `status=${tea.status} ${tea.text.slice(0, 120)}`);

  const stu = await api('POST', '/api/admin/students', {
    token: adminToken,
    body: { name: 'Live E2E Student', email: STUDENT_EMAIL, phone: '+15558905678', password: PASS, parentName: 'Parent A' },
  });
  ok('admin provisions student', stu.status === 201 && stu.json?.success, `status=${stu.status} ${stu.text.slice(0, 120)}`);

  // 3) Password login + role-scoped endpoint for each new account
  const teaSignin = await anon.auth.signInWithPassword({ email: TEACHER_EMAIL, password: PASS });
  ok('teacher password login', !!teaSignin.data?.user, teaSignin.error?.message || '');
  if (teaSignin.data?.session) {
    const me = await api('GET', '/api/auth/me', { token: teaSignin.data.session.access_token });
    ok('teacher /auth/me is role teacher', me.status === 200 && me.json?.data?.role === 'teacher', me.text.slice(0, 120));
    const tests = await api('GET', '/api/teacher/tests', { token: teaSignin.data.session.access_token });
    ok('teacher scoped endpoint reachable', tests.status === 200, `status=${tests.status}`);
  }

  const stuSign = await anon.auth.signInWithPassword({ email: STUDENT_EMAIL, password: PASS });
  ok('student password login succeeds', !!stuSign.data?.user, stuSign.error?.message || '');
  if (stuSign.data?.session) {
    const dash = await api('GET', '/api/student/dashboard', { token: stuSign.data.session.access_token });
    ok('student dashboard reachable', dash.status === 200, `status=${dash.status}`);
  }

  // 4) Cleanup: remove auth identities + app rows
  const au = {};
  for (const [label, email] of [['teacher', TEACHER_EMAIL], ['student', STUDENT_EMAIL]]) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
    const hit = (data?.users || []).find((u) => u.email === email);
    if (hit) {
      await adminClient.auth.admin.deleteUser(hit.id);
      au[label] = hit.id;
    }
  }
  if (Object.keys(au).length) {
    await sql.unsafe(`DELETE FROM auth_events WHERE user_id IN (SELECT id FROM users WHERE email IN ('${TEACHER_EMAIL}','${STUDENT_EMAIL}'))`);
    await sql.unsafe(`DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email IN ('${TEACHER_EMAIL}','${STUDENT_EMAIL}'))`);
    await sql.unsafe(`DELETE FROM users WHERE email IN ('${TEACHER_EMAIL}','${STUDENT_EMAIL}')`);
    console.log(`  cleanup: deleted auth identities + app rows`);
  }
  await sql.end();

  console.log(`\n${failures === 0 ? 'ALL PROVISION CHECKS PASSED' : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });