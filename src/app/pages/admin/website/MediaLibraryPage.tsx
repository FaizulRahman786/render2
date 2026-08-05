import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Images, Film, Trash2, Pencil, Download, ImageIcon, UploadCloud, Loader2 } from 'lucide-react';
import { api, uploadFile } from '../../../lib/api';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '../../../components/ui/dialog';

interface MediaAsset {
  id: string;
  publicId: string;
  url: string;
  resourceType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}

const TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'raw', label: 'Files' },
];

function humanSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MediaLibraryPage: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [altText, setAltText] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getMedia({ page, limit: 30, search: search || undefined, type: type || undefined });
      if (res.success) {
        setAssets(res.data ?? []);
        setTotal(res.meta?.total ?? 0);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [page, search, type]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const saveAlt = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await api.admin.updateMediaAlt(editing.id, altText);
      toast.success(res.message || 'Alt text updated');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (asset: MediaAsset) => {
    if (!window.confirm(`Delete "${asset.altText || asset.publicId}"? Assets referenced by published content cannot be deleted.`)) return;
    try {
      const res = await api.admin.deleteMedia(asset.id);
      toast.success(res.message || 'Deleted');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(file, '/upload/media') as unknown as MediaAsset;
      toast.success('Media uploaded');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => { setType(f.key); setPage(1); }}
              className={
                'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors' +
                (type === f.key ? ' bg-blue-600 text-white' : ' bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search assets..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={onFileSelected} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : assets.length === 0 ? (
        <div className="p-12 text-center text-gray-500 rounded-2xl bg-white border border-gray-100">
          <Images className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          No media assets found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {assets.map((a) => (
            <div key={a.id} className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 relative overflow-hidden">
                {a.resourceType === 'image' ? (
                  <img src={a.url} alt={a.altText || a.publicId} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    {a.resourceType === 'video' ? <Film className="h-10 w-10" /> : <Download className="h-10 w-10" />}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => { setEditing(a); setAltText(a.altText ?? ''); }} className="p-2 rounded-lg bg-white text-gray-700 hover:text-blue-600" title="Edit alt text">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => remove(a)} className="p-2 rounded-lg bg-white text-gray-700 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <p className="text-xs font-medium text-gray-800 truncate" title={a.publicId}>{a.altText || a.publicId}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] py-0">{a.resourceType}</Badge>
                  <span className="text-[10px] text-gray-400">{humanSize(a.bytes)}</span>
                  {a.width && <span className="text-[10px] text-gray-400 ml-auto">{a.width}×{a.height}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} asset{total !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span className="px-3 py-1.5">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-blue-600" /> Edit alt text</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {editing.resourceType === 'image' && (
                <div className="rounded-xl overflow-hidden border border-gray-100">
                  <img src={editing.url} alt={editing.altText || ''} className="w-full h-40 object-cover" />
                </div>
              )}
              <div>
                <Label>Alt text (accessibility)</Label>
                <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Describe the image..." />
              </div>
              <p className="text-xs text-gray-400 break-all font-mono">{editing.publicId}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveAlt} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};