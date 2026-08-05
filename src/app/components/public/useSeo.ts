import { useEffect } from 'react';

export interface SeoOptions {
  title: string;
  description?: string;
  keywords?: string;
  robots?: 'index,follow' | 'noindex,nofollow';
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  siteName?: string;
}

function setMeta(name: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name.startsWith('og:') || name.startsWith('twitter:') ? 'property' : 'name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Per-route SEO: document title, meta description, keywords, robots, canonical
 * URL and OpenGraph/Twitter tags. Protected areas call it with robots noindex
 * (the public site is indexable).
 */
export function useSeo({ title, description, keywords, robots = 'index,follow', canonical, ogTitle, ogDescription, ogImage, siteName }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    setMeta('description', description ?? '');
    setMeta('keywords', keywords ?? '');
    setMeta('robots', robots);
    setCanonical(canonical ?? (typeof window !== 'undefined' ? window.location.href : ''));
    setMeta('og:title', ogTitle ?? title);
    setMeta('og:description', ogDescription ?? description ?? '');
    setMeta('og:image', ogImage ?? '');
    setMeta('og:type', 'website');
    setMeta('og:site_name', siteName ?? '');
    setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', ogTitle ?? title);
    setMeta('twitter:description', ogDescription ?? description ?? '');
    setMeta('twitter:image', ogImage ?? '');
  }, [title, description, keywords, robots, canonical, ogTitle, ogDescription, ogImage, siteName]);
}

/** Apply site-wide CMS defaults for meta tags a page has NOT explicitly set. */
export function applySeoDefaults(defaults: { siteName?: string; description?: string; keywords?: string; ogImage?: string; canonical?: string }) {
  const { siteName, description, keywords, ogImage, canonical } = defaults;
  const currentDesc = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') || '';
  const currentOgDesc = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.getAttribute('content') || '';
  const currentOgImage = document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.getAttribute('content') || '';
  const currentOgSite = document.head.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')?.getAttribute('content') || '';

  if (!currentDesc && description) setMeta('description', description);
  if (!currentOgDesc && description) setMeta('og:description', description);
  if (!currentOgImage && ogImage) setMeta('og:image', ogImage);
  if (!currentOgSite && siteName) setMeta('og:site_name', siteName);
  setMeta('og:type', 'website');
  setMeta('twitter:card', ogImage ? 'summary_large_image' : 'summary');
  if (keywords) setMeta('keywords', keywords);
  setCanonical(canonical ?? (typeof window !== 'undefined' ? window.location.href : ''));
}