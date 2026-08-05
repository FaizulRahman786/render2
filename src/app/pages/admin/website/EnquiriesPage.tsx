import React, { useCallback, useEffect, useState } from 'react';
import { Search, Inbox, Mail, Phone, CheckCircle2, Archive, Eye } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'bg-blue-100 text-blue-700' },
  read: { label: 'Read', cls: 'bg-gray-100 text-gray-600' },
  resolved: { label: 'Resolved', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'archived', label: 'Archived' },
];

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [open, setOpen] = useState<Enquiry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getEnquiries({ page, limit: 20, search: search || undefined, status: filter || undefined });
      if (res.success) {
        setEnquiries(res.data ?? []);
        setTotal(res.meta?.total ?? 0);
        if (res.statusCounts) setCounts(res.statusCounts);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    try {
      const res = await api.admin.updateEnquiryStatus(id, status);
      toast.success(res.message || 'Updated');
      setOpen((cur) => (cur && cur.id === id ? { ...cur, status } : cur));
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5' +
                (filter === f.key ? ' bg-blue-600 text-white' : ' bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')
              }
            >
              {f.label}
              {(f.key === '' ? total : counts[f.key] ?? 0) > 0 && <span className="text-xs opacity-80">({f.key === '' ? total : counts[f.key] ?? 0})</span>}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, subject..."
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Inbox className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No enquiries{filter ? ` with status "${filter}"` : ''}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {enquiries.map((enq) => {
                const badge = STATUS_BADGE[enq.status] ?? STATUS_BADGE.new;
                return (
                  <button
                    key={enq.id}
                    type="button"
                    onClick={() => { setOpen(enq); if (enq.status === 'new') setStatus(enq.id, 'read'); }}
                    className="w-full text-left flex items-start gap-4 p-4 hover:bg-gray-50"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center">
                      {enq.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{enq.name}</span>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                        <span className="text-xs text-gray-400 ml-auto">{fmt(enq.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-blue-600 mt-0.5 truncate">{enq.subject}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{enq.message}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} enquiry{total !== 1 ? 'ies' : 'y'}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        {open && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {open.name}
                <Badge className={(STATUS_BADGE[open.status] ?? STATUS_BADGE.new).cls}>{open.status}</Badge>
              </DialogTitle>
              <DialogDescription>{fmt(open.createdAt)} · {open.subject}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-600">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-blue-500" /><a href={`mailto:${open.email}`} className="hover:underline break-all">{open.email}</a></span>
                {open.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-blue-500" /><a href={`tel:${open.phone}`} className="hover:underline">{open.phone}</a></span>}
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 leading-relaxed text-gray-700">{open.message}</div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              {open.status === 'new' && (
                <Button variant="outline" onClick={() => setStatus(open.id, 'read')}>
                  <Eye className="h-4 w-4 mr-2" /> Mark read
                </Button>
              )}
              <Button variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100" onClick={() => setStatus(open.id, 'resolved')}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
              </Button>
              {open.status !== 'archived' && (
                <Button variant="outline" className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100" onClick={() => setStatus(open.id, 'archived')}>
                  <Archive className="h-4 w-4 mr-2" /> Archive
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};