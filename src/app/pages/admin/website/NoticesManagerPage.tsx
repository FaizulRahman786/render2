import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Megaphone } from 'lucide-react';
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

interface Notice {
  id: string;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  audience: string;
  priority: string;
  status: string;
  publishAt: string | null;
  expireAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  title: '', description: '', attachmentUrl: '',
  audience: 'everyone', priority: 'normal', status: 'draft',
  publishAt: '', expireAt: '',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export const NoticesManagerPage: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getNotices({ page, limit: 20, search: search || undefined });
      if (res.success) {
        setNotices(res.data ?? []);
        setTotal(res.meta?.total ?? 0);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load notices');
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

  const openEdit = (n: Notice) => {
    setEditing(n);
    setForm({
      title: n.title,
      description: n.description ?? '',
      attachmentUrl: n.attachmentUrl ?? '',
      audience: n.audience,
      priority: n.priority,
      status: n.status,
      publishAt: n.publishAt ? n.publishAt.slice(0, 16) : '',
      expireAt: n.expireAt ? n.expireAt.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };
      if (payload.publishAt) payload.publishAt = new Date(payload.publishAt).toISOString();
      else delete payload.publishAt;
      if (payload.expireAt) payload.expireAt = new Date(payload.expireAt).toISOString();
      else delete payload.expireAt;
      if (!payload.attachmentUrl) delete payload.attachmentUrl;
      if (!payload.description) delete payload.description;

      const res = editing
        ? await api.admin.updateNotice(editing.id, payload)
        : await api.admin.createNotice(payload);
      toast.success(res.message || 'Saved');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save notice');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (n: Notice) => {
    if (!window.confirm(`Archive notice "${n.title}"?`)) return;
    try {
      const res = await api.admin.archiveNotice(n.id);
      toast.success(res.message || 'Notice archived');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to archive notice');
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
            placeholder="Search notices..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Notice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : notices.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Megaphone className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No notices found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notices.map((n) => {
                const badge = STATUS_BADGE[n.status] ?? STATUS_BADGE.draft;
                return (
                  <div key={n.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{n.title}</h3>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                        {n.priority === 'high' && <Badge className="bg-amber-100 text-amber-700">High priority</Badge>}
                        {n.priority === 'urgent' && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
                        {n.audience !== 'everyone' && <Badge className="bg-blue-100 text-blue-700">{n.audience}</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{n.description || 'No description'}</p>
                      <p className="text-xs text-gray-400 mt-1">Published {fmt(n.publishedAt ?? n.createdAt)} {n.expireAt ? `· Expires ${fmt(n.expireAt)}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(n)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => archive(n)} title="Archive">
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
          <span>{total} notice{total !== 1 ? 's' : ''}</span>
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
            <DialogTitle>{editing ? 'Edit Notice' : 'New Notice'}</DialogTitle>
            <DialogDescription>Notices with audience "everyone" appear on the public website once published.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Diwali holiday notice" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Full notice text..." />
            </div>
            <div>
              <Label>Attachment URL</Label>
              <Input value={form.attachmentUrl} onChange={(e) => setForm({ ...form, attachmentUrl: e.target.value })} placeholder="https://... (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Audience</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone (public)</SelectItem>
                    <SelectItem value="students">Students</SelectItem>
                    <SelectItem value="teachers">Teachers</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Publish now</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expires on</Label>
                <Input type="datetime-local" value={form.expireAt} onChange={(e) => setForm({ ...form, expireAt: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Notice'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};