import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatDate } from './publicData';

export const BlogPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Blog', description: 'News, updates and stories from our institute.' });

  useEffect(() => {
    publicSite.blog()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const [featured, ...rest] = items;

  return (
    <div>
      <PageHero title="Blog" subtitle="News, updates and stories from our institute." badge="Blog" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <LoadingCards count={4} />
        ) : items.length === 0 ? (
          <EmptyState title="No posts yet" message="We publish updates here soon." />
        ) : (
          <>
            {featured && (
              <Link to={`/blog/${featured.slug}`} className="group grid gap-0 lg:grid-cols-2 rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow mb-10">
                <div className="h-64 lg:h-auto bg-gradient-to-br from-primary/10 to-primary/5">
                  {featured.coverImage ? (
                    <img src={featured.coverImage} alt={featured.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-primary/20 text-5xl font-black">.</div>
                  )}
                </div>
                <div className="p-7 lg:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {featured.publishedAt && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(featured.publishedAt)}</span>}
                  </div>
                  <h2 className="mt-3 text-2xl font-extrabold text-foreground group-hover:text-primary transition-colors leading-snug">{featured.title}</h2>
                  {featured.excerpt && <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{featured.excerpt}</p>}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all">
                    Read post <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            )}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="h-40 bg-gradient-to-br from-primary/10 to-primary/5">
                    {post.coverImage && <img src={post.coverImage} alt={post.title} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-xs text-muted-foreground">{formatDate(post.publishedAt ?? post.createdAt)}</p>
                    <h3 className="mt-1.5 font-bold text-foreground leading-snug group-hover:text-primary transition-colors">{post.title}</h3>
                    {post.excerpt && <p className="mt-1.5 text-sm text-muted-foreground flex-1 line-clamp-2">{post.excerpt}</p>}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-semibold group-hover:gap-3 transition-all">
                      Read post <span aria-hidden>→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};