import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export interface SearchGroup {
  key: 'students' | 'teachers' | 'courses' | 'notices' | 'events';
  label: string;
  base: string;
}

export interface SearchResults {
  students: { id: string; name: string; email: string; status: string }[];
  teachers: { id: string; name: string; email: string; status: string }[];
  courses: { id: string; name: string; status: string }[];
  notices: { id: string; title: string; status: string }[];
  events: { id: string; name: string; status: string }[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = { students: [], teachers: [], courses: [], notices: [], events: [] };

/** Debounced server-backed global search (students/teachers/courses/notices/events). */
export function useGlobalSearch(q: string): { results: SearchResults; loading: boolean } {
  const [results, setResults] = useState<SearchResults>(EMPTY_SEARCH_RESULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = q.trim();
    const t = setTimeout(async () => {
      if (!trimmed) {
        setResults(EMPTY_SEARCH_RESULTS);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.admin.search(trimmed);
        setResults(res?.data ?? EMPTY_SEARCH_RESULTS);
      } catch {
        setResults(EMPTY_SEARCH_RESULTS);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return { results, loading };
}