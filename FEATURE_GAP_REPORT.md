# FEATURE_GAP_REPORT.md

> Produced by the MASTER LOOP production-readiness pass (2026-08-05). Status of every feature surfaced during discovery — **CLOSED** = gap implemented/verified this pass, **OPEN** = remaining work with a concrete remedy.

## Closed this pass

| # | Gap | Resolution | Verify |
|---|---|---|---|
| 1 | Public site inaccessible to search engines (`robots.txt Disallow: /`) | `public/robots.txt` rewritten: allow public paths, disallow `/api/ /login /auth/ /preview /admin /teacher /student` + Sitemap line | build emits generated sitemap; check rendered robots after deploy |
| 2 | `index.html` `noindex,nofollow` on the whole app | Changed to `index, follow`; added canonical `/` + sitemap `<link>`; protected portals still `noindex` via `useSeo` | inspect `dist/index.html` |
| 3 | No `sitemap.xml` | New `scripts/generate-sitemap.cjs` (PUBLIC_ROUTES) wired as first step of `npm run build`; patches robots.txt line; placeholder until `SITE_URL`/`VITE_SITE_URL` set | `npm run build` → `dist/sitemap.xml` |
| 4 | CMS `seo` never applied to live pages | `useSeo` extended (keywords/canonical/og/twitter + `applySeoDefaults`); `/public/status` exposes `cms.seo.live`; `PublicLayout` (defaults) + `HomePage` (full override) consume it | browse `/` → view source |
| 5 | Admin has no search or command palette | Shared `useGlobalSearch` hook; `GlobalSearch` rebuilt on it; new `CommandPalette` (Ctrl+K) with quick actions + search, arrow/enter/esc keyboard nav | Ctrl+K in admin |
| 6 | No maintenance mode | Reuses existing `maintenanceMode` setting; Settings gains a Website & Public Site card (danger-zone toggle + Website Tools link) | toggle → visit `/` logged-out |
| 7 | CMS content have no undo/rollback | `cms_versions` journal (migration `0008`); every save/publish journaled; `GET/POST /admin/cms/versions[/:id/restore]`; CmsEditorPage History panel with in-place confirm | save → publish → restore in editor |
| 8 | No CSV export for Students/Teachers | `?all=true` support in `/admin/students` + `/admin/teachers`; `lib/csv.ts` download helper; export buttons respect current search/status filters | click Export |
| 9 | Dead demo scaffolding reachable on disk | Removed `src/app/apps/*`, root `apps/{admin,teacher,student}/`, `packages/shared-ui`, `packages/utilities` (zero imports verified); kept live `packages/shared-types` | `npx tsc --noEmit` clean |
| 10 | Architecture/inventory docs described a pre-website world | `PROJECT_ARCHITECTURE.md`, `FEATURE_INVENTORY.md`, `SITE_MAP.md` refreshed to as-built state (CMS/media/public site/admin tools/27 tables/0000–0008) | read them |

## Open gaps (with remedies)

| # | Gap | Severity | Remedy |
|---|---|---|---|
| 11 | `dist` bundle single chunk ~1.08 MB (gzip 285 KB) | LOW | Route-level code splitting: `React.lazy` per portal/route; `manualChunks` for react/vendor. Verify with `web-perf`/Lighthouse after. |
| 12 | Dead deps still in `package.json` (MUI, emotion, jsonwebtoken, bcryptjs, ws, pg, cmdk…) | LOW | Prune + `pnpm install` in a clean CI job; low risk offline, so deferred (documented, not executed). |
| 13 | `SITE_URL` env not set → sitemap is a placeholder | LOW | Set `SITE_URL` (frontend) / `VITE_SITE_URL` (build) to the public origin; rebuild. |
| 14 | No forgot/reset password UI | MEDIUM | Supabase `resetPasswordForEmail` + `UpdatePassword` route; confirm email = Supabase Managed provider. |
| 15 | Teacher/student writes not audit-logged | MEDIUM | Extend `logAudit` call sites into teacher/student routers (batch-scoped ops). |
| 16 | No CI workflow | MEDIUM | Add GH Actions: `tsc FE + BE`, `vitest`, `vite build` on PR. |
| 17 | No bundle analysis / Lighthouse CI | LOW | Wire `vite-bundle-visualizer` + Lighthouse CI into CI. |
| 18 | Duplicate legacy types (`types/index.ts`, `types/models.ts`, unused `types/supabase.ts`) | LOW | Consolidate onto `types/auth.ts`; remove duplicates after a grep. |
| 19 | SSE notifications drop on multi-instance deploys | MEDIUM | Swap in-memory `wsManager` for a Redis/DB pub-sub adapter if scaling horizontally. |
| 20 | No automated tests for the new website/CMS/SEO surface | MEDIUM | Add vitest + Playwright: CMS draft→publish→restore flow, search, CSV download, robots/sitemap output, maintenance mode. |

## Verification run this pass
- `npx tsc --noEmit -p tsconfig.json` — PASS
- `npx tsc --noEmit -p apps/backend/tsconfig.json` — PASS
- `npm run build` (sitemap → vite → precache) — PASS (8-entry precache manifest; sitemap placeholder warning expected until SITE_URL set)