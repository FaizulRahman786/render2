import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Facebook, Instagram, Twitter, Youtube, Linkedin, Mail, Phone, MapPin, Menu, X, GraduationCap, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPublicConfig, fetchPublicStatus, previewHref, Institute, NavItem } from './publicData';
import { useSeo, applySeoDefaults } from '../../components/public/useSeo';
import { ThemeToggle } from '../../components/ui/theme-toggle';
import { FloatingActionButton } from '../../components/shared/FloatingActionButton';

// FALLBACK_NAV is used only when the site profile is still loading or the
// /config fetch fails — the live menu is always what the admin configured.
const FALLBACK_NAV: NavItem[] = [
  { id: 'home', label: 'Home', href: '/', parentId: null, target: 'self', isSystem: true },
  { id: 'courses', label: 'Courses', href: '/courses', parentId: null, target: 'self', isSystem: true },
  { id: 'faculty', label: 'Faculty', href: '/faculty', parentId: null, target: 'self', isSystem: true },
  { id: 'notices', label: 'Notices', href: '/notices', parentId: null, target: 'self', isSystem: true },
  { id: 'events', label: 'Events', href: '/events', parentId: null, target: 'self', isSystem: true },
  { id: 'contact', label: 'Contact', href: '/contact', parentId: null, target: 'self', isSystem: true },
];

const SOCIAL_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    maintenance: boolean;
    institute: Institute | null;
    footer: Record<string, any> | null;
    social: Record<string, string>;
    whatsapp: { number: string; message: string } | null;
  }>({ maintenance: false, institute: null, footer: null, social: {}, whatsapp: null });
  const [nav, setNav] = useState<NavItem[]>(FALLBACK_NAV);
  const [menuOpen, setMenuOpen] = useState(false);

  useSeo({ title: status.institute ? `${status.institute.name}` : 'Coaching Institute', robots: 'index,follow' });

  useEffect(() => {
    fetchPublicStatus()
      .then((s) => {
        setStatus({ maintenance: s.maintenance, institute: s.institute, footer: null, social: s.social, whatsapp: null });
        const seo = s.seo || {};
        applySeoDefaults({
          siteName: s.institute?.name,
          description: seo.description || seo.defaultDescription,
          keywords: seo.keywords,
          ogImage: seo.ogImage || seo.image,
          canonical: seo.canonical,
        });
      })
      .catch(() => setStatus((st) => ({ ...st, maintenance: false, institute: st.institute, footer: null, social: {}, whatsapp: null })));

    // DB-driven navigation + WhatsApp widget (best-effort; static nav as fallback).
    fetchPublicConfig()
      .then((cfg) => {
        setNav(cfg.navigation.length ? cfg.navigation : FALLBACK_NAV);
        setStatus((st) => ({
          ...st,
          maintenance: cfg.maintenance,
          institute: cfg.institute ?? st.institute,
          footer: cfg.footer ?? null,
          social: cfg.social ?? {},
          whatsapp: cfg.whatsapp
            ? { number: cfg.whatsapp.number || '', message: cfg.whatsapp.message || '' }
            : null,
        }));
      })
      .catch(() => { /* keep fallback nav */ });
  }, []);

  const isAdmin = user?.role === 'admin';
  const showMaintenance = status.maintenance && !isAdmin;

  if (showMaintenance) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 text-3xl">🛠️</div>
        <h1 className="text-3xl font-bold text-foreground">We'll be right back</h1>
        <p className="text-muted-foreground mt-3 max-w-md">
          The website is currently under scheduled maintenance. Please check back soon.
        </p>
        <Link to="/login" className="mt-6 text-sm font-medium text-primary hover:underline">Staff sign in</Link>
      </div>
    );
  }

  const institute = status.institute;
  const name = institute?.name || 'Coaching Institute';
  const wa = status.whatsapp;

  // Only top-level (non-custom-directory) items in the main bar.
  const topLevel = nav.filter((n) => !n.parentId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to={previewHref('/')} className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground leading-tight">{name}</span>
            </Link>

            <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto max-w-2xl">
              {topLevel.map((item) => (
                <NavLink
                  key={item.id}
                  to={previewHref(item.href)}
                  target={item.target === '_blank' ? '_blank' : undefined}
                  rel={item.target === '_blank' ? 'noreferrer' : undefined}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent transition-colors whitespace-nowrap"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Staff Login
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent"
                aria-label="Toggle menu"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1 max-h-[70vh] overflow-y-auto">
            {topLevel.map((item) => (
              <Link
                key={item.id}
                to={previewHref(item.href)}
                target={item.target === '_blank' ? '_blank' : undefined}
                rel={item.target === '_blank' ? 'noreferrer' : undefined}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-accent hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-accent">
              Staff Login
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-muted text-muted-foreground mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">{name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(status.footer && (status.footer as any).about) || 'Empowering students to achieve academic excellence.'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              {topLevel.map((item) => (
                <li key={item.id}>
                  <Link to={previewHref(item.href)} className="hover:text-primary transition-colors">{item.label}</Link>
                </li>
              ))}
              <li><Link to="/login" className="hover:text-primary transition-colors">Staff Login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {institute?.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{institute.address}</span>
                </li>
              )}
              {institute?.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <a href={`tel:${institute.phone}`} className="hover:text-primary">{institute.phone}</a>
                </li>
              )}
              {institute?.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <a href={`mailto:${institute.email}`} className="hover:text-primary">{institute.email}</a>
                </li>
              )}
            </ul>
            {status.social && Object.keys(status.social).length > 0 && (
              <div className="flex items-center gap-3 mt-5">
                {Object.entries(status.social).map(([key, url]) => {
                  if (!url) return null;
                  const Icon = SOCIAL_ICONS[key] || Home;
                  return (
                    <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={key} className="w-8 h-8 rounded-full bg-muted hover:bg-primary flex items-center justify-center transition-colors">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {name}. All rights reserved.</span>
            <span>Powered by our learning platform</span>
          </div>
        </div>
      </footer>

      {/* Floating Action Button — Quick Actions Speed Dial */}
      <FloatingActionButton
        whatsappNumber={wa?.number}
        whatsappMessage={wa?.message}
        phone={status.institute?.phone}
        contactHref="/contact"
      />
    </div>
  );
};