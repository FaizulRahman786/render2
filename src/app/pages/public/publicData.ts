import { publicSite, api } from '../../lib/api';

// ── Preview-mode helpers ────────────────────────────────────────────────────
// The admin Site Preview loads the REAL public pages inside an iframe via the
// /preview route. With ?draft=1&section=home the page renders CMS DRAFT content
// (admin-only endpoint) so edits can be reviewed before publishing — published
// content is never touched.

export function isPreviewMode(): boolean {
  return window.location.pathname === '/preview';
}

export function draftSection(): string | null {
  if (!isPreviewMode()) return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('draft') !== '1') return null;
  return params.get('section');
}

export interface Institute {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
}

export interface PublicHome {
  maintenance: boolean;
  institute: Institute;
  home: Record<string, any>;
  seo: Record<string, any>;
  footer: Record<string, any>;
  social: Record<string, string>;
  whatsapp: { number: string; message: string };
  homepageMode: string;
  customHomepageSlug: string;
  stats: { students: number; teachers: number; courses: number };
  courses: any[];
  events: any[];
  notices: any[];
}

export async function fetchPublicHome(): Promise<PublicHome> {
  const res = await publicSite.home();
  const data = res.data as PublicHome;

  const section = draftSection();
  if (section && ['home', 'seo', 'social', 'footer'].includes(section)) {
    // Merge the admin's saved draft for the section being previewed.
    // A failed draft fetch (e.g. non-admin opening /preview) falls back to
    // live content instead of breaking the page.
    try {
      const preview = await api.admin.getCmsPreview(section);
      if (preview?.success && preview.data?.draft && typeof preview.data.draft === 'object') {
        if (section === 'home') data.home = preview.data.draft;
        else if (section === 'seo') data.seo = preview.data.draft;
        else if (section === 'social') data.social = preview.data.draft;
        else if (section === 'footer') data.footer = preview.data.draft;
      }
    } catch {
      // Draft preview is admin-only; fall through to live content.
    }
  }
  return data;
}

export async function fetchPublicCourses(): Promise<any[]> {
  const res = await publicSite.courses();
  return res.data ?? [];
}

export async function fetchPublicFaculty(): Promise<any[]> {
  const res = await publicSite.faculty();
  return res.data ?? [];
}

export async function fetchPublicNotices(): Promise<any[]> {
  const res = await publicSite.notices();
  return res.data ?? [];
}

export async function fetchPublicEvents(): Promise<any[]> {
  const res = await publicSite.events();
  return res.data ?? [];
}

export async function fetchPublicStatus(): Promise<{
  maintenance: boolean;
  institute: Institute;
  social: Record<string, string>;
  seo: Record<string, any>;
}> {
  const res = await publicSite.status();
  const section = draftSection();
  if (section === 'social') {
    try {
      const preview = await api.admin.getCmsPreview('social');
      if (preview?.success && preview.data?.draft && typeof preview.data.draft === 'object') {
        return { ...res.data, social: preview.data.draft };
      }
    } catch {
      // Draft fetch failure in preview must never break the live page.
    }
  }
  return res.data;
}

// ── Site config: navigation + WhatsApp widget + homepage mode ───────────────
export interface NavItem {
  id: string;
  label: string;
  href: string;
  parentId: string | null;
  target: string;
  isSystem: boolean;
  custom?: boolean;
}

export interface SiteConfig {
  maintenance: boolean;
  institute: Institute;
  social: Record<string, string>;
  seo: Record<string, any>;
  footer: Record<string, any>;
  whatsapp: { number: string; message: string };
  homepageMode: string;
  customHomepageSlug: string;
  navigation: NavItem[];
}

export async function fetchPublicConfig(): Promise<SiteConfig> {
  const res = await publicSite.config();
  const data = res.data as SiteConfig;
  if (!Array.isArray(data.navigation)) data.navigation = [];
  return data;
}

// Maps a public URL path to a preview page key (used inside the admin preview
// iframe where every link must stay within /preview).
const PREVIEW_PAGE_FOR_PATH: Record<string, string> = {
  '/': 'home', '/courses': 'courses', '/faculty': 'faculty', '/notices': 'notices',
  '/events': 'events', '/contact': 'contact', '/admissions': 'admissions',
  '/fees': 'fees', '/achievements': 'achievements', '/results': 'results',
  '/gallery': 'gallery', '/reviews': 'reviews', '/blog': 'blog', '/faqs': 'faqs',
  '/story': 'story', '/pages/story': 'story',
};

export function previewHref(href: string): string {
  if (!isPreviewMode()) return href;
  const clean = href.split('?')[0];
  if (PREVIEW_PAGE_FOR_PATH[clean] !== undefined) return `/preview?page=${PREVIEW_PAGE_FOR_PATH[clean]}`;
  return href;
}

// ── Formatting helpers (public site) ────────────────────────────────────────
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  const m = String(t).match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
  if (!m) return String(t);
  let h = parseInt(m[1], 10);
  const min = m[2];
  let suffix = (m[3] || '').toLowerCase();
  if (!suffix) {
    suffix = h >= 12 ? 'pm' : 'am';
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
  }
  return `${h}:${min} ${suffix}`;
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return '₹' + Number(value).toLocaleString('en-IN');
}