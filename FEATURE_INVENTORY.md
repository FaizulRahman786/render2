# FEATURE_INVENTORY.md

> Classification of every discovered feature. **IMPLEMENTED** = fully wired UI→API→DB with authorization. **PARTIAL** = incomplete wiring. **BROKEN** = errors in normal use. **HARDCODED/MOCKED** = no real data. **DUPLICATE** = parallel implementation. **DEAD** = unreachable. **MISSING** = absent but expected. **NEEDS_IMPROVEMENT** = works with quality issues.

## 1. Authentication & Accounts

| Feature | Status | Evidence |
|---|---|---|
| Shared email+password login | IMPLEMENTED | `LoginPage.tsx`, `signInWithPassword`, Supabase |
| Admin-provisioned accounts (create student/teacher w/ password → can log in) | IMPLEMENTED | `accountProvisioningService.ts` + admin forms (Phase E) |
| Account status enforcement (inactive/blocked → 401) | IMPLEMENTED | `authService.resolveSupabaseAuthUser` |
| Soft-delete / restore | IMPLEMENTED | `deleted_at`/`deleted_by`, `POST /restore` |
| Forgot/reset password UI | MISSING | Supabase supports; no flow wired |
| Session token in localStorage | NEEDS_IMPROVEMENT | documented residual XSS risk (SECURITY.md) |
| Mock-auth path | MOCKED (dev-only, fail-closed in prod) | `ENABLE_AUTH_MOCK` guards |

## 2. Admin

| Feature | Status | Evidence |
|---|---|---|
| Dashboard (8 stats, real DB) | IMPLEMENTED | `/admin/dashboard` |
| Students list/search/filter/paginate | IMPLEMENTED | `/admin/students` |
| Student create w/ invite-password | IMPLEMENTED | provisioning + form |
| Student edit/deactivate/restore | IMPLEMENTED | PUT/DELETE/restore + UI |
| Teachers equivalents | IMPLEMENTED | same pattern |
| Courses CRUD | IMPLEMENTED | create/update/delete + UI |
| Subjects/Chapters CRUD | IMPLEMENTED | nested UI |
| Batches CRUD + member mgmt | IMPLEMENTED | add/remove teachers/students |
| Materials (upload Cloudinary/local, delete) | IMPLEMENTED | `/api/upload`, storage.ts |
| Tests overview + results | IMPLEMENTED | read-only (admin) |
| Live classes monitor | IMPLEMENTED | read-only |
| Fees create + payment record + receipt | IMPLEMENTED | overpayment rejected |
| Notification broadcast | IMPLEMENTED | role/batch targeting, SSE |
| Audit logs (filter, CSV export) | IMPLEMENTED | `/admin/audit-logs` |
| Settings (institute/notification/fee/security) | IMPLEMENTED | `/admin/settings` |
| Site Preview (desktop/tablet/mobile, live/draft toggle) | IMPLEMENTED | `/admin/website` preview tab → iframe `/preview` |
| CMS (home/SEO/social/footer, draft→publish) | IMPLEMENTED | `/admin/cms`, settings-backed draft/live |
| CMS version history + restore | IMPLEMENTED | `cms_versions` + `/admin/cms/versions` |
| Notices management | IMPLEMENTED | `/admin/notices` CRUD + lifecycle |
| Events management | IMPLEMENTED | `/admin/events` CRUD + lifecycle |
| Enquiries inbox | IMPLEMENTED | `/admin/enquiries` + status pipeline |
| Media library (Cloudinary) | IMPLEMENTED | `/admin/media` + usage-safe delete |
| Global admin search | IMPLEMENTED | `/admin/search` + `GlobalSearch` topbar |
| Command palette (Ctrl+K) | IMPLEMENTED | `CommandPalette` + `useGlobalSearch` |
| System health view | IMPLEMENTED | `/admin/system` |
| Maintenance mode | IMPLEMENTED | `maintenanceMode` setting + Settings toggle; public shows banner, admins bypass |
| Students/Teachers CSV export | IMPLEMENTED | `?all=true` + `lib/csv.ts` download |
| Dashboard shortcuts (add student/teacher/etc.) | PARTIAL | static link tiles only |
| Draft/publish workflow | IMPLEMENTED | CMS draft→publish; tests draft→published |

