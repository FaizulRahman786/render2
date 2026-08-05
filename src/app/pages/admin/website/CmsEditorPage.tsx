import React, { useEffect, useState, useCallback } from 'react';
import { Save, Send, Eye, RefreshCcw, FileJson, AlertTriangle, CheckCircle2, History, Undo2, FileClock } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

const SECTIONS = [
  { key: 'home', label: 'Homepage', hint: 'Hero headline, announcement bar, "why choose us" cards' },
  { key: 'seo', label: 'SEO', hint: 'meta title, description, keywords' },
  { key: 'social', label: 'Social Links', hint: 'facebook / instagram / youtube / twitter / linkedin URLs' },
  { key: 'footer', label: 'Footer', hint: 'footer text and about blurb' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

interface SectionData {
  live: Record<string, any>;
  draft: Record<string, any>;
}

interface CmsVersion {
  id: string;
  section: string;
  action: 'save' | 'publish' | 'restore';
  createdBy: string | null;
  createdAt: string;
  content: Record<string, any>;
}

const ACTION_STYLES: Record<CmsVersion['action'], string> = {
  save: 'bg-blue-50 text-blue-700 border-blue-200',
  publish: 'bg-green-50 text-green-700 border-green-200',
  restore: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const CmsEditorPage: React.FC = () => {
  const [section, setSection] = useState<SectionKey>('home');
  const [data, setData] = useState<Record<string, SectionData>>({});
  const [text, setText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState<CmsVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await api.admin.getCmsVersions(section);
      if (res.success) setVersions(res.data);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [section]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getCms();
      if (res.success) {
        setData(res.data);
        const d = res.data[section];
        setText(JSON.stringify(d?.draft ?? {}, null, 2));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const current: SectionData | undefined = data[section];
  const draftDirty = current ? JSON.stringify(current.draft) !== JSON.stringify(current.live) : false;

  const validate = (): Record<string, any> | null => {
    try {
      const parsed = JSON.parse(text);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Content must be a JSON object { "key": value, ... }');
        return null;
      }
      setJsonError('');
      return parsed as Record<string, any>;
    } catch {
      setJsonError('Invalid JSON — fix the syntax before saving.');
      return null;
    }
  };

  const saveDraft = async () => {
    const content = validate();
    if (!content) return;
    setSaving(true);
    try {
      const res = await api.admin.saveCmsDraft(section, content);
      toast.success(res.message || 'Draft saved');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!current?.draft) {
      toast.error('No draft to publish');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.admin.publishCms(section);
      toast.success(res.message || 'Published — the public site now shows this content');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const resetDraft = () => {
    if (!current) return;
    setText(JSON.stringify(current.live ?? {}, null, 2));
    setJsonError('');
  };

  const restoreVersion = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await api.admin.restoreCmsVersion(id, section);
      toast.success(res.message || 'Version restored — draft and live content rolled back');
      setConfirmRestoreId(null);
      await Promise.all([load(), loadVersions()]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to restore version');
    } finally {
      setRestoringId(null);
    }
  };

  const openPreview = () => {
    window.open(`/preview?page=home&section=${section}&draft=1`, '_blank');
  };

  const emptyHint = SECTIONS.find((s) => s.key === section)?.hint;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Section list */}
      <div className="space-y-2 lg:col-span-1">
        {SECTIONS.map((s) => {
          const d = data[s.key];
          const dirty = d ? JSON.stringify(d.draft) !== JSON.stringify(d.live) : false;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                section === s.key
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{s.label}</span>
                {dirty && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <AlertTriangle className="h-3 w-3" /> draft
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{s.hint}</p>
            </button>
          );
        })}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 text-xs text-gray-500 leading-relaxed">
            <p className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" /> Saving creates a <b>draft</b>. Publishing copies the draft to the live site. Visitors only ever see published content.</p>
          </CardContent>
        </Card>
      </div>

      {/* Editor */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-blue-600" />
                {SECTIONS.find((s) => s.key === section)?.label} — JSON content
              </CardTitle>
              <CardDescription className="mt-1">
                {emptyHint}. Edit the draft below, then save and publish.
              </CardDescription>
            </div>
            {draftDirty && current && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" /> Unpublished changes
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  spellCheck={false}
                  className={cn(
                    'w-full h-72 md:h-80 font-mono text-sm rounded-xl border p-4 resize-y focus:outline-none transition-colors',
                    jsonError ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30',
                  )}
                />
                {jsonError && <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />{jsonError}</p>}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button onClick={saveDraft} disabled={saving || !!jsonError}>
                    <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={publish}
                    disabled={publishing || !draftDirty}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" /> {publishing ? 'Publishing...' : 'Publish to Live Site'}
                  </Button>
                  <Button variant="outline" onClick={openPreview}>
                    <Eye className="h-4 w-4 mr-2" /> Preview Draft
                  </Button>
                  <Button variant="ghost" onClick={resetDraft}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Reset to live
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                Version History — {SECTIONS.find((s) => s.key === section)?.label}
              </CardTitle>
              <CardDescription className="mt-1">
                Every save, publish and restore is snapshotted. Restore rolls the section's draft <b>and</b> live content back to the snapshot.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={loadVersions} disabled={versionsLoading}>
              <RefreshCcw className={cn('h-4 w-4 mr-1', versionsLoading && 'animate-spin')} /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {versionsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-400">
                <FileClock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                No saved versions for this section yet. Save a draft or publish to start the history.
              </div>
            ) : (
              <ul className="space-y-2">
                {versions.map((v) => {
                  const keyCount = Object.keys(v.content ?? {}).length;
                  const isConfirming = confirmRestoreId === v.id;
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-3 p-3 border rounded-xl bg-gray-50/60">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-1', ACTION_STYLES[v.action] ?? ACTION_STYLES.save)}>
                        {v.action}
                      </span>
                      <div className="flex-1 min-w-40">
                        <p className="text-sm font-medium text-gray-800">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : 'Unknown time'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {v.createdBy ? `by ${v.createdBy}` : 'Unknown editor'} · {keyCount} field{keyCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-purple-700">Restore this version?</span>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={restoringId === v.id} onClick={() => restoreVersion(v.id)}>
                            <Undo2 className="h-4 w-4 mr-1" /> {restoringId === v.id ? 'Restoring...' : 'Confirm'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmRestoreId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setConfirmRestoreId(v.id)}>
                          <Undo2 className="h-4 w-4 mr-1" /> Restore
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};