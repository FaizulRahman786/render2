import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Plus, Pencil, Send, Loader2, Eye } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

interface SitePage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: any;
  coverImage: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

// Simple block-based content editor: paragraphs, headings, images and lists.
const BLOCK_HELP = `Content blocks (JSON):
[
  { "type": "heading", "text": "Our journey" },
  { "type": "paragraph", "text": "..." },
  { "type": "list", "items": ["...", "..."] },
  { "type": "image", "src": "https://...", "alt": "..." }
]`;

export const SitePagesPage: React.FC = () => {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [slug, setSlug] = useState('');
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getSitePages();
      if (res.success) setPages(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setSlug('');
    setForm({ title: '', subtitle: '', coverImage: '', content: '[]', status: 'draft' });
    setDialogOpen(true);
  };

  const openEdit = (p: SitePage) => {
    setEditing(p);
    setSlug(p.slug);
    setForm({
      title: p.title || '',
      subtitle: p.subtitle || '',
      coverImage: p.coverImage || '',
      content: p.content && Array.isArray(p.content) ? JSON.stringify(p.content, null, 2) : JSON.stringify(p.content || [], null, 2),
      status: p.status,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    let blocks: any[] = [];
    if (form.content.trim()) {
      try {
        blocks = JSON.parse(form.content);
        if (!Array.isArray(blocks)) throw new Error('must be an array');
      } catch {
        toast.error('Content must be valid JSON (an array of blocks)');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle || undefined,
        coverImage: form.coverImage || undefined,
        content: blocks,
        status: form.status,
      };
      const res = await api.admin.saveSitePage(slug, payload);
      toast.success(res?.message || 'Page saved');
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (p: SitePage) => {
    setBusySlug(p.slug);
    try {
      const res = await api.admin.publishSitePage(p.slug);
      toast.success(res?.message || 'Page published');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to publish');
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Long-form pages such as "Our Story". The page URL is /pages/{'{slug}'}.</p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New page
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : pages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No pages yet. Create "story" for the Our Story page.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pages.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 font-mono">/pages/{p.slug}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" title="Preview on public site" onClick={() => window.open(`/pages/${p.slug}`, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {p.status !== 'published' && (
                        <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700" disabled={busySlug === p.slug}
                          onClick={() => publish(p)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit page "${editing.slug}"` : 'New page'}</DialogTitle>
            <DialogDescription>Long-form content page rendered on the public website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <div>
                <Label>Slug *</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-'))} placeholder="story" />
                <p className="text-xs text-gray-400 mt-1">Public URL: /pages/{slug || '…'}</p>
              </div>
            )}
            <div>
              <Label>Title *</Label>
              <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div>
              <Label>Cover image URL</Label>
              <Input value={form.coverImage || ''} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Content blocks</Label>
              <Textarea rows={12} className="font-mono text-xs" value={form.content || ''} onChange={(e) => setForm({ ...form, content: e.target.value })} />
              <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{BLOCK_HELP}</p>
            </div>
            <div>
              <Label>Status</Label>
              <select
                value={form.status || 'draft'}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