## 3. Teacher

| Feature | Status | Evidence |
|---|---|---|
| Dashboard (aggregates, upcoming classes) | IMPLEMENTED | |
| My Batches (scoped) | IMPLEMENTED | batch_teachers |
| Materials upload → notify batch | IMPLEMENTED | batch-membership checked |
| Live Classes CRUD + go-live SSE | IMPLEMENTED | batch-membership checked on create |
| Tests (MCQ author, publish, results, grading incl. subjective) | IMPLEMENTED | Phase K |
| Assignments + grading | IMPLEMENTED | |
| Doubts (batch-scoped reply) | IMPLEMENTED | Phase D |
| Analytics / Student Progress / Attendance | IMPLEMENTED | |
| Profile | IMPLEMENTED | |

## 4. Student

| Feature | Status | Evidence |
|---|---|---|
| Dashboard (fee alert, stats, upcoming, results, attendance %) | IMPLEMENTED | |
| Courses (membership-derived) | IMPLEMENTED | Phase C |
| Materials (batch/course scoped) | IMPLEMENTED | Phase C |
| Live Classes (batch scoped) | IMPLEMENTED | Phase C |
| Tests (timer, palette, batch-scoped, auto-grade MCQ) | IMPLEMENTED | Phase C/K |
| Results (pending/graded accuracy) | IMPLEMENTED | Phase K |
| Assignments + file upload | IMPLEMENTED | uploadSubmissionFile |
| Doubts | IMPLEMENTED | |
| Fees + receipt | IMPLEMENTED | |
| Notifications (SSE) | IMPLEMENTED | |
| Profile + completion gate | IMPLEMENTED | |

## 5. Public Website

| Feature | Status | Evidence |
|---|---|---|
| Public site (Home/Courses/Faculty/Notices/Events/Contact) | IMPLEMENTED | routes `/`, `/courses`, `/faculty`, `/notices`, `/events`, `/contact` under `PublicLayout` |
| Admissions page | IMPLEMENTED | `/admissions` — rounds, eligibility, documents/process lists, contact + CTA |
| Fee structure page | IMPLEMENTED | `/fees` — session-grouped tables from `fee_structures` |
| Achievements page | IMPLEMENTED | `/achievements` — category filters, levels, images |
| Results page | IMPLEMENTED | `/results` — consent-published top performers (rank/%/grade) |
| Gallery page | IMPLEMENTED | `/gallery` — grid + lightbox, category filters |
| Reviews page + submission | IMPLEMENTED | `/reviews` — approved-only display; POST → pending + consent + rate limit + admin notif |
| Blog list + detail | IMPLEMENTED | `/blog`, `/blog/:slug` — published posts only (paginated) |
| FAQs page | IMPLEMENTED | `/faqs` — accordion grouped by category |
| Story / long-form pages | IMPLEMENTED | `/story` — site_pages JSON blocks (`RenderBlocks`), `/pages/:slug` |
| Event detail | IMPLEMENTED | `/events/:slug` — slug-or-id lookup, 404 for missing (uuid cast guarded) |
| Custom pages (HTML/CSS/JS) | IMPLEMENTED | `/:slug` sandboxed iframe (`sandbox="allow-scripts"`); published only; draft via HMAC token |
| Custom homepage mode | IMPLEMENTED | `homepageMode=personal` → custom page replaces CMS homepage |
| Contact/enquiry form + admin inbox | IMPLEMENTED | `POST /public/enquiries` (10/15min rate limit) → `/admin/website/enquiries` |
| Public notices/events pages | IMPLEMENTED | `/public/notices`, `/public/events` with date/attachment fields |
| Admin draft preview | IMPLEMENTED | `/preview?page=&section=&draft=1` iframe, admin-only draft merge |
| Website preview center | IMPLEMENTED | `/admin/website/preview` — public/student/teacher/admin portals, device widths, live/draft |
| SEO metadata (titles, OG, canonical, sitemap, robots) | IMPLEMENTED | `useSeo` + CMS seo defaults + `robots.txt` + build-time `sitemap.xml` |
| CMS-managed homepage/SEO/social/footer content | IMPLEMENTED | settings-backed draft/live + editor |
| DB-driven navigation | IMPLEMENTED | `navigation_items` + published custom-page nav; `GET /public/config`; system items protected |
| Homepage sections config | IMPLEMENTED | `homepage_sections` rows (toggles, headings, CtAs, featured ids) |
| WhatsApp floating widget | IMPLEMENTED | PublicLayout, number/message from settings |

