import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Send, Archive, Star, StarOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { cn } from '../../../lib/utils';

// ── Generic CMS content manager ─────────────────────────────────────────────
// One config-driven CRUD screen powers every structured content collection:
// admissions, fee structures, achievements, public results, gallery, blog
// posts, FAQs and reviews. All entities share the same draft → publish →
// archive lifecycle (soft delete; records are never hard-deleted).

export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'list' | 'json';
  options?: { value: string; label: string }[];
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  colSpan?: 1 | 2;
  serialize?: (v: any) => any;
  deserialize?: (row: any) => any;
}

export interface EntityConfig {
  key: string;
  title: string;
  singular: string;
  description: string;
  icon: React.ElementType;
  api: {
    list: (p: Record<string, any>) => Promise<any>;
    create: (d: any) => Promise<any>;
    update: (id: string, d: any) => Promise<any>;
    publish?: (id: string) => Promise<any>;
    unpublish?: (id: string) => Promise<any>;
    archive: (id: string) => Promise<any>;
  };
  fields: FieldDef[];
  searchPlaceholder?: string;
  statusField?: string;
  statusOptions?: { value: string; label: string }[];
  listTitle?: (row: any) => string;
  listSubtitle?: (row: any) => string;
  listMeta?: (row: any) => string[];
  emptyIcon?: React.ElementType;
  extraActions?: (row: any, reload: () => void) => { label: string; icon?: React.ElementType; className?: string; onClick: () => void }[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  published: { label: 'Published', cls: 'bg-green-100 text-green-700' },
  archived: { label: 'Archived', cls: 'bg-red-100 text-red-600' },
  pending: { label: 'Pending review', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600' },
};

const TITLE_KEYS = ['title', 'name', 'question', 'session', 'classLevel'];
const SUBTITLE_KEYS = ['subtitle', 'description', 'excerpt', 'review', 'answer', 'caption', 'instructions'];
const META_KEYS = ['category', 'rating', 'achievementDate', 'displayDate', 'eventDate', 'studentName', 'exam', 'rank', 'percentage', 'grade', 'session', 'level', 'author', 'awardOrganization', 'publishAt', 'updatedAt', 'createdAt'];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function titleOf(row: any, cfg: EntityConfig): string {
  if (cfg.listTitle) return cfg.listTitle(row);
  for (const k of TITLE_KEYS) {
    if (row && row[k] !== null && row[k] !== undefined && String(row[k]).trim()) {
      if (k === 'classLevel' && row.session) return `${row.session} · ${row.classLevel}`;
      return String(row[k]);
    }
  }
  return '(Untitled)';
}

function subtitleOf(row: any, cfg: EntityConfig): string {
  if (cfg.listSubtitle) return cfg.listSubtitle(row);
  for (const k of SUBTITLE_KEYS) {
    if (row && row[k] !== null && row[k] !== undefined && String(row[k]).trim()) return String(row[k]);
  }
  return '';
}

function metaOf(row: any, cfg: EntityConfig): string[] {
  if (cfg.listMeta) return cfg.listMeta(row);
  const parts: string[] = [];
  for (const k of META_KEYS) {
    if (row && row[k] !== null && row[k] !== undefined && String(row[k]).trim()) {
      if (k === 'rating') { parts.push(`${row[k]}★`); continue; }
      if (k.endsWith('Date') || k === 'updatedAt' || k === 'createdAt') { parts.push(fmtDate(row[k])); continue; }
      parts.push(String(row[k]));
    }
  }
  return parts.slice(0, 3);
}

export const SiteContentManager: React.FC<{ config: EntityConfig }> = ({ config }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusField = config.statusField || 'cmsStatus';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await config.api.list({ page, limit: 20, search: search || undefined, status: statusFilter || undefined });
      if (res?.success) {
        setRows(res.data ?? []);
        setTotal(res.meta?.total ?? 0);
      }
    } catch (e: any) {
      toast.error(e?.message || `Failed to load ${config.title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [config, page, search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const emptyForm = useMemo(() => {
    const f: Record<string, any> = {};
    config.fields.forEach((fd) => {
      f[fd.key] = fd.type === 'checkbox' ? false : fd.type === 'list' || fd.type === 'json' ? [] : '';
    });
    return f;
  }, [config]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    const f: Record<string, any> = {};
    config.fields.forEach((fd) => {
      if (fd.deserialize) {
        f[fd.key] = fd.deserialize(row);
      } else if (fd.type === 'list') {
        const v = row[fd.key];
        f[fd.key] = Array.isArray(v) ? v.join('\n') : v ? String(v) : '';
      } else if (fd.type === 'json') {
        f[fd.key] = row[fd.key] !== null && row[fd.key] !== undefined ? JSON.stringify(row[fd.key], null, 2) : '';
      } else if (fd.type === 'date') {
        f[fd.key] = row[fd.key] ? String(row[fd.key]).slice(0, 10) : '';
      } else {
        f[fd.key] = row[fd.key] ?? (fd.type === 'checkbox' ? false : '');
      }
    });
    setForm(f);
    setDialogOpen(true);
  };

  const save = async () => {
    for (const fd of config.fields) {
      if (fd.required) {
        const v = form[fd.key];
        if (fd.type === 'list') {
          if (!Array.isArray(v) || v.length === 0) {
            if (typeof v === 'string' && !v.trim()) { toast.error(`${fd.label} is required`); return; }
          }
        } else if (v === '' || v === null || v === undefined) {
          toast.error(`${fd.label} is required`);
          return;
        }
      }
    }

    const payload: Record<string, any> = {};
    config.fields.forEach((fd) => {
      let v = form[fd.key];
      if (fd.type === 'list') {
        v = typeof v === 'string' ? v.split('\n').map((s: string) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];
      } else if (fd.type === 'json') {
        if (typeof v === 'string' && v.trim()) {
          try {
            v = JSON.parse(v);
          } catch {
            toast.error(`${fd.label} must be valid JSON`);
            return;
          }
        } else {
          v = null;
        }
      } else if (fd.type === 'number') {
        v = v === '' || v === null || v === undefined ? null : Number(v);
      } else if (fd.type === 'date') {
        v = v ? new Date(String(v) + 'T00:00:00').toISOString() : null;
      }
      if (fd.serialize) v = fd.serialize(v);
      if (fd.type !== 'checkbox' && (v === '' || v === null || v === undefined)) v = null;
      payload[fd.key] = v;
    });

    setSaving(true);
    try {
      const res = editing
        ? await config.api.update(editing.id, payload)
        : await config.api.create(payload);
      toast.success(res?.message || (editing ? 'Updated' : 'Created'));
      setDialogOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: () => Promise<any>, id: string | null, successMsg: string) => {
    if (id) setBusyId(id);
    try {
      const res = await action();
      toast.success(res?.message || successMsg);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleFeatured = (row: any) => {
    if (!('featured' in row)) return;
    runAction(
      () => config.api.update(row.id, { featured: !row.featured }),
      row.id,
      row.featured ? 'Removed from featured' : 'Marked as featured',
    );
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const EmptyIcon = config.emptyIcon || config.icon;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={config.searchPlaceholder || `Search ${config.title.toLowerCase()}...`}
              className="pl-9"
            />
          </div>
          {config.statusOptions && (
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                {config.statusOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New {config.singular}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <EmptyIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No {config.title.toLowerCase()} found{search ? ' for your search' : ''}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map((row) => {
                const badge = STATUS_BADGE[row[statusField]] ?? STATUS_BADGE.draft;
                const meta = metaOf(row, config);
                const featured = 'featured' in row && row.featured;
                const canPublish = config.api.publish && row[statusField] !== 'published';
                const canUnpublish = config.api.unpublish && row[statusField] === 'published';
                return (
                  <div key={row.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{titleOf(row, config)}</h3>
                        <Badge className={badge.cls}>{badge.label}</Badge>
                        {featured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                      </div>
                      {subtitleOf(row, config) && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitleOf(row, config)}</p>
                      )}
                      {meta.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{meta.join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {'featured' in row && (
                        <Button variant="ghost" size="icon" onClick={() => toggleFeatured(row)} title={featured ? 'Remove from featured' : 'Mark featured'}>
                          {featured ? <StarOff className="h-4 w-4 text-amber-500" /> : <Star className="h-4 w-4" />}
                        </Button>
                      )}
                      {config.extraActions && config.extraActions(row, load).map((a, i) => (
                        <Button key={i} variant="ghost" size="sm" className={cn('h-8', a.className)} onClick={a.onClick}>
                          {a.icon && <a.icon className="h-3.5 w-3.5 mr-1" />}{a.label}
                        </Button>
                      ))}
                      {canPublish && (
                        <Button variant="ghost" size="sm" className="h-8 text-green-600 hover:text-green-700" disabled={busyId === row.id}
                          onClick={() => runAction(() => config.api.publish!(row.id), row.id, 'Published')}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      {canUnpublish && (
                        <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:text-amber-700" disabled={busyId === row.id}
                          onClick={() => runAction(() => config.api.unpublish!(row.id), row.id, 'Unpublished')}>
                          <Archive className="h-3.5 w-3.5 mr-1" /> Unpublish
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" disabled={busyId === row.id}
                        onClick={() => {
                          if (!window.confirm(`Archive "${titleOf(row, config)}"? You can still restore it from the archives.`)) return;
                          runAction(() => config.api.archive(row.id), row.id, 'Archived');
                        }} title="Archive">
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
          <span>{total} {total === 1 ? config.singular.toLowerCase() : config.title.toLowerCase()}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${config.singular}` : `New ${config.singular}`}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {config.fields.map((fd) => {
              const span = fd.colSpan === 2 ? 'col-span-2' : 'col-span-2 sm:col-span-1';
              const value = form[fd.key];
              const set = (v: any) => setForm((f) => ({ ...f, [fd.key]: v }));
              return (
                <div key={fd.key} className={span}>
                  {fd.type === 'checkbox' ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3">
                      <div>
                        <Label className="text-sm font-medium">{fd.label}{fd.required && <span className="text-red-500"> *</span>}</Label>
                        {fd.hint && <p className="text-xs text-gray-400 mt-0.5">{fd.hint}</p>}
                      </div>
                      <Switch checked={!!value} onCheckedChange={set} />
                    </div>
                  ) : fd.type === 'select' ? (
                    <>
                      <Label>{fd.label}{fd.required && <span className="text-red-500"> *</span>}</Label>
                      <Select value={value || ''} onValueChange={set}>
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(fd.options || []).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : fd.type === 'textarea' || fd.type === 'json' || fd.type === 'list' ? (
                    <>
                      <Label>{fd.label}{fd.required && <span className="text-red-500"> *</span>}</Label>
                      <Textarea
                        className="mt-1.5 font-mono"
                        rows={fd.rows || (fd.type === 'list' ? 3 : 4)}
                        value={typeof value === 'string' ? value : fd.type === 'json' ? JSON.stringify(value, null, 2) : ''}
                        onChange={(e) => set(e.target.value)}
                        placeholder={fd.placeholder || (fd.type === 'json' ? 'JSON object' : fd.type === 'list' ? 'One item per line' : '')}
                      />
                      {fd.hint && <p className="text-xs text-gray-400 mt-1">{fd.hint}</p>}
                    </>
                  ) : (
                    <>
                      <Label>{fd.label}{fd.required && <span className="text-red-500"> *</span>}</Label>
                      <Input
                        className="mt-1.5"
                        type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : 'text'}
                        value={value ?? ''}
                        onChange={(e) => set(fd.type === 'number' ? e.target.value : e.target.value)}
                        placeholder={fd.placeholder}
                      />
                      {fd.hint && <p className="text-xs text-gray-400 mt-1">{fd.hint}</p>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editing ? 'Save Changes' : `Create ${config.singular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
