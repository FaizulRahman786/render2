import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, CornerDownLeft, Command, ArrowRight } from 'lucide-react';
import { useGlobalSearch, EMPTY_SEARCH_RESULTS } from './useGlobalSearch';
import { cn } from '../../lib/utils';

interface QuickAction {
  label: string;
  href: string;
  keywords: string[];
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Dashboard', href: '/admin', keywords: ['home', 'dashboard', 'overview'] },
  { label: 'Students', href: '/admin/students', keywords: ['student', 'users', 'pupil'] },
  { label: 'Teachers', href: '/admin/teachers', keywords: ['teacher', 'staff', 'faculty'] },
  { label: 'Courses', href: '/admin/courses', keywords: ['course', 'subject'] },
  { label: 'Batches', href: '/admin/batches', keywords: ['batch', 'group', 'class'] },
  { label: 'Materials', href: '/admin/materials', keywords: ['material', 'notes', 'file', 'upload'] },
  { label: 'Tests', href: '/admin/tests', keywords: ['test', 'exam', 'assessment'] },
  { label: 'Fees', href: '/admin/fees', keywords: ['fee', 'payment', 'invoice', 'money'] },
  { label: 'Live Classes', href: '/admin/live-classes', keywords: ['live', 'class', 'meeting', 'video'] },
  { label: 'Broadcast', href: '/admin/broadcast', keywords: ['broadcast', 'announce', 'message'] },
  { label: 'Website', href: '/admin/website', keywords: ['website', 'cms', 'site'] },
  { label: 'Notices', href: '/admin/website/notices', keywords: ['notice', 'notification'] },
  { label: 'Events', href: '/admin/website/events', keywords: ['event', 'calendar'] },
  { label: 'Enquiries', href: '/admin/website/enquiries', keywords: ['enquiry', 'lead', 'contact'] },
  { label: 'Media Library', href: '/admin/website/media', keywords: ['media', 'image', 'photo', 'asset'] },
  { label: 'Audit Logs', href: '/admin/audit-logs', keywords: ['audit', 'log', 'history'] },
  { label: 'System Health', href: '/admin/system', keywords: ['system', 'health', 'status', 'db'] },
  { label: 'Settings', href: '/admin/settings', keywords: ['settings', 'config', 'preferences'] },
];

const SEARCH_GROUPS: { key: keyof typeof EMPTY_SEARCH_RESULTS; label: string; base: string }[] = [
  { key: 'students', label: 'Students', base: '/admin/students' },
  { key: 'teachers', label: 'Teachers', base: '/admin/teachers' },
  { key: 'courses', label: 'Courses', base: '/admin/courses' },
  { key: 'notices', label: 'Notices', base: '/admin/website/notices' },
  { key: 'events', label: 'Events', base: '/admin/website/events' },
];

interface FlatItem {
  kind: 'action' | 'result';
  label: string;
  hint: string;
  href: string;
}

/** Global Ctrl/Cmd+K command palette for the admin portal. */
export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { results, loading } = useGlobalSearch(open ? q : '');
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) setQ('');
          return next;
        });
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const items: FlatItem[] = useMemo(() => {
    const list: FlatItem[] = [];
    const needle = q.trim().toLowerCase();
    if (needle) {
      QUICK_ACTIONS.filter(
        (a) => a.label.toLowerCase().includes(needle) || a.keywords.some((k) => k.includes(needle))
      ).forEach((a) => list.push({ kind: 'action', label: a.label, hint: 'Go to', href: a.href }));
      SEARCH_GROUPS.forEach((g) => {
        (results[g.key] as any[]).forEach((item) =>
          list.push({ kind: 'result', label: item.name || item.title, hint: g.label, href: g.base })
        );
      });
    } else {
      QUICK_ACTIONS.forEach((a) => list.push({ kind: 'action', label: a.label, hint: 'Go to', href: a.href }));
    }
    return list.slice(0, 20);
  }, [q, results]);

  useEffect(() => {
    if (active > items.length - 1) setActive(Math.max(items.length - 1, 0));
  }, [items, active]);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    navigate(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      go(items[active].href);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to search pages or records..."
            className="flex-1 py-4 text-sm outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-md">
            <Command className="h-3 w-3" /> K
          </kbd>
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
          {loading && q.trim() ? (
            <p className="p-4 text-center text-sm text-gray-400 animate-pulse">Searching…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">
              No results for <span className="font-medium">"{q}"</span>
            </p>
          ) : (
            <ul>
              {items.map((item, i) => (
                <li key={`${item.kind}-${item.label}-${i}`}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item.href)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left',
                      i === active ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', item.kind === 'action' ? 'bg-blue-500' : 'bg-emerald-500')} />
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{item.kind === 'action' ? item.hint : item.hint}</span>
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-blue-500" />}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-gray-400">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
};