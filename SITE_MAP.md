# SITE_MAP.md

> Derived from the actual router (`src/app/routes.tsx`) and backend route registry. **Current state: public website + admin website tools fully implemented.**

## CURRENT ROUTES (as built)

### PUBLIC (implemented — indexable, `index,follow`)
| Path | Page | Status |
|---|---|---|
| `/` | Home (hero, announcement, stats, courses, events, notices, contact CTA; `homepageMode=personal` renders a sandboxed custom page) | IMPLEMENTED |
| `/courses` | Course listings | IMPLEMENTED |
| `/faculty` | Teacher/faculty listings | IMPLEMENTED |
| `/notices` | Public notices | IMPLEMENTED |
| `/events` | Public events | IMPLEMENTED |
| `/events/:slug` | Event detail (slug or id) | IMPLEMENTED |
| `/admissions` | Admission rounds, eligibility, documents, process | IMPLEMENTED |
| `/fees` | Session-grouped fee structure tables | IMPLEMENTED |
| `/achievements` | Achievements with category filters | IMPLEMENTED |
| `/results` | Public exam results (consent-gated) | IMPLEMENTED |
| `/gallery` | Photo gallery grid + lightbox (category filters) | IMPLEMENTED |
| `/reviews` | Approved reviews + moderated submission form | IMPLEMENTED |
| `/blog` | Blog listings | IMPLEMENTED |
| `/blog/:slug` | Blog post detail | IMPLEMENTED |
| `/faqs` | FAQ accordion (grouped by category) | IMPLEMENTED |
| `/story` | Long-form CMS pages (Our Story…) with block renderer | IMPLEMENTED |
| `/:slug` | Published custom pages (HTML/CSS/JS) in a sandboxed iframe | IMPLEMENTED |
| `/contact` | Contact form + info | IMPLEMENTED |
| `/preview` | Iframe route used by admin Site Preview (live or draft content) | IMPLEMENTED |
| `/login` | Shared email+password login | IMPLEMENTED |
| `/auth/callback` | OAuth/OTP callback | IMPLEMENTED |

### ADMIN (`/admin`, role=admin)
| Path | Page | Status |
|---|---|---|
| `/admin` | Dashboard (8 stats, quick actions) | IMPLEMENTED |
| `/admin/students` | Students | IMPLEMENTED |
| `/admin/teachers` | Teachers | IMPLEMENTED |
| `/admin/courses` | Courses (subjects/chapters) | IMPLEMENTED |
| `/admin/batches` | Batches (+members) | IMPLEMENTED |
| `/admin/materials` | Materials | IMPLEMENTED |
| `/admin/tests` | Tests (+results) | IMPLEMENTED |
| `/admin/fees` | Fees + payments | IMPLEMENTED |
| `/admin/live-classes` | Live classes monitor | IMPLEMENTED |
| `/admin/broadcast` | Broadcast | IMPLEMENTED |
| `/admin/audit-logs` | Audit logs + CSV | IMPLEMENTED |
| `/admin/settings` | Settings | IMPLEMENTED |
| `/admin/system` | System health (DB check + counts) | IMPLEMENTED |
| `/admin/website` | Website management hub (Overview dashboard default) | IMPLEMENTED |
| `/admin/website/content` | CMS editor (home/seo/social/footer, draft + publish) | IMPLEMENTED |
| `/admin/website/homepage` | Homepage sections manager (featured ids, toggles, CtAs) | IMPLEMENTED |
| `/admin/website/admissions` | Admissions manager | IMPLEMENTED |
| `/admin/website/fees` | Fee structures manager | IMPLEMENTED |
| `/admin/website/achievements` | Achievements manager | IMPLEMENTED |
| `/admin/website/results` | Public results manager | IMPLEMENTED |
| `/admin/website/gallery` | Gallery manager | IMPLEMENTED |
| `/admin/website/reviews` | Reviews moderation (approve/reject) | IMPLEMENTED |
| `/admin/website/blog` | Blog posts manager (slug, featured, publish) | IMPLEMENTED |
| `/admin/website/faqs` | FAQs manager | IMPLEMENTED |
| `/admin/website/pages` | Story/long-form pages (JSON blocks) | IMPLEMENTED |
| `/admin/website/navigation` | Navigation manager (DB-driven, system items protected) | IMPLEMENTED |
| `/admin/website/custom-pages` | Custom pages list (create/publish/archive) | IMPLEMENTED |
| `/admin/website/custom-pages/:id` | Custom page editor (file tree, code editor, versions, validate, sandboxed preview) | IMPLEMENTED |
| `/admin/website/preview` | Site Preview (public/student/teacher/admin portals; desktop/tablet/mobile; live/draft) | IMPLEMENTED |
| `/admin/website/site-settings` | Contact, WhatsApp widget, homepage mode + custom slug | IMPLEMENTED |
| `/admin/website/notices` | Notices CRUD | IMPLEMENTED |
| `/admin/website/events` | Events CRUD | IMPLEMENTED |
| `/admin/website/enquiries` | Enquiries inbox | IMPLEMENTED |
| `/admin/website/media` | Media library (Cloudinary) | IMPLEMENTED |
| `/admin/site-preview` | Alias → site preview | IMPLEMENTED |
| `/admin/media` | Alias → media library | IMPLEMENTED |

