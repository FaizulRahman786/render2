import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Plus, Search, Trash2, Loader2, RefreshCw, X, Pencil, RotateCcw, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { downloadCsv } from '../../lib/csv';
import { TablePagination } from '../../components/shared/TablePagination';
import { toast } from 'sonner';

const DEFAULT_LIMIT = 20;

export const TeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', qualification: '', experience: '', specialization: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', status: 'active', qualification: '', experience: '', specialization: '' });
  const [exporting, setExporting] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((p = page, l = limit, s = search, st = statusFilter) => {
    setLoading(true);
    api.admin.getTeachers({ page: p, limit: l, search: s || undefined, status: st || undefined })
      .then((r) => {
        if (r.success) {
          setTeachers(r.data);
          setPagination(r.pagination);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, limit, search, statusFilter]);

  useEffect(() => { load(); }, [page, limit, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      load(1, limit, val, statusFilter);
    }, 400);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val === 'all' ? '' : val);
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.admin.getTeachers({ all: 'true', search: search || undefined, status: statusFilter || undefined });
      if (!r.success) throw new Error('Export failed');
      downloadCsv(
        `teachers-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Name', 'Email', 'Phone', 'Status', 'Qualification', 'Experience (yrs)', 'Specialisation'],
        r.data.map((t: any) => [
          t.name, t.email, t.phone, t.status,
          t.qualification, t.experience, t.specialization,
        ]),
      );
      toast.success(`Exported ${r.data.length} teacher${r.data.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createTeacher(form);
      toast.success('Teacher created — they can sign in with their email and password');
      setAddOpen(false);
      setForm({ name: '', email: '', phone: '', password: '', qualification: '', experience: '', specialization: '' });
      load(1, limit, search, statusFilter);
      setPage(1);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate teacher ${name}? They will no longer be able to log in.`)) return;
    try { await api.admin.deactivateTeacher(id); toast.success('Teacher deactivated'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleStatusToggle = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateTeacher(id, { status: newStatus });
      toast.success('Status updated');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = async (t: any) => {
    setEditTarget(t);
    setEditForm({
      name: t.name || '', phone: t.phone || '', status: t.status || 'active',
      qualification: t.qualification || '', experience: t.experience || '', specialization: t.specialization || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.admin.updateTeacher(editTarget.id, editForm);
      toast.success('Teacher updated');
      setEditOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`Restore teacher ${name}? They will be able to log in again.`)) return;
    try {
      await api.admin.restoreTeacher(id);
      toast.success('Teacher restored');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
    load(1, limit, '', statusFilter);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-muted-foreground mt-2">Manage all teachers and their assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-teal-600"><Plus className="h-4 w-4 mr-2" /> Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Teacher</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                  <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required /></div>
                  <div><Label>Initial Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} minLength={8} placeholder="Min 8 characters" required /></div>
                  <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({...form, qualification: e.target.value})} /></div>
                  <div><Label>Experience (years)</Label><Input type="number" value={form.experience} onChange={(e) => setForm({...form, experience: e.target.value})} /></div>
                  <div className="col-span-2"><Label>Specialization</Label><Input value={form.specialization} onChange={(e) => setForm({...form, specialization: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Teacher'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Teachers</p><h3 className="text-3xl font-bold mt-2">{pagination.total}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Page</p><h3 className="text-3xl font-bold mt-2 text-green-600">{teachers.length}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Pages</p><h3 className="text-3xl font-bold mt-2 text-teal-600">{pagination.totalPages}</h3></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Teachers</CardTitle>
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={exportCsv} disabled={exporting}>
                <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  className="pl-9 pr-8 w-56"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button onClick={clearSearch} className="absolute right-2 top-2.5 text-muted-foreground hover:text-gray-900">
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
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{t.email}</div>
                            <div className="text-muted-foreground">{t.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{t.specialization || '—'}</TableCell>
                        <TableCell>{t.experience ? `${t.experience} yrs` : '—'}</TableCell>
                        <TableCell><Badge
                          variant={t.status === 'active' ? 'default' : 'secondary'}
                          className="cursor-pointer"
                          onClick={() => handleStatusToggle(t.id, t.status)}
                        >{t.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit" aria-label={`Edit teacher ${t.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {t.status === 'inactive' ? (
                              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleRestore(t.id, t.name)} title="Restore" aria-label={`Restore teacher ${t.name}`}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(t.id, t.name)} title="Deactivate" aria-label={`Deactivate teacher ${t.name}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {teachers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {search || statusFilter ? 'No teachers match your filters' : 'No teachers found'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                pagination={pagination}
                onPageChange={(p) => { setPage(p); }}
                onLimitChange={(l) => { setLimit(l); setPage(1); load(1, l, search, statusFilter); }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Full Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required /></div>
              <div><Label>Phone *</Label><Input value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} required /></div>
              <div><Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Qualification</Label><Input value={editForm.qualification} onChange={(e) => setEditForm({...editForm, qualification: e.target.value})} /></div>
              <div><Label>Experience (years)</Label><Input type="number" value={editForm.experience} onChange={(e) => setEditForm({...editForm, experience: e.target.value})} /></div>
              <div className="col-span-2"><Label>Specialization</Label><Input value={editForm.specialization} onChange={(e) => setEditForm({...editForm, specialization: e.target.value})} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
