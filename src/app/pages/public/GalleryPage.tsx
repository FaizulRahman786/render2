import React, { useEffect, useState } from 'react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';

const CATEGORY_LABEL: Record<string, string> = {
  campus: 'Campus', classroom: 'Classroom', events: 'Events', sports: 'Sports', results: 'Results', other: 'Other',
};

export const GalleryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<any | null>(null);

  useSeo({ title: 'Gallery', description: 'A look inside our campus, classrooms and events.' });

  useEffect(() => {
    setLoading(true);
    publicSite.gallery(category || undefined)
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  const categories = [...new Set([...items.map((i) => i.category), ...Object.keys(CATEGORY_LABEL)])].filter(Boolean);

  return (
    <div>
      <PageHero title="Gallery" subtitle="Moments from our campus, classrooms and celebrations." badge="Gallery" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${category === '' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${category === c ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {CATEGORY_LABEL[c] || c}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingCards count={9} />
        ) : items.length === 0 ? (
          <EmptyState title="No photos yet" message="Photos will appear here soon." />
        ) : (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(item)}
                className="group relative overflow-hidden rounded-2xl aspect-square focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <img
                  src={item.imageUrl}
                  alt={item.altText || item.title || item.caption || 'Gallery photo'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {(item.caption || item.title) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-semibold truncate">{item.title || item.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute top-4 right-4 text-white/80 text-2xl p-2 hover:text-white" aria-label="Close">✕</button>
          <figure className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.altText || lightbox.title || ''} className="w-full max-h-[80vh] object-contain rounded-2xl" />
            {(lightbox.title || lightbox.caption) && (
              <figcaption className="text-center text-white/90 mt-3 text-sm">{lightbox.caption || lightbox.title}</figcaption>
            )}
          </figure>
        </div>
      )}
    </div>
  );
};
