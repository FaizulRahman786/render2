import React, { useEffect, useState } from 'react';
import { Megaphone, FileText, ExternalLink } from 'lucide-react';
import { fetchPublicNotices, formatDate } from './publicData';
import { useSeo } from '../../components/public/useSeo';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Notices | Coaching Institute', description: 'Latest circulars, announcements and updates.' });

  useEffect(() => {
    fetchPublicNotices().then((n) => setNotices(n)).catch(() => setNotices([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Notices & Announcements</h1>
        <p className="text-gray-500 mt-3 text-lg">Stay updated with the latest circulars from the institute.</p>
      </div>

      {loading ? (
        <div className="space-y-4 mt-10">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : notices.length === 0 ? (
        <p className="text-gray-500 mt-10">No notices available right now.</p>
      ) : (
        <div className="space-y-4 mt-10">
          {notices.map((n) => (
            <article key={n._id || n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex gap-4">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-bold text-gray-900">{n.title}</h2>
                  <span className="text-xs font-medium text-gray-400 shrink-0">{formatDate(n.createdAt || n.date)}</span>
                </div>
                {n.description && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{n.description}</p>}
                {n.attachmentUrl && (
                  <a href={n.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                    <FileText className="h-4 w-4" /> Download attachment <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};