## 5b. Admin Public-Site CMS (`/admin/website/*`, `requireAdmin`)

| Feature | Status | Evidence |
|---|---|---|
| Website overview dashboard | IMPLEMENTED | `/admin/website` — cms-stats (pending reviews, drafts, counts, activity) |
| Structured collections CRUD (generic factory) | IMPLEMENTED | admissions, fees, achievements, results, gallery, blog, faqs — list/search/status/publish/unpublish/archive |
| Reviews moderation | IMPLEMENTED | approve/reject + status filter |
| Long-form page editor (JSON blocks) | IMPLEMENTED | `/admin/website/pages` |
| Navigation manager | IMPLEMENTED | tree editing, reserved slugs + system items protected |
| Custom pages manager + editor | IMPLEMENTED | file tree, code editor, save/delete file, versions/restore, validate report, sandboxed draft preview, publish/unpublish/archive/duplicate |
| Custom page security | IMPLEMENTED | sandboxed iframe only; path sanitization; whitelisted content-types; HMAC draft token (15-min); entry-file publish gate |
| Site settings | IMPLEMENTED | contact, WhatsApp, homepage mode + custom slug |

## 6. Database / Infrastructure

| Item | Status | Evidence |
|---|---|---|
| Supabase as persistent store | IMPLEMENTED | live connection verified |
| Cloudinary media | IMPLEMENTED (materials) | storage.ts |
| RLS policies (defense-in-depth) | IMPLEMENTED | 0005/0006, 16 policies |
| Migrations 0000–0009 | IMPLEMENTED | applied to live DB (0007 CMS, 0008 cms_versions, 0009 public site CMS) |
| Tests (vitest unit suite) | IMPLEMENTED | 81 pass, 1 Db-gated skip |
| CI | MISSING | no workflow (blocked by repo root question) |
| LocalStorage as data source | NONE (good) | only Supabase session tokens |
| Hardcoded demo data in production paths | NONE | dead scaffolding removed (src/app/apps, app stubs, shared-ui, utilities) |
| Dead deps (jsonwebtoken, bcryptjs, ws, pg, MUI...) | DEAD | unused |

## 7. Cross-cutting

| Item | Status | Evidence |
|---|---|---|
| Input validation on high-risk writes | IMPLEMENTED | validation/schemas.ts, 36 routes |
| PG error mapping (23505→409 etc.) | IMPLEMENTED | error.ts |
| Audit trail for admin writes | IMPLEMENTED | logAudit on most admin writes |
| Audit trail for teacher/student writes | MISSING | teacher writes not audited |
| Loading/empty/error states | IMPLEMENTED (mostly) | per-page |
| Responsive admin (mobile sidebar) | IMPLEMENTED | layouts |
| Accessibility | NEEDS_IMPROVEMENT | no lint tooling; alt text absent for CMS images (no CMS) |
| Performance (bundle 1.59MB single chunk) | NEEDS_IMPROVEMENT | documented LOW |
| Rate limiting (API 500/15m, auth 20/15m) | IMPLEMENTED | server.ts |
