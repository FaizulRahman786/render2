import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';

export const FaqsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useSeo({ title: 'FAQs', description: 'Frequently asked questions about admissions, fees and daily life at our institute.' });

  useEffect(() => {
    publicSite.faqs()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(items.map((f) => f.category).filter(Boolean))];

  return (
    <div>
      <PageHero title="Frequently Asked Questions" subtitle="Quick answers to the questions we hear most often. Still curious? Contact us." badge="FAQs" />
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {loading ? (
          <LoadingCards count={5} />
        ) : items.length === 0 ? (
          <EmptyState title="No FAQs published yet" />
        ) : categories.length ? (
          <div className="space-y-8">
            {categories.map((cat) => {
              const faqs = items.filter((f) => f.category === cat);
              return (
                <div key={cat}>
                  <h2 className="text-lg font-bold text-foreground mb-3 capitalize">{cat}</h2>
                  <div className="space-y-3">
                    {faqs.map((f) => {
                      const id = f.id ?? f.question;
                      const isOpen = open === id;
                      return (
                        <div key={id} className={`rounded-2xl border transition-colors ${isOpen ? 'border-primary/30 bg-primary/5' : 'border-border bg-card shadow-sm'}`}>
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : id)}
                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                          >
                            <span className="font-semibold text-foreground">{f.question}</span>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                          </button>
                          {isOpen && <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((f) => {
              const id = f.id ?? f.question;
              const isOpen = open === id;
              return (
                <div key={id} className={`rounded-2xl border transition-colors ${isOpen ? 'border-primary/30 bg-primary/5' : 'border-border bg-card shadow-sm'}`}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-semibold text-foreground">{f.question}</span>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                  </button>
                  {isOpen && <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};