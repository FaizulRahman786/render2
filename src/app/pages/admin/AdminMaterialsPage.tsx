import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Plus, Trash2, Loader2, RefreshCw, FileText, Video, Image, File, Upload, Link, Eye, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { TablePagination } from '../../components/shared/TablePagination';
import { toast } from 'sonner';

const typeIcon = (t: string = '') => ({ pdf: FileText, video: Video, image: Image })[t.toLowerCase()] || File;
const fmt = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const guessType = (mime: string) => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  return 'document';
};

const DEFAULT_LIMIT = 18;

export const AdminMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [form, setForm] = useState({ title: '', description: '', type: 'pdf', url: '', batchId: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{ fileUrl: string; fileName: string; fileSize: number; mimeType: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const loadBatches = () => {
    api.admin.getBatches({ all: true }).then((r) => { if (r.success) setBatches(r.data); }).catch(console.error);
  };

  const load = useCallback((p = page, s = search, tf = typeFilter) => {
    setLoading(true);
    api.admin.getMaterials({ page: p, limit, search: s || undefined, status: tf || undefined })
      .then((r) => {
        if (r.success) {
          setMaterials(r.data);
          setPagination(r.pagination);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, search, typeFilter]);

  useEffect(() => { load(); loadBatches(); }, [page, typeFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      load(1, val, typeFilter);
      setPage(1);
    }, 400);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val === 'all' ? '' : val);
    setPage(1);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setUploadedInfo(null);
    setUploading(true);
    try {
      const info = await api.uploadFile(file);
      setUploadedInfo(info);
      setForm(prev => ({ ...prev, type: guessType(info.mimeType) }));
      toast.success('File uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
      setSelectedFile(null);
    } finally { setUploading(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { toast.error('Title is required'); return; }
    if (uploadMode === 'file' && !uploadedInfo) { toast.error('Please select a file to upload'); return; }
    if (uploadMode === 'url' && !form.url) { toast.error('URL is required'); return; }
    setSaving(true);
    try {
      const payload = uploadMode === 'file'
        ? { title: form.title, description: form.description, fileUrl: uploadedInfo!.fileUrl, fileType: form.type, fileName: uploadedInfo!.fileName, fileSize: uploadedInfo!.fileSize, batchId: form.batchId || undefined }
        : { title: form.title, description: form.description, fileUrl: form.url, fileType: form.type, fileName: form.url.split('/').pop() || form.title, batchId: form.batchId || undefined };
      await api.admin.createMaterial(payload);
      toast.success('Material added');
      setAddOpen(false);
      resetDialog();
      load(1, search, typeFilter);
      setPage(1);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try { await api.admin.deleteMaterial(id); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const resetDialog = () => {
    setForm({ title: '', description: '', type: 'pdf', url: '', batchId: '' });
    setSelectedFile(null);
    setUploadedInfo(null);
    setUploadMode('file');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Materials</h1>
          <p className="text-muted-foreground mt-2">Manage all study materials ({pagination.total} total)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetDialog(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-600 to-blue-600"><Plus className="h-4 w-4 mr-2" /> Add Material</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Study Material</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="other">Link / Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Batch</Label>
                    <Select value={form.batchId} onValueChange={(v) => setForm({ ...form, batchId: v })}>
                      <SelectTrigger><SelectValue placeholder="All batches" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Batches</SelectItem>
                        {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'url')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file"><Upload className="h-3.5 w-3.5 mr-1.5" />Upload File</TabsTrigger>
                    <TabsTrigger value="url"><Link className="h-3.5 w-3.5 mr-1.5" />Paste URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="file" className="mt-3">
                    <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.avi,.mov" onChange={handleFileSelect} />
                    {!uploadedInfo ? (
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                        {uploading ? (
                          <><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" /><p className="text-sm text-muted-foreground">Uploading...</p></>
                        ) : (
                          <><Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" /><p className="text-sm font-medium text-gray-700">Click to select file</p><p className="text-xs text-muted-foreground mt-1">PDF, DOC, PPT, Images, Videos up to 50MB</p></>
                        )}
                      </button>
                    ) : (
                      <div className="border rounded-lg p-3 bg-green-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800 truncate max-w-[200px]">{uploadedInfo.fileName}</p>
                            <p className="text-xs text-green-600">{fmt(uploadedInfo.fileSize)} · Uploaded ✓</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { setUploadedInfo(null); setSelectedFile(null); fileRef.current?.click(); }}
                          className="text-xs text-blue-600 hover:underline">Change</button>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="url" className="mt-3">
                    <Label>URL / Link *</Label>
                    <Input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
                  </TabsContent>
                </Tabs>
                <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-blue-600" disabled={saving || uploading}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Material'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Materials</CardTitle>
            <div className="flex gap-3 flex-wrap">
              <Select value={typeFilter || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  className="pl-9 pr-8 w-56"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button onClick={() => { setSearch(''); load(1, '', typeFilter); setPage(1); }} className="absolute right-2 top-2.5 text-muted-foreground hover:text-gray-900">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((m) => {
                      const Icon = typeIcon(m.fileType);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate max-w-[180px]">{m.title}</span>
                            </div>
                            {m.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{m.description}</p>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{(m.fileType || 'file').toUpperCase()}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.courseName || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.fileSize ? fmt(m.fileSize) : '—'}</TableCell>
                          <TableCell className="text-sm">{m.uploaderName || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {m.fileUrl && (
                                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-blue-600">
                                  <Eye className="h-3.5 w-3.5" />
                                </a>
                              )}
                              <Button variant="ghost" size="icon" className="text-red-600 h-7 w-7" onClick={() => handleDelete(m.id)} aria-label={`Delete material ${m.title ?? ''}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {materials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                          {search || typeFilter ? 'No materials match your filters' : 'No materials yet'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                pagination={pagination}
                onPageChange={(p) => { setPage(p); }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
