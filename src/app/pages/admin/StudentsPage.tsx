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

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', parentName: '', parentPhone: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', status: 'active', parentName: '', parentPhone: '', address: '', courseId: '' });
  const [courses, setCourses] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((p = page, l = limit, s = search, st = statusFilter) => {
    setLoading(true);
    api.admin.getStudents({ page: p, limit: l, search: s || undefined, status: st || undefined })
      .then((r) => {
        if (r.success) {
          setStudents(r.data);
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
      const r = await api.admin.getStudents({ all: 'true', search: search || undefined, status: statusFilter || undefined });
      if (!r.success) throw new Error('Export failed');
      downloadCsv(
        `students-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Name', 'Email', 'Phone', 'Status', 'Parent Name', 'Parent Phone', 'Enrolled'],
        r.data.map((s: any) => [
          s.name, s.email, s.phone, s.status,
          s.parentName, s.parentPhone,
          s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString() : '',
        ]),
      );
      toast.success(`Exported ${r.data.length} student${r.data.length === 1 ? '' : 's'}`);
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
      await api.admin.createStudent(form);
      toast.success('Student created — they can sign in with their email and password');
      setAddOpen(false);
      setForm({ name: '', email: '', phone: '', password: '', parentName: '', parentPhone: '' });
      load(1, limit, search, statusFilter);
      setPage(1);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate student ${name}? Their academic history is preserved and they will no longer be able to log in.`)) return;
    try {
      await api.admin.deactivateStudent(id);
      toast.success('Student deactivated');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const openEdit = async (s: any) => {
    setEditTarget(s);
    setEditForm({
      name: s.name || '', phone: s.phone || '', status: s.status || 'active',
      parentName: s.parentName || '', parentPhone: s.parentPhone || '',
      address: s.address || '', courseId: s.courseId || '',
    });
    try { const r = await api.admin.getCourses({ all: true }); if (r.success) setCourses(r.data); } catch {}
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await api.admin.updateStudent(editTarget.id, editForm);
      toast.success('Student updated');
      setEditOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`Restore student ${name}? They will be able to log in again.`)) return;
    try {
      await api.admin.restoreStudent(id);
      toast.success('Student restored');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleStatusToggle = async (id: string, current: string) => {
    const newStatus = current === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateStudent(id, { status: newStatus });
      toast.success('Status updated');
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
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-muted-foreground mt-2">Manage all students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" /> Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                  <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required /></div>
                  <div><Label>Initial Password *</Label><Input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} minLength={8} placeholder="Min 8 characters" required /></div>
                  <div><Label>Parent Name</Label><Input value={form.parentName} onChange={(e) => setForm({...form, parentName: e.target.value})} /></div>
                  <div><Label>Parent Phone</Label><Input value={form.parentPhone} onChange={(e) => setForm({...form, parentPhone: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Student'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Students</p><h3 className="text-3xl font-bold mt-2">{pagination.total}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Page</p><h3 className="text-3xl font-bold mt-2 text-blue-600">{students.length}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pages</p><h3 className="text-3xl font-bold mt-2 text-purple-600">{pagination.totalPages}</h3></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Students</CardTitle>
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
                  placeholder="Search name, email, phone..."
                  className="pl-9 pr-8 w-64"
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
                      <TableHead>Parent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{s.email}</div>
                            <div className="text-muted-foreground">{s.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{s.parentName || '—'}</div>
                            <div className="text-muted-foreground">{s.parentPhone || ''}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={s.status === 'active' ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleStatusToggle(s.id, s.status)}
                          >
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit" aria-label={`Edit student ${s.name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {s.status === 'inactive' ? (
                              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleRestore(s.id, s.name)} title="Restore" aria-label={`Restore student ${s.name}`}>
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(s.id, s.name)} title="Deactivate" aria-label={`Deactivate student ${s.name}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {students.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {search || statusFilter ? 'No students match your filters' : 'No students found'}
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
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
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
              <div><Label>Course</Label>
                <Select value={editForm.courseId || 'none'} onValueChange={(v) => setEditForm({...editForm, courseId: v === 'none' ? '' : v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Parent Name</Label><Input value={editForm.parentName} onChange={(e) => setEditForm({...editForm, parentName: e.target.value})} /></div>
              <div><Label>Parent Phone</Label><Input value={editForm.parentPhone} onChange={(e) => setEditForm({...editForm, parentPhone: e.target.value})} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} /></div>
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
