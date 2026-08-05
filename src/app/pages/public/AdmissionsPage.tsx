import React, { useEffect, useState } from 'react';
import { CalendarDays, Phone, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatDate } from './publicData';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open now', cls: 'bg-green-100 text-green-700' },
  upcoming: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700' },
  closing_soon: { label: 'Closing soon', cls: 'bg-amber-100 text-amber-700' },
  closed: { label: 'Closed', cls: 'bg-gray-100 text-gray-600' },
};

export const AdmissionsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Admissions', description: 'Admission rounds, eligibility, documents and process.' });

  useEffect(() => {
    publicSite.admissions()
      .then((res) => setItems(res.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHero title="Admissions" subtitle="Everything you need to join our institute — eligibility, documents and the application process." badge="Admissions" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <LoadingCards count={3} />
        ) : items.length === 0 ? (
          <EmptyState title="Admissions coming soon" message="New admission rounds are being finalised. Please check back shortly or contact us." />
        ) : (
          <div className="space-y-8">
            {items.map((a) => {
              const status = STATUS_META[a.status] ?? STATUS_META.upcoming;
              return (
                <article key={a.id} className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{a.title || `Admissions ${a.session}`}</h2>
                      <span className={`text-xs font-semibold rounded-full px-3 py-1 ${status.cls}`}>{status.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Session {a.session}</p>
                    {a.subtitle && <p className="mt-3 text-gray-600">{a.subtitle}</p>}
                    {a.description && <p className="mt-2 text-gray-500 text-sm leading-relaxed">{a.description}</p>}

                    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
                      {a.openingDate && (
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-blue-600" /> Opens {formatDate(a.openingDate)}</span>
                      )}
                      {a.closingDate && (
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-red-500" /> Closes {formatDate(a.closingDate)}</span>
                      )}
                      {a.contactPhone && (
                        <a href={`tel:${a.contactPhone}`} className="inline-flex items-center gap-1.5 hover:text-blue-700"><Phone className="h-4 w-4 text-blue-600" /> {a.contactPhone}</a>
                      )}
                      {a.contactEmail && (
                        <a href={`mailto:${a.contactEmail}`} className="inline-flex items-center gap-1.5 hover:text-blue-700"><Mail className="h-4 w-4 text-blue-600" /> {a.contactEmail}</a>
                      )}
                    </div>

                    {a.eligibility && (
                      <div className="mt-6">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Eligibility</h3>
                        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{a.eligibility}</p>
                      </div>
                    )}

                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                      {Array.isArray(a.documents) && a.documents.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Required documents</h3>
                          <ul className="mt-2 space-y-1.5">
                            {a.documents.map((d: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(a.process) && a.process.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Admission process</h3>
                          <ol className="mt-2 space-y-1.5">
                            {a.process.map((step: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>

                    {a.instructions && <p className="mt-6 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">{a.instructions}</p>}

                    {a.ctaUrl && (
                      <a href={a.ctaUrl} target={a.ctaUrl.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                        {a.ctaLabel || 'Apply now'} <ArrowRight className="h-4 w-4" />
                      </a>
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
