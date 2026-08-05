import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Plus, Trash2, Loader2, RefreshCw, Users, GraduationCap, BookOpen, Search, UserPlus, X } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', courseId: '', timing: '', startDate: '', endDate: '', description: '' });

  // Manage members state
  const [membersOpen, setMembersOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [members, setMembers] = useState<{ teachers: any[]; students: any[] }>({ teachers: [], students: [] });
  const [membersLoading, setMembersLoading] = useState(false);
  const [addingTeacher, setAddingTeacher] = useState<string>('');
  const [addingStudent, setAddingStudent] = useState<string>('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.admin.getBatches({ page: 1, limit: 100 }),
      api.admin.getCourses({ all: true }),
      api.admin.getAllTeachers(),
      api.admin.getAllStudents(),
    ]).then(([b, c, t, s]) => {
      if (b.success) setBatches(b.data);
      if (c.success) setCourses(c.data);
      if (t.success) setAllTeachers(t.data);
      if (s.success) setAllStudents(s.data);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createBatch(form);
      toast.success('Batch created');
      setAddOpen(false);
      setForm({ name: '', courseId: '', timing: '', startDate: '', endDate: '', description: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete batch "${name}"? This will also remove all member assignments.`)) return;
    try { await api.admin.deleteBatch(id); toast.success('Batch deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const openMembers = async (batch: any) => {
    setActiveBatch(batch);
    setMembersOpen(true);
    setMembersLoading(true);
    setAddingTeacher('');
    setAddingStudent('');
    setTeacherSearch('');
    setStudentSearch('');
    try {
      const r = await api.admin.getBatchMembers(batch.id);
      if (r.success) setMembers(r.data);
    } catch { setMembers({ teachers: [], students: [] }); }
    finally { setMembersLoading(false); }
  };

  const refreshMembers = async () => {
    if (!activeBatch) return;
    const r = await api.admin.getBatchMembers(activeBatch.id);
    if (r.success) {
      setMembers(r.data);
      // Update student count in list
      setBatches(prev => prev.map(b => b.id === activeBatch.id ? { ...b, studentCount: r.data.students.length } : b));
    }
  };

  const addTeacher = async () => {
    if (!addingTeacher) return;
    setActionLoading('addTeacher');
    try {
      await api.admin.addBatchTeacher(activeBatch.id, addingTeacher);
      toast.success('Teacher assigned to batch');
      setAddingTeacher('');
      await refreshMembers();
    } catch (err: any) { toast.error(err.message); } finally { setActionLoading(null); }
  };

  const removeTeacher = async (teacherId: string) => {
    setActionLoading('rm-t-' + teacherId);
    try {
      await api.admin.removeBatchTeacher(activeBatch.id, teacherId);
      toast.success('Teacher removed');
      await refreshMembers();
    } catch (err: any) { toast.error(err.message); } finally { setActionLoading(null); }
  };

  const addStudent = async () => {
    if (!addingStudent) return;
    setActionLoading('addStudent');
    try {
      await api.admin.addBatchStudent(activeBatch.id, addingStudent);
      toast.success('Student enrolled in batch');
      setAddingStudent('');
      await refreshMembers();
    } catch (err: any) { toast.error(err.message); } finally { setActionLoading(null); }
  };

  const removeStudent = async (studentId: string) => {
    setActionLoading('rm-s-' + studentId);
    try {
      await api.admin.removeBatchStudent(activeBatch.id, studentId);
      toast.success('Student removed');
      await refreshMembers();
    } catch (err: any) { toast.error(err.message); } finally { setActionLoading(null); }
  };

  // Filtered available teachers/students (not already in batch)
  const memberTeacherIds = new Set(members.teachers.map(t => t.id));
  const memberStudentIds = new Set(members.students.map(s => s.id));

  const availableTeachers = useMemo(() =>
    allTeachers.filter(t => !memberTeacherIds.has(t.id) &&
      (!teacherSearch || t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || t.email.toLowerCase().includes(teacherSearch.toLowerCase()))
    ), [allTeachers, members.teachers, teacherSearch]);

  const availableStudents = useMemo(() =>
    allStudents.filter(s => !memberStudentIds.has(s.id) &&
      (!studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
    ), [allStudents, members.students, studentSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
          <p className="text-muted-foreground mt-2">Create batches, assign teachers, and enroll students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                <Plus className="h-4 w-4 mr-2" /> Add Batch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Batch</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div><Label>Batch Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div>
                  <Label>Course *</Label>
                  <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Timing</Label><Input placeholder="e.g. Mon/Wed/Fri 10:00 AM" value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saving || !form.courseId}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Batch'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-orange-500" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.courseName || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.timing || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{b.studentCount ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={b.status === 'active' ? 'default' : 'secondary'}>{b.status}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.startDate ? new Date(b.startDate).toLocaleDateString() : '—'} → {b.endDate ? new Date(b.endDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openMembers(b)}>
                        <Users className="h-4 w-4 mr-1" /> Manage Members
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDelete(b.id, b.name)} aria-label={`Delete batch ${b.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {batches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No batches yet. Create one to get started.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Manage Members Dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              {activeBatch?.name} — Manage Members
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{activeBatch?.courseName}</p>
          </DialogHeader>

          {membersLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : (
            <Tabs defaultValue="teachers" className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="teachers" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Teachers
                  <Badge variant="secondary" className="ml-1">{members.teachers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Students
                  <Badge variant="secondary" className="ml-1">{members.students.length}</Badge>
                </TabsTrigger>
              </TabsList>

              {/* ── Teachers Tab ─────────────────────────────────────────── */}
              <TabsContent value="teachers" className="space-y-4 mt-4">
                {/* Add teacher */}
                <div className="space-y-2">
                  <Label>Assign a Teacher</Label>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-1">
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      className="border-0 shadow-none focus-visible:ring-0 p-0 h-8"
                      placeholder="Search teacher by name or email..."
                      value={teacherSearch}
                      onChange={e => { setTeacherSearch(e.target.value); setAddingTeacher(''); }}
                    />
                  </div>
                  {teacherSearch && availableTeachers.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto shadow-sm">
                      {availableTeachers.slice(0, 8).map(t => (
                        <button
                          key={t.id}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left ${addingTeacher === t.id ? 'bg-orange-50' : ''}`}
                          onClick={() => { setAddingTeacher(t.id); setTeacherSearch(t.name); }}
                        >
                          <div>
                            <p className="font-medium">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.email}</p>
                          </div>
                          {addingTeacher === t.id && <Badge variant="outline" className="text-orange-600 border-orange-400">Selected</Badge>}
                        </button>
                      ))}
                    </div>
                  )}
                  {teacherSearch && availableTeachers.length === 0 && (
                    <p className="text-sm text-muted-foreground px-1">No available teachers match this search</p>
                  )}
                  <Button
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600"
                    disabled={!addingTeacher || actionLoading === 'addTeacher'}
                    onClick={addTeacher}
                  >
                    {actionLoading === 'addTeacher' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : <><UserPlus className="mr-2 h-4 w-4" />Assign Teacher</>}
                  </Button>
                </div>

                {/* Current teachers */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Currently Assigned ({members.teachers.length})</Label>
                  {members.teachers.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                      No teachers assigned yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {members.teachers.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                          <div>
                            <p className="font-medium text-sm">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.email} {t.phone ? `· ${t.phone}` : ''}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 h-8 w-8 p-0"
                            disabled={actionLoading === 'rm-t-' + t.id}
                            onClick={() => removeTeacher(t.id)}
                          >
                            {actionLoading === 'rm-t-' + t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Students Tab ─────────────────────────────────────────── */}
              <TabsContent value="students" className="space-y-4 mt-4">
                {/* Add student */}
                <div className="space-y-2">
                  <Label>Enroll a Student</Label>
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-1">
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      className="border-0 shadow-none focus-visible:ring-0 p-0 h-8"
                      placeholder="Search student by name or email..."
                      value={studentSearch}
                      onChange={e => { setStudentSearch(e.target.value); setAddingStudent(''); }}
                    />
                  </div>
                  {studentSearch && availableStudents.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto shadow-sm">
                      {availableStudents.slice(0, 8).map(s => (
                        <button
                          key={s.id}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left ${addingStudent === s.id ? 'bg-blue-50' : ''}`}
                          onClick={() => { setAddingStudent(s.id); setStudentSearch(s.name); }}
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                          {addingStudent === s.id && <Badge variant="outline" className="text-blue-600 border-blue-400">Selected</Badge>}
                        </button>
                      ))}
                    </div>
                  )}
                  {studentSearch && availableStudents.length === 0 && (
                    <p className="text-sm text-muted-foreground px-1">No available students match this search</p>
                  )}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                    disabled={!addingStudent || actionLoading === 'addStudent'}
                    onClick={addStudent}
                  >
                    {actionLoading === 'addStudent' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enrolling...</> : <><UserPlus className="mr-2 h-4 w-4" />Enroll Student</>}
                  </Button>
                </div>

                {/* Current students */}
                <div>
                  <Label className="text-sm text-muted-foreground mb-2 block">Currently Enrolled ({members.students.length})</Label>
                  {members.students.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                      No students enrolled yet
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {members.students.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.email} {s.phone ? `· ${s.phone}` : ''}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 h-8 w-8 p-0"
                            disabled={actionLoading === 'rm-s-' + s.id}
                            onClick={() => removeStudent(s.id)}
                          >
                            {actionLoading === 'rm-s-' + s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
