import React, { useEffect, useState } from 'react';
import { Award, Star } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatDate } from './publicData';

export const ResultsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Results', description: 'Board exam results and top performers — shared with consent.' });

  useEffect(() => {
    publicSite.results()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = new Map<string, any[]>();
  items.forEach((r) => {
    const key = r.exam || r.session || 'Results';
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  });

  return (
    <div>
      <PageHero title="Results" subtitle="Celebrating consistent academic excellence. Results are published only with the student's consent." badge="Results" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <LoadingCards count={4} />
        ) : items.length === 0 ? (
          <EmptyState title="Results coming soon" message="We publish results here after every major examination." />
        ) : (
          <div className="space-y-10">
            {[...groups.entries()].map(([exam, rows]) => (
              <div key={exam}>
                <h2 className="text-xl font-bold text-foreground mb-4">{exam}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((r) => (
                    <article key={r.id} className="rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow bg-card">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0">
                          <Award className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-foreground truncate">{r.studentName}</h3>
                          <p className="text-xs text-muted-foreground">{r.classLevel || ''} {r.session ? `· ${r.session}` : ''}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {r.rank && (
                          <div className="rounded-xl bg-primary/10 py-2">
                            <p className="text-lg font-extrabold text-primary leading-none">{r.rank}</p>
                            <p className="text-[10px] uppercase tracking-wide text-primary/80 mt-1">Rank</p>
                          </div>
                        )}
                        {r.percentage !== null && r.percentage !== undefined && (
                          <div className="rounded-xl bg-green-50 py-2">
                            <p className="text-lg font-extrabold text-green-700 leading-none">{r.percentage}%</p>
                            <p className="text-[10px] uppercase tracking-wide text-green-500 mt-1">Score</p>
                          </div>
                        )}
                        {r.grade && (
                          <div className="rounded-xl bg-violet-50 py-2">
                            <p className="text-lg font-extrabold text-violet-700 leading-none">{r.grade}</p>
                            <p className="text-[10px] uppercase tracking-wide text-violet-500 mt-1">Grade</p>
                          </div>
                        )}
                      </div>
                      {r.description && <p className="mt-3 text-sm text-muted-foreground">{r.description}</p>}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {r.resultType === 'top_performer' ? 'Top performer' : 'Achievement'}</span>
                        {r.displayDate && <span>{formatDate(r.displayDate)}</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};