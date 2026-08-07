import React, { useEffect, useMemo, useState } from 'react';
import { publicSite } from '../../lib/api';
import { useSeo } from '../../components/public/useSeo';
import { PageHero, LoadingCards, EmptyState } from './PageSections';
import { formatMoney } from './publicData';

interface FeeRow {
  id: string;
  session: string;
  classLevel: string;
  admissionFee: string | null;
  tuitionFee: string | null;
  monthlyFee: string | null;
  examFee: string | null;
  transportFee: string | null;
  otherCharges: string | null;
  totalFee: string | null;
  discountInfo: string | null;
  notes: string | null;
  paymentSchedule: string | null;
}

const FEE_COLUMNS: { key: keyof FeeRow; label: string }[] = [
  { key: 'admissionFee', label: 'Admission' },
  { key: 'tuitionFee', label: 'Tuition' },
  { key: 'monthlyFee', label: 'Monthly' },
  { key: 'examFee', label: 'Exam' },
  { key: 'transportFee', label: 'Transport' },
  { key: 'otherCharges', label: 'Other' },
];

export const FeesPage: React.FC = () => {
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'Fee Structure', description: 'Transparent fee structure for every class and program.' });

  useEffect(() => {
    publicSite.fees()
      .then((res) => setFees(res.data ?? []))
      .catch(() => setFees([]))
      .finally(() => setLoading(false));
  }, []);

  const sessions = useMemo(() => {
    const map = new Map<string, FeeRow[]>();
    fees.forEach((f) => {
      const list = map.get(f.session) ?? [];
      list.push(f);
      map.set(f.session, list);
    });
    return [...map.entries()].sort((a, b) => (a[0] > b[0] ? -1 : 1));
  }, [fees]);

  const anyRows = sessions.some(([, rows]) => rows.length > 0);

  return (
    <div>
      <PageHero title="Fee Structure" subtitle="Clear and transparent fees for every program. Scholarships and discounts are listed for eligible students." badge="Fees" />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <LoadingCards count={2} />
        ) : !anyRows ? (
          <EmptyState title="Fee details coming soon" message="The fee structure is being finalised for the next session." />
        ) : (
          <div className="space-y-10">
            {sessions.map(([session, rows]) => (
              <div key={session}>
                <h2 className="text-xl font-bold text-foreground mb-4">Session {session}</h2>
                <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="bg-muted text-left text-muted-foreground uppercase text-xs tracking-wider">
                        <th className="px-5 py-3.5 font-semibold">Class / program</th>
                        {FEE_COLUMNS.map((c) => <th key={c.key} className="px-4 py-3.5 font-semibold text-right">{c.label}</th>)}
                        <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((f) => (
                        <tr key={f.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-5 py-4 font-semibold text-foreground">{f.classLevel}</td>
                          {FEE_COLUMNS.map((c) => (
                            <td key={c.key} className="px-4 py-4 text-right text-muted-foreground">{formatMoney(f[c.key]) || '—'}</td>
                          ))}
                          <td className="px-5 py-4 text-right font-bold text-foreground">{formatMoney(f.totalFee) || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.some((r) => r.discountInfo || r.paymentSchedule || r.notes) && (
                  <div className="mt-4 space-y-2">
                    {rows.map((f) => (
                      <div key={f.id} className="text-sm">
                        {f.discountInfo && <p className="text-muted-foreground"><span className="font-semibold text-foreground">{f.classLevel}:</span> {f.discountInfo}</p>}
                        {f.paymentSchedule && <p className="text-muted-foreground mt-0.5">Payments: {f.paymentSchedule}</p>}
                        {f.notes && <p className="text-muted-foreground mt-0.5">{f.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};