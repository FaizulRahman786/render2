import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState, RenderBlocks } from './PageSections';

export const StoryPage: React.FC = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [page, setPage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Our Story', description: 'The story, mission and people behind our institute.' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await publicSite.pages();
        const list = (res?.data ?? []) as any[];
        if (!active) return;
        setPages(list);
        if (list.length) {
          const detail = await publicSite.pageBySlug(list[0].slug);
          if (active) setPage(detail?.data ?? null);
        }
      } catch {
        if (active) setPages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const select = async (slug: string) => {
    setLoading(true);
    try {
      const detail = await publicSite.pageBySlug(slug);
      setPage(detail?.data ?? null);
    } catch {
      setPage(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !page) {
    return <div className="max-w-4xl mx-auto px-4 py-16"><LoadingCards count={2} /></div>;
  }

  if (pages.length === 0 && !page) {
    return <div className="max-w-4xl mx-auto px-4 py-16"><EmptyState title="Story coming soon" /></div>;
  }

  return (
    <div>
      <PageHero title="Our Story" subtitle="Who we are, what we believe, and how we teach." badge="Story" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
              {pages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => select(p.slug)}
                  className={`shrink-0 text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${page?.slug === p.slug ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {p.title || p.slug}
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            {page ? (
              <>
                <h1 className="text-3xl font-extrabold text-foreground">{page.title || page.slug}</h1>
                {page.subtitle && <p className="mt-2 text-muted-foreground">{page.subtitle}</p>}
                {page.coverImage && <img src={page.coverImage} alt={page.title || ''} className="mt-6 w-full h-64 object-cover rounded-3xl" />}
                <div className="mt-8 space-y-8">
                  <RenderBlocks blocks={page.content} />
                </div>
              </>
            ) : pages.length > 0 ? null : (
              <EmptyState title="Story coming soon" />
            )}
            <Link to="/contact" className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Talk to us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};