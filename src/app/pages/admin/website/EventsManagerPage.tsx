import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, CalendarDays } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  bannerUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  name: '', description: '', eventDate: '', startTime: '', endTime: '', location: '', bannerUrl: '', status: 'draft',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-amber-100 text-amber-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const EventsManagerPage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getEvents({ page, limit: 20, search: search || undefined });
      if (res.success) {
        setEvents(res.data ?? []);
        setTotal(res.meta?.total ?? 0);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (ev: EventItem) => {
    setEditing(ev);
    setForm({
      name: ev.name,
      description: ev.description ?? '',
      eventDate: ev.eventDate.slice(0, 10),
      startTime: ev.startTime ?? '',
      endTime: ev.endTime ?? '',
      location: ev.location ?? '',
      bannerUrl: ev.bannerUrl ?? '',
      status: ev.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.eventDate) {
      toast.error('Name and event date are required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };
      payload.eventDate = new Date(payload.eventDate + 'T00:00:00').toISOString();
      for (const key of ['description', 'startTime', 'endTime', 'location', 'bannerUrl']) {
        if (!payload[key]) delete payload[key];
      }
      const res = editing
        ? await api.admin.updateEvent(editing.id, payload)
        : await api.admin.createEvent(payload);
      toast.success(res.message || 'Saved');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (ev: EventItem) => {
    if (!window.confirm(`Archive event "${ev.name}"?`)) return;
    try {
      const res = await api.admin.archiveEvent(ev.id);
      toast.success(res.message || 'Event archived');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to archive event');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search events..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Event
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No events found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {events.map((ev) => {
                const badge = STATUS_BADGE[ev.status] ?? STATUS_BADGE.draft;
                return (
                  <div key={ev.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex flex-col items-center justify-center">
                      <span className="text-sm font-extrabold leading-none">{new Date(ev.eventDate).getDate()}</span>
                      <span className="text-[10px] uppercase">{new Date(ev.eventDate).toLocaleString('en-IN', { month: 'short' })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{ev.name}</h3>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{ev.description || 'No description'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {fmt(ev.eventDate)}{ev.startTime ? ` · ${ev.startTime}` : ''}{ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ev)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => archive(ev)} title="Archive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} event{total !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle>
            <DialogDescription>Published events appear on the public website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Scholarship test seminar" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Event details..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publish</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start time</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <Label>End time</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Venue</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Main auditorium" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Event'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};