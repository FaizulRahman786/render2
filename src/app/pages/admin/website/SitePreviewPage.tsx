import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, Eye, PenLine, Globe, GraduationCap, UserRound, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '../../../lib/utils';

type Device = 'desktop' | 'tablet' | 'mobile';
type Mode = 'live' | 'draft';
type Portal = 'public' | 'student' | 'teacher' | 'admin';

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: 'w-full max-w-[1100px]',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

const DEVICE_HEIGHTS: Record<Device, string> = {
  desktop: 'h-[calc(100vh-260px)] min-h-[560px]',
  tablet: 'h-[calc(100vh-260px)] min-h-[560px]',
  mobile: 'h-[calc(100vh-260px)] min-h-[560px]',
};

// Draft merge sections supported by the backend preview endpoint.
const SECTION_PAGES: Record<string, string> = {
  home: 'home',
  courses: 'courses',
  faculty: 'faculty',
  notices: 'notices',
  events: 'events',
  contact: 'contact',
  admissions: 'admissions',
  fees: 'fees',
  achievements: 'achievements',
  results: 'results',
  gallery: 'gallery',
  reviews: 'reviews',
  blog: 'blog',
  faqs: 'faqs',
  story: 'story',
  seo: 'home',
  social: 'home',
  footer: 'home',
};

const PORTAL_ROOTS: Record<Exclude<Portal, 'public'>, string> = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
};

const PORTAL_META: { key: Portal; label: string; icon: React.ElementType }[] = [
  { key: 'public', label: 'Public site', icon: Globe },
  { key: 'student', label: 'Student portal', icon: GraduationCap },
  { key: 'teacher', label: 'Teacher portal', icon: UserRound },
  { key: 'admin', label: 'Admin panel', icon: ShieldCheck },
];

export const SitePreviewPage: React.FC = () => {
  const [device, setDevice] = useState<Device>('desktop');
  const [mode, setMode] = useState<Mode>('live');
  const [portal, setPortal] = useState<Portal>('public');
  const [section, setSection] = useState('home');

  const page = SECTION_PAGES[section] || 'home';
  const isPublic = portal === 'public';
  const src = isPublic
    ? mode === 'draft'
      ? `/preview?page=${page}&section=${section}&draft=1`
      : `/preview?page=${page}`
    : PORTAL_ROOTS[portal as Exclude<Portal, 'public'>];

  const devices: { key: Device; label: string; icon: React.ElementType }[] = [
    { key: 'desktop', label: 'Desktop', icon: Monitor },
    { key: 'tablet', label: 'Tablet', icon: Tablet },
    { key: 'mobile', label: 'Mobile', icon: Smartphone },
  ];

  const sections = Object.keys(SECTION_PAGES);

  return (
    <div className="space-y-4">
      {/* Preview toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            {PORTAL_META.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPortal(p.key)}
                title={p.label}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5',
                  portal === p.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                <p.icon className="h-4 w-4" /> <span className="hidden lg:inline">{p.label}</span>
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
            {devices.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDevice(d.key)}
                title={d.label}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  device === d.key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                <d.icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          {isPublic && (
            <>
              <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setMode('live')}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5',
                    mode === 'live' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100')}
                >
                  <Eye className="h-4 w-4" /> Live
                </button>
                <button
                  type="button"
                  onClick={() => setMode('draft')}
                  className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5',
                    mode === 'draft' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100')}
                >
                  <PenLine className="h-4 w-4" /> Draft
                </button>
              </div>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {sections.map((s) => (
                  <option key={s} value={s}>{s === 'seo' || s === 'social' || s === 'footer' ? `Settings: ${s}` : `Page: ${s}`}</option>
                ))}
              </select>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 max-w-xs">
          {!isPublic
            ? 'Live view of the role portal (authenticated as this admin).'
            : mode === 'draft'
              ? `Showing the saved draft of "${section}". Nothing is live until you publish.`
              : 'Showing exactly what visitors see. Logged-in admins bypass maintenance mode.'}
        </p>
      </div>

      {/* Device frame + iframe */}
      <div className="flex justify-center">
        <div
          className={cn(
            'bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden transition-all duration-300',
            DEVICE_WIDTHS[device],
          )}
        >
          <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center gap-2 px-4">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-gray-400 font-mono truncate flex-1">{src}</span>
            <a href={src} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700" title="Open in new tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <iframe
            key={src}
            src={src}
            title="Site preview"
            className={cn('w-full bg-white', DEVICE_HEIGHTS[device])}
          />
        </div>
      </div>
    </div>
  );
};