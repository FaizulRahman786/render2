import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatDate } from './publicData';

const CATEGORIES = ['academic', 'olympiad', 'sports', 'cultural', 'other'];
const CATEGORY_LABEL: Record<string, string> = { academic: 'Academic', olympiad: 'Olympiad', sports: 'Sports', cultural: 'Cultural', other: 'Other' };
const LEVEL_ICON: Record<string, React.ElementType> = { international: Trophy, national: Trophy, state: Medal, district: Award, school: Award };

export const AchievementsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Achievements', description: 'Celebrating the achievements of our students and institute.' });

  useEffect(() => {
    setLoading(true);
    publicSite.achievements(category || undefined)
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  const filters = ['', ...CATEGORIES];

  const activeBtn = 'bg-primary text-primary-foreground shadow-sm';
  const inactiveBtn = 'bg-muted text-muted-foreground hover:bg-muted/80';

  return (
    <div>
      <PageHero title="Our Achievements" subtitle="Every milestone is a story of hard work, guidance and determination. Here are some we are proud of." badge="Achievements" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap gap-2 mb-8">
          {filters.map((c) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${category === c ? activeBtn : inactiveBtn}`}
            >
              {c === '' ? 'All' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingCards />
        ) : items.length === 0 ? (
          <EmptyState title="No achievements published yet" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => {
              const Icon = LEVEL_ICON[a.level] || Trophy;
              return (
                <article key={a.id} className="group rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col bg-card">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.title} loading="lazy" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <Icon className="h-12 w-12 text-primary/50" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                        {CATEGORY_LABEL[a.category] || a.category}
                      </span>
                      {a.level && <span className="text-[11px] font-semibold text-muted-foreground uppercase">{a.level}</span>}
                      {a.achievementDate && <span className="text-xs text-muted-foreground ml-auto">{formatDate(a.achievementDate)}</span>}
                    </div>
                    <h3 className="mt-2.5 font-bold text-foreground leading-snug">{a.title}</h3>
                    {a.description && <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed flex-1">{a.description}</p>}
                    {(a.studentName || a.awardOrganization) && (
                      <p className="mt-3 pt-3 border-t border-border text-sm">
                        {a.studentName && <span className="font-semibold text-foreground">{a.studentName}</span>}
                        {a.awardOrganization && <span className="text-muted-foreground"> · {a.awardOrganization}</span>}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};