### TEACHER (`/teacher`, role-guarded teacher+admin)
| Path | Page | Status |
|---|---|---|
| `/teacher` | Dashboard | IMPLEMENTED |
| `/teacher/batches` | My Batches | IMPLEMENTED |
| `/teacher/materials` | Materials | IMPLEMENTED |
| `/teacher/classes` | Live Classes | IMPLEMENTED |
| `/teacher/tests` | Tests | IMPLEMENTED |
| `/teacher/assignments` | Assignments | IMPLEMENTED |
| `/teacher/doubts` | Doubts | IMPLEMENTED |
| `/teacher/analytics` | Analytics | IMPLEMENTED |
| `/teacher/progress` | Student Progress | IMPLEMENTED |
| `/teacher/attendance` | Attendance | IMPLEMENTED |
| `/teacher/profile` | Profile | IMPLEMENTED |

### STUDENT (`/student`, role-guarded)
| Path | Page | Status |
|---|---|---|
| `/student` | Dashboard | IMPLEMENTED |
| `/student/courses` | My Courses | IMPLEMENTED |
| `/student/materials` | Study Materials | IMPLEMENTED |
| `/student/classes` | Live Classes | IMPLEMENTED |
| `/student/tests` | Tests | IMPLEMENTED |
| `/student/results` | Results | IMPLEMENTED |
| `/student/assignments` | Assignments | IMPLEMENTED |
| `/student/doubts` | Doubts | IMPLEMENTED |
| `/student/fees` | Fees | IMPLEMENTED |
| `/student/notifications` | Notifications | IMPLEMENTED |
| `/student/profile` | Profile | IMPLEMENTED |

