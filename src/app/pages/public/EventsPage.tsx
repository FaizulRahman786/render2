import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { fetchPublicEvents } from './publicData';
import { useSeo } from '../../components/public/useSeo';

function monthDay(iso: string): { d: string; m: string } {
  const dt = new Date(iso);
  return { d: String(dt.getDate()), m: dt.toLocaleString('en-IN', { month: 'short' }) };
}

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Events | Coaching Institute', description: 'Workshops, seminars and events at our institute.' });

  useEffect(() => {
    fetchPublicEvents().then((e) => setEvents(e)).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);

  const upcoming = [...events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Events & Workshops</h1>
        <p className="text-gray-500 mt-3 text-lg">Stay engaged — join our seminars, workshops and activities.</p>
      </div>

      {loading ? (
        <div className="space-y-4 mt-10">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : upcoming.length === 0 ? (
        <p className="text-gray-500 mt-10">No events scheduled right now. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          {upcoming.map((e) => {
            const { d, m } = monthDay(e.eventDate || e.createdAt);
            return (
              <article key={e._id || e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all p-6 flex gap-5">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-md">
                  <span className="text-2xl font-extrabold leading-none">{d}</span>
                  <span className="text-[11px] uppercase tracking-widest mt-0.5">{m}</span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 text-lg">{e.name}</h2>
                  <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{e.description || ''}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-blue-500" />{new Date(e.eventDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {e.startTime && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-500" />{e.startTime}</span>}
                    {e.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500" />{e.location}</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};