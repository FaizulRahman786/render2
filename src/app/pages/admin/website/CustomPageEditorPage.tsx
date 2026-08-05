import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Send, Archive, Copy, FilePlus2, Trash2, ShieldCheck, Monitor, Tablet, Smartphone, History, Loader2 } from 'lucide-react';
import { api, publicSite } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';

interface PageFile {
  path: string;
  content: string;
  kind: string;
  size: number;
}

interface PageMeta {
  id: string;
  name: string;
  slug: string;
  pageType: string;
  entryFile: string;
  status: string;
  version: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  robots: string;
  navigationLabel: string | null;
  navigationVisibility: boolean;
  navigationPosition: number;
  ackRisks: boolean;
}

interface Version {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
};

export const CustomPageEditorPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [files, setFiles] = useState<PageFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [versions, setVersions] = useState<Version[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const [newFile, setNewFile] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getCustomPage(id);
      if (!res.success) throw new Error(res.error || 'Failed to load page');
      setMeta(res.data);
      const fileList: PageFile[] = res.data.files ?? [];
      setFiles(fileList);
      const first = fileList.find((f: PageFile) => f.path === res.data.entryFile) || fileList[0];
      setActivePath(first?.path ?? null);
      setCode(first?.content ?? '');
      setDirty(false);
      const v = await api.admin.getCustomPageVersions(id);
      if (v?.success) setVersions(v.data ?? []);
      const t = await api.admin.getCustomPagePreviewToken(id);
      if (t?.success) setPreviewToken(t.data?.token ?? null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load page');
      navigate('/admin/website/custom-pages');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const activeFile = useMemo(() => files.find((f) => f.path === activePath) ?? null, [files, activePath]);

  const selectFile = (path: string) => {
    if (dirty && !window.confirm('Discard unsaved changes to the current file?')) return;
    setActivePath(path);
    setCode(files.find((f) => f.path === path)?.content ?? '');
    setDirty(false);
  };

  const saveFile = async () => {
    if (!activePath) return;
    setSaving(true);
    try {
      const res = await api.admin.saveCustomPageFile(id, activePath, code);
      toast.success(res?.message || 'File saved');
      setFiles((fs) => fs.map((f) => (f.path === activePath ? { ...f, content: code, size: new Blob([code]).size } : f)));
      setDirty(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const addFile = async () => {
    const path = newFile.trim().replace(/\\/g, '/').replace(/^\.\//, '');
    if (!path) return;
    if (files.some((f) => f.path === path)) { toast.error('File already exists'); return; }
    try {
      await api.admin.saveCustomPageFile(id, path, '');
      setNewFile('');
      await load();
      setActivePath(path);
      setCode('');
      toast.success('File created');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create file');
    }
  };

  const deleteFile = async () => {
    if (!activePath) return;
    if (!window.confirm(`Delete "${activePath}"?`)) return;
    if (activePath === meta?.entryFile) { toast.error('Delete the entry file first by choosing another entry file in the settings'); return; }
    try {
      await api.admin.deleteCustomPageFile(id, activePath);
      toast.success('File deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete file');
    }
  };

  const saveMeta = async () => {
    if (!meta) return;
    setSaving(true);
    try {
      const res = await api.admin.updateCustomPage(id, {
        name: meta.name,
        description: undefined,
        entryFile: meta.entryFile,
        seoTitle: meta.seoTitle || undefined,
        seoDescription: meta.seoDescription || undefined,
        ogImage: meta.ogImage || undefined,
        robots: meta.robots,
        navigationLabel: meta.navigationLabel || undefined,
        navigationVisibility: meta.navigationVisibility,
        navigationPosition: meta.navigationPosition,
        ackRisks: meta.ackRisks,
      });
      toast.success(res?.message || 'Settings saved');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const runValidate = async () => {
    setBusy(true);
    try {
      const res = await api.admin.validateCustomPage(id);
      if (res.success) { setReport(res.data); setReportOpen(true); }
    } catch (e: any) {
      toast.error(e?.message || 'Validation failed');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const res = await api.admin.publishCustomPage(id);
      toast.success(res?.message || 'Published');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to publish');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      const res = await api.admin.unpublishCustomPage(id);
      toast.success(res?.message || 'Unpublished');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to unpublish');
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!window.confirm('Archive this page?')) return;
    setBusy(true);
    try {
      await api.admin.archiveCustomPage(id);
      toast.success('Archived');
      navigate('/admin/website/custom-pages');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to archive');
    } finally {
      setBusy(false);
    }
  };

  const restore = async (version: number) => {
    if (!window.confirm(`Restore version ${version}? The current files will be replaced (as a new draft).`)) return;
    setBusy(true);
    try {
      const res = await api.admin.restoreCustomPageVersion(id, version);
      toast.success(res?.message || 'Version restored');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to restore version');
    } finally {
      setBusy(false);
    }
  };

  const previewSrc = useMemo(() => {
    if (!meta || !previewToken) return '';
    const entry = activePath && files.find((f) => f.path === activePath) ? activePath : meta.entryFile;
    const isPublished = meta.status === 'published';
    const draft = !isPublished;
    return publicSite.customFileUrl(meta.slug, entry, draft, previewToken);
  }, [meta, previewToken, activePath, files]);

  const DEVICE_WIDTHS: Record<string, string> = { desktop: 'w-full', tablet: 'w-[768px] max-w-full', mobile: 'w-[390px] max-w-full' };

  if (loading || !meta) {
    return <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;
  }

  const badge = STATUS_BADGE[meta.status] ?? STATUS_BADGE.draft;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/website/custom-pages')} title="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 truncate">{meta.name}</h2>
              <Badge className={badge.cls}>{badge.label}</Badge>
              <Badge className="bg-gray-100 text-gray-600">v{meta.version}</Badge>
            </div>
            <p className="text-sm text-gray-500 font-mono">/{meta.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen((o) => !o)}>
            <Monitor className="h-4 w-4 mr-1" /> {previewOpen ? 'Hide preview' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={runValidate} disabled={busy}>
            <ShieldCheck className="h-4 w-4 mr-1" /> Validate
          </Button>
          {meta.status === 'published' ? (
            <Button variant="outline" size="sm" className="text-amber-600" onClick={unpublish} disabled={busy}>
              <Archive className="h-4 w-4 mr-1" /> Unpublish
            </Button>
          ) : (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={publish} disabled={busy}>
              <Send className="h-4 w-4 mr-1" /> Publish
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-red-500" onClick={archive} disabled={busy}>Archive</Button>
        </div>
      </div>

      {meta.status === 'draft' && !meta.ackRisks && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Acknowledge the risks of custom code in the settings (right panel) before publishing.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">
        {/* Files */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 pt-1 mb-2">Files</p>
            <div className="space-y-1">
              {files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => selectFile(f.path)}
                  className={cn(
                    'w-full text-left px-2.5 py-2 rounded-lg text-sm font-mono truncate transition-colors',
                    activePath === f.path ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {f.path}
                  {f.path === meta.entryFile && <span className="ml-1 text-[10px] text-green-600 font-bold">ENTRY</span>}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex gap-1.5">
                <Input value={newFile} onChange={(e) => setNewFile(e.target.value)} placeholder="new-file.html" className="h-8 font-mono text-xs" />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addFile} title="Add file">
                  <FilePlus2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {activeFile && activePath !== meta.entryFile && (
                <Button variant="ghost" size="sm" className="mt-2 h-8 w-full text-red-500 text-xs" onClick={deleteFile}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete {activePath}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <span className="text-sm font-mono text-gray-600 truncate">{activePath}</span>
              <Button size="sm" onClick={saveFile} disabled={saving || !dirty}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {dirty ? 'Save file' : 'Saved'}
              </Button>
            </div>
            <Textarea
              value={code}
              onChange={(e) => { setCode(e.target.value); setDirty(true); }}
              spellCheck={false}
              className="border-0 rounded-none font-mono text-[13px] leading-relaxed min-h-[560px] resize-y focus-visible:ring-0 p-4"
            />
          </CardContent>
        </Card>

        {/* Settings + versions */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Page settings</p>
              <div>
                <Label>Name</Label>
                <Input className="mt-1" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
              </div>
              <div>
                <Label>Entry file</Label>
                <select
                  value={meta.entryFile}
                  onChange={(e) => setMeta({ ...meta, entryFile: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {files.map((f) => <option key={f.path} value={f.path}>{f.path}</option>)}
                </select>
              </div>
              <div>
                <Label>SEO title</Label>
                <Input className="mt-1" value={meta.seoTitle || ''} onChange={(e) => setMeta({ ...meta, seoTitle: e.target.value })} />
              </div>
              <div>
                <Label>SEO description</Label>
                <Textarea className="mt-1" rows={2} value={meta.seoDescription || ''} onChange={(e) => setMeta({ ...meta, seoDescription: e.target.value })} />
              </div>
              <div>
                <Label>Share image URL</Label>
                <Input className="mt-1" value={meta.ogImage || ''} onChange={(e) => setMeta({ ...meta, ogImage: e.target.value })} />
              </div>
              <div>
                <Label>Search engines</Label>
                <select
                  value={meta.robots}
                  onChange={(e) => setMeta({ ...meta, robots: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="index,follow">Index this page</option>
                  <option value="noindex,nofollow">Hide from search engines</option>
                </select>
              </div>
              <div>
                <Label>Menu label</Label>
                <Input className="mt-1" value={meta.navigationLabel || ''} onChange={(e) => setMeta({ ...meta, navigationLabel: e.target.value })} placeholder="Shows in the site menu" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Show in menu</Label>
                <Switch checked={meta.navigationVisibility} onCheckedChange={(v) => setMeta({ ...meta, navigationVisibility: v })} />
              </div>
              <div>
                <Label>Menu position</Label>
                <Input type="number" className="mt-1" value={meta.navigationPosition} onChange={(e) => setMeta({ ...meta, navigationPosition: parseInt(e.target.value || '0') })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">I understand the risks</Label>
                  <p className="text-xs text-gray-400">Custom code runs in a sandbox; I am responsible for published content</p>
                </div>
                <Switch checked={meta.ackRisks} onCheckedChange={(v) => setMeta({ ...meta, ackRisks: v })} />
              </div>
              <Button className="w-full" onClick={saveMeta} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> Save settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 flex items-center gap-1 mb-2">
                <History className="h-3.5 w-3.5" /> Versions
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {versions.length === 0 && <p className="text-xs text-gray-400">No versions yet — saving a file creates one.</p>}
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-700">v{v.version} {v.note ? `— ${v.note}` : ''}</p>
                      <p className="text-gray-400">{v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => restore(v.version)} disabled={busy}>Restore</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview pane */}
      {previewOpen && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Preview — {meta.status === 'published' ? 'published version (live)' : 'your draft (only you can see this)'}
              </p>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                {[{ k: 'desktop', i: Monitor }, { k: 'tablet', i: Tablet }, { k: 'mobile', i: Smartphone }].map((d) => (
                  <button key={d.k} type="button" onClick={() => setDevice(d.k as any)}
                    className={cn('p-1.5 rounded-md', device === d.k ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                    <d.i className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-center bg-gray-100 rounded-xl p-4">
              {previewSrc ? (
                <iframe
                  key={previewSrc}
                  src={previewSrc}
                  title="Custom page preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className={cn('h-[640px] bg-white rounded-lg border border-gray-200', DEVICE_WIDTHS[device])}
                />
              ) : (
                <p className="text-sm text-gray-400 p-8">Preview token unavailable.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation report */}
      <Card className={reportOpen ? '' : 'hidden'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Validation report</p>
            <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>Close</Button>
          </div>
          {report && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Files</p>
                <p className="text-sm text-gray-600">
                  {report.files.html} HTML · {report.files.css} CSS · {report.files.js} JS · {report.files.images} images · {report.files.assets} assets
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p className={report.checks.viewport ? 'text-green-600' : 'text-amber-600'}>✓ Viewport meta: {report.checks.viewport ? 'present' : 'MISSING'}</p>
                  <p className={report.checks.title ? 'text-green-600' : 'text-amber-600'}>✓ Page title: {report.checks.title ? 'present' : 'MISSING'}</p>
                  <p>Inline scripts: {report.checks.inlineScripts}</p>
                  <p>JavaScript: {report.checks.hasJavaScript ? 'yes' : 'none'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Warnings</p>
                {report.warnings.length === 0 ? (
                  <p className="text-sm text-green-600">No warnings. Looks good.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-amber-700 list-disc pl-4">
                    {report.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