## API SURFACE

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health`, `/api/status` | health (IMPLEMENTED) |
| GET | `/api/public/status` | institute info + maintenance flag (IMPLEMENTED) |
| GET | `/api/public/config` | navigation (DB + custom pages), whatsapp, social, homepage mode (IMPLEMENTED) |
| GET | `/api/public/home` | cms + aggregates for homepage (IMPLEMENTED) |
| GET | `/api/public/courses` | active courses (IMPLEMENTED) |
| GET | `/api/public/faculty` | active teachers (IMPLEMENTED) |
| GET | `/api/public/notices` | published public notices (IMPLEMENTED) |
| GET | `/api/public/events` | published events (IMPLEMENTED) |
| GET | `/api/public/events/:slug` | event detail by slug or id (IMPLEMENTED) |
| GET | `/api/public/admissions` | published admissions (IMPLEMENTED) |
| GET | `/api/public/fees` | published fee structures (IMPLEMENTED) |
| GET | `/api/public/achievements` | published achievements (+category filter) (IMPLEMENTED) |
| GET | `/api/public/results` | published results (+exam filter) (IMPLEMENTED) |
| GET | `/api/public/gallery` | published gallery (+category filter) (IMPLEMENTED) |
| GET | `/api/public/reviews` | approved reviews only (IMPLEMENTED) |
| GET | `/api/public/blog` | published blog posts (paginated) (IMPLEMENTED) |
| GET | `/api/public/blog/:slug` | published post detail (IMPLEMENTED) |
| GET | `/api/public/faqs` | published FAQs (IMPLEMENTED) |
| GET | `/api/public/pages` | published long-form pages list (IMPLEMENTED) |
| GET | `/api/public/pages/:slug` | long-form page detail (IMPLEMENTED) |
| GET | `/api/public/custom/:slug` | custom page meta + file manifest (draft requires HMAC token) (IMPLEMENTED) |
| GET | `/api/public/custom/:slug/files/*path` | sandboxed file serving (content-type, nosniff; draft gated) (IMPLEMENTED) |
| POST | `/api/public/enquiries` | contact form submit, validated + rate-limited (IMPLEMENTED) |
| POST | `/api/public/reviews` | review submit → pending (consent + rate-limited) (IMPLEMENTED) |

### Admin website tools
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/cms` | read draft + live CMS content (IMPLEMENTED) |
| PUT | `/api/admin/cms` | save draft (IMPLEMENTED) |
| POST | `/api/admin/cms/publish` | publish draft → live (IMPLEMENTED) |
| GET | `/api/admin/cms/preview?section=` | draft content for preview (IMPLEMENTED) |
| GET/POST | `/api/admin/notices` | notices CRUD (IMPLEMENTED) |
| PUT/DELETE | `/api/admin/notices/:id` | notice update/archive (soft) (IMPLEMENTED) |
| GET/POST | `/api/admin/events` | events CRUD (IMPLEMENTED) |
| PUT/DELETE | `/api/admin/events/:id` | event update/archive (IMPLEMENTED) |
| GET | `/api/admin/enquiries` | enquiries w/ filters + status counts (IMPLEMENTED) |
| PUT | `/api/admin/enquiries/:id` | status update (IMPLEMENTED) |
| GET | `/api/admin/media` | media assets list/search (IMPLEMENTED) |
| POST | `/api/admin/media` | upload to Cloudinary + record (IMPLEMENTED) |
| PUT/DELETE | `/api/admin/media/:id` | alt text / delete (reference-checked) (IMPLEMENTED) |
| GET | `/api/admin/search?q=` | global search (IMPLEMENTED) |
| GET | `/api/admin/system` | health/status for admin (IMPLEMENTED) |
| GET | `/api/admin/cms/versions?section=` | CMS version history journal (IMPLEMENTED) |
| POST | `/api/admin/cms/versions/:id/restore` | roll draft + live back to a snapshot (IMPLEMENTED) |
| GET | `/api/admin/site/cms-stats` | website dashboard stats (pending reviews, drafts, counts) (IMPLEMENTED) |
| GET/POST | `/api/admin/site/custom-pages` | custom pages list/create (IMPLEMENTED) |
| GET/PUT | `/api/admin/site/custom-pages/:id` | detail/metadata update (IMPLEMENTED) |
| PUT | `/api/admin/site/custom-pages/:id/files/*path` | save/upsert page file (type/size/path validated) (IMPLEMENTED) |
| DELETE | `/api/admin/site/custom-pages/:id/files/*path` | delete page file (local refs re-validated) (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/validate` | static validation report (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/publish` | publish (entry file present required) (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/unpublish` | unpublish (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/archive` | archive (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/duplicate` | duplicate page + files (IMPLEMENTED) |
| GET | `/api/admin/site/custom-pages/:id/versions` | version snapshots (IMPLEMENTED) |
| POST | `/api/admin/site/custom-pages/:id/versions/:version/restore` | restore snapshot as draft (IMPLEMENTED) |
| GET | `/api/admin/site/custom-pages/:id/preview-token` | HMAC preview token for drafts (15-min TTL) (IMPLEMENTED) |
| GET | `/api/admin/site/navigation` | navigation items (IMPLEMENTED) |
| POST | `/api/admin/site/navigation` | save full navigation tree (reserved/system protected) (IMPLEMENTED) |
| GET | `/api/admin/site/homepage-sections` | homepage sections (IMPLEMENTED) |
| PUT | `/api/admin/site/homepage-sections/:key` | update section config (IMPLEMENTED) |
| GET | `/api/admin/site/site-pages` | long-form pages (draft+publish) (IMPLEMENTED) |
| PUT | `/api/admin/site/site-pages/:slug` | upsert page content (JSON blocks) (IMPLEMENTED) |
| POST | `/api/admin/site/site-pages/:slug/publish` | publish page (IMPLEMENTED) |
| GET/POST/PUT/DELETE | `/api/admin/site/{admissions,fees,achievements,results,gallery,reviews,blog,faqs}` | generic CMS collection CRUD (list/create/update/archive) (IMPLEMENTED) |
| POST | `/api/admin/site/reviews/:id/moderate` | review approve/reject (IMPLEMENTED) |

## Non-route support
- SSE: `GET /api/notifications/stream` (all roles)
- Upload: `POST /api/upload` (materials), `POST /api/upload/media` (media library, admins), `POST /api/upload/submission` (student), `POST /api/admin/media` (alias)
- Static: `/api/uploads/*` (materials, attachment+nosniff; `/private/` blocked)

## SEO
- Public pages: `index,follow` with per-page title/description/OG (useSeo) + CMS `seo` section defaults
- Login + admin/teacher/student portals: `noindex,nofollow`
- `robots.txt`: allows `/`, courses, faculty, notices, events, contact; disallows `/api/ /login /auth/ /preview /admin /teacher /student`
- `sitemap.xml`: generated at build from `SITE_URL || VITE_SITE_URL` (placeholder until the env var is set)
- `index.html`: `index,follow`, canonical `/`, sitemap link

## Power-user tools
- Admin topbar `GlobalSearch` (debounced `/admin/search`)
- Admin command palette `Ctrl+K` (`CommandPalette`, quick actions + search)
- CSV export on Students/Teachers (`?all=true`)
