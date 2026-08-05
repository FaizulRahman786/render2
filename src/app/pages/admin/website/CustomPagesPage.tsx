import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Globe, Plus, Pencil, Send, Archive, Copy, Loader2, Eye, FileCode2, ShieldAlert } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface CustomPage {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  entryFile: string;
  status: string;
  version: number;
  navigationLabel: string | null;
  navigationVisibility: boolean;
  robots: string;
  fileCount?: number;
  updatedAt: string | null;
  publishedAt: string | null;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

export const CustomPagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', pageType: 'html', description: '' });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getCustomPages();
      if (res.success) setPages(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load custom pages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

  const create = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = await api.admin.createCustomPage({
        name: form.name,
        slug: form.slug || undefined,
        pageType: form.pageType,
        description: form.description || undefined,
      });
      toast.success(res?.message || 'Custom page created');
      setDialogOpen(false);
      setForm({ name: '', slug: '', pageType: 'html', description: '' });
      if (res.data?.id) navigate(`/admin/website/custom-pages/${res.data.id}`);
      else await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create page');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (page: CustomPage, action: () => Promise<any>, msg: string) => {
    setBusyId(page.id);
    try {
      const res = await action();
      toast.success(res?.message || msg);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Build complete HTML/CSS/JS pages with full control. Pages render in an isolated sandbox — your code can never touch the admin app or its data.
        </p>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New custom page
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : pages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Globe className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No custom pages yet. Create one to publish a fully custom page.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {pages.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.draft;
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{p.name}</h3>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                        {p.navigationVisibility && <Badge className="bg-blue-50 text-blue-700">In menu</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 font-mono">/{p.slug} · {p.fileCount ?? 0} file{(p.fileCount ?? 0) === 1 ? '' : 's'} · v{p.version}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.status === 'published' && (
                        <Button variant="ghost" size="sm" className="h-8" title="Open on public site" onClick={() => window.open(`/${p.slug}`, '_blank')}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                      )}
                      {p.status === 'published' ? (
                        <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:text-amber-700" disabled={busyId === p.id}
                          onClick={() => runAction(p, () => api.admin.unpublishCustomPage(p.id), 'Unpublished')}>
                          <Archive className="h-3.5 w-3.5 mr-1" /> Unpublish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700" disabled={busyId === p.id}
                          onClick={() => runAction(p, () => api.admin.publishCustomPage(p.id), 'Published')}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Duplicate as draft" disabled={busyId === p.id}
                        onClick={() => runAction(p, () => api.admin.duplicateCustomPage(p.id), 'Duplicated')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/website/custom-pages/${p.id}`)} title="Open editor">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" disabled={busyId === p.id}
                        onClick={() => {
                          if (!window.confirm(`Archive "${p.name}"?`)) return;
                          runAction(p, () => api.admin.archiveCustomPage(p.id), 'Archived');
                        }} title="Archive">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Custom page code runs in an isolated sandbox with no access to the application, its data or your admin session.
          Code is validated and versioned, but you are responsible for the content you publish. Draft pages are only visible to you.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New custom page</DialogTitle>
            <DialogDescription>A blank canvas of HTML, CSS and JavaScript — served at its own URL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const n = e.target.value;
                  setForm((f) => ({ ...f, name: n, slug: f.slug === '' || slugify(f.name) === f.slug ? slugify(n) : f.slug }));
                }}
                placeholder="e.g. Scholarship landing page"
              />
            </div>
            <div>
              <Label>URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-mono">/</span>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="auto from name" className="font-mono" />
              </div>
              <p className="text-xs text-gray-400 mt-1">Letters, numbers and dashes. Some routes are reserved.</p>
            </div>
            <div>
              <Label>Template</Label>
              <select
                value={form.pageType}
                onChange={(e) => setForm({ ...form, pageType: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="html">Single HTML file</option>
                <option value="split">Split files (index.html, styles.css, script.js)</option>
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal note about this page" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCode2 className="h-4 w-4 mr-2" />}
              Create page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
