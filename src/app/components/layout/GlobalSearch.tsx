import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Users, UsersRound, GraduationCap, Megaphone, CalendarDays, Loader2 } from 'lucide-react';
import { useGlobalSearch, EMPTY_SEARCH_RESULTS } from './useGlobalSearch';
import { cn } from '../../lib/utils';

const GROUPS: { key: keyof typeof EMPTY_SEARCH_RESULTS; label: string; icon: React.ElementType; base: string }[] = [
  { key: 'students', label: 'Students', icon: Users, base: '/admin/students' },
  { key: 'teachers', label: 'Teachers', icon: UsersRound, base: '/admin/teachers' },
  { key: 'courses', label: 'Courses', icon: GraduationCap, base: '/admin/courses' },
  { key: 'notices', label: 'Notices', icon: Megaphone, base: '/admin/website/notices' },
  { key: 'events', label: 'Events', icon: CalendarDays, base: '/admin/website/events' },
];

/** Global admin search — searches students, teachers, courses, notices, events. */
export const GlobalSearch: React.FC = () => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { results, loading } = useGlobalSearch(q);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    navigate(href);
  };

  const total = Object.values(results).reduce((n, arr) => n + arr.length, 0);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); if (!e.target.value) setOpen(false); }}
        onFocus={() => { if (q.trim() || loading) setOpen(true); }}
        placeholder="Search students, teachers, courses, notices, events..."
        className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />}

      {open && (q.trim() || loading) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : total === 0 ? (
            <p className="p-4 text-sm text-gray-500">No matches for "{q}"</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {GROUPS.map((group) => {
                const items = results[group.key];
                if (!items.length) return null;
                return (
                  <div key={group.key} className="py-1">
                    <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <group.icon className="h-3 w-3" /> {group.label}
                    </p>
                    {items.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go(group.base)}
                        className={cn('w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center justify-between gap-3')}
                      >
                        <span className="text-sm font-medium text-gray-800 truncate">{item.name || item.title}</span>
                        <span className="text-xs text-gray-400 shrink-0">{item.status ?? item.email ?? ''}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};