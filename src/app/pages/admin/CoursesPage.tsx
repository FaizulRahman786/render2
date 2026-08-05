import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Plus, Trash2, Loader2, RefreshCw, GraduationCap, ArrowLeft, BookOpen, ChevronRight, FileText, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

type View = 'courses' | 'subjects' | 'chapters';

export const CoursesPage: React.FC = () => {
  const [view, setView] = useState<View>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [chLoading, setChLoading] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [courseForm, setCourseForm] = useState({ name: '', description: '', classLevel: '', duration: '', fee: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '' });
  const [chapterForm, setChapterForm] = useState({ title: '', description: '', videoUrl: '', duration: '' });

  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editCourseId, setEditCourseId] = useState('');
  const [editCourseForm, setEditCourseForm] = useState({ name: '', description: '', classLevel: '', duration: '', fee: '', status: 'active' });
  const [editSubjectOpen, setEditSubjectOpen] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editSubjectForm, setEditSubjectForm] = useState({ name: '', description: '' });
  const [editChapterOpen, setEditChapterOpen] = useState(false);
  const [editChapterId, setEditChapterId] = useState('');
  const [editChapterForm, setEditChapterForm] = useState({ title: '', description: '', videoUrl: '', duration: '' });

  // Load courses
  const loadCourses = () => {
    setLoading(true);
    api.admin.getCourses().then((r) => { if (r.success) setCourses(r.data); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(loadCourses, []);

  const loadSubjects = async (course: any) => {
    setSelectedCourse(course);
    setView('subjects');
    setSubLoading(true);
    setSubjects([]);
    try {
      const r = await api.admin.getSubjects(course.id);
      if (r.success) setSubjects(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSubLoading(false); }
  };

  const loadChapters = async (subject: any) => {
    setSelectedSubject(subject);
    setView('chapters');
    setChLoading(true);
    setChapters([]);
    try {
      const r = await api.admin.getChapters(subject.id);
      if (r.success) setChapters(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setChLoading(false); }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createCourse(courseForm);
      toast.success('Course created');
      setAddOpen(false);
      setCourseForm({ name: '', description: '', classLevel: '', duration: '', fee: '' });
      loadCourses();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    if (!confirm(`Delete course "${name}"?`)) return;
    try { await api.admin.deleteCourse(id); toast.success('Course deleted'); loadCourses(); }
    catch (err: any) { toast.error(err.message); }
  };

  const openEditCourse = (c: any) => {
    setEditCourseId(c.id);
    setEditCourseForm({ name: c.name || '', description: c.description || '', classLevel: c.classLevel || '', duration: c.duration || '', fee: c.fee || '', status: c.status || 'active' });
    setEditCourseOpen(true);
  };

  const handleEditCourse = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.admin.updateCourse(editCourseId, editCourseForm);
      toast.success('Course updated'); setEditCourseOpen(false); loadCourses();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const openEditSubject = (sub: any) => {
    setEditSubjectId(sub.id);
    setEditSubjectForm({ name: sub.name || '', description: sub.description || '' });
    setEditSubjectOpen(true);
  };

  const handleEditSubject = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedCourse) return; setSaving(true);
    try {
      await api.admin.updateSubject(selectedCourse.id, editSubjectId, editSubjectForm);
      toast.success('Subject updated'); setEditSubjectOpen(false);
      const r = await api.admin.getSubjects(selectedCourse.id);
      if (r.success) setSubjects(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const openEditChapter = (ch: any) => {
    setEditChapterId(ch.id);
    setEditChapterForm({ title: ch.title || '', description: ch.description || '', videoUrl: ch.videoUrl || '', duration: ch.duration || '' });
    setEditChapterOpen(true);
  };

  const handleEditChapter = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedSubject) return; setSaving(true);
    try {
      const payload: Record<string, any> = { title: editChapterForm.title, description: editChapterForm.description };
      if (editChapterForm.videoUrl.trim()) payload.videoUrl = editChapterForm.videoUrl.trim();
      if (editChapterForm.duration) payload.duration = editChapterForm.duration;
      await api.admin.updateChapter(selectedSubject.id, editChapterId, payload);
      toast.success('Chapter updated'); setEditChapterOpen(false);
      const r = await api.admin.getChapters(selectedSubject.id);
      if (r.success) setChapters(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setSaving(true);
    try {
      await api.admin.createSubject(selectedCourse.id, subjectForm);
      toast.success('Subject added');
      setSubjectOpen(false);
      setSubjectForm({ name: '', description: '' });
      const r = await api.admin.getSubjects(selectedCourse.id);
      if (r.success) setSubjects(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDeleteSubject = async (subId: string, name: string) => {
    if (!confirm(`Delete subject "${name}"?`)) return;
    try {
      await api.admin.deleteSubject(selectedCourse!.id, subId);
      toast.success('Subject deleted');
      const r = await api.admin.getSubjects(selectedCourse!.id);
      if (r.success) setSubjects(r.data);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { title: chapterForm.title, description: chapterForm.description };
      if (chapterForm.videoUrl.trim()) payload.videoUrl = chapterForm.videoUrl.trim();
      if (chapterForm.duration) payload.duration = chapterForm.duration;
      await api.admin.createChapter(selectedSubject.id, payload);
      toast.success('Chapter added');
      setChapterOpen(false);
      setChapterForm({ title: '', description: '', videoUrl: '', duration: '' });
      const r = await api.admin.getChapters(selectedSubject.id);
      if (r.success) setChapters(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDeleteChapter = async (chapterId: string, title: string) => {
    if (!confirm(`Delete chapter "${title}"?`)) return;
    try {
      await api.admin.deleteChapter(selectedSubject!.id, chapterId);
      toast.success('Chapter deleted');
      const r = await api.admin.getChapters(selectedSubject!.id);
      if (r.success) setChapters(r.data);
    } catch (err: any) { toast.error(err.message); }
  };

  // ── Chapters view ──────────────────────────────────────────────────────────
  if (view === 'chapters' && selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setView('subjects')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Subjects
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{selectedCourse?.name}</span>
            <ChevronRight className="h-4 w-4" />
            <span className="font-semibold text-gray-900">{selectedSubject?.name}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><FileText className="h-6 w-6 text-blue-600" />{selectedSubject.name} — Chapters</h1>
            <p className="text-muted-foreground text-sm mt-1">{selectedSubject.description || 'No description'}</p>
          </div>
          <Dialog open={chapterOpen} onOpenChange={setChapterOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600"><Plus className="h-4 w-4 mr-2" />Add Chapter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Chapter</DialogTitle></DialogHeader>
              <form onSubmit={handleAddChapter} className="space-y-4 mt-4">
                <div><Label>Title *</Label><Input value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} required /></div>
                <div><Label>Description</Label><Textarea value={chapterForm.description} onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })} /></div>
                <div><Label>Video URL</Label><Input placeholder="YouTube, Vimeo, or direct URL" value={chapterForm.videoUrl} onChange={(e) => setChapterForm({ ...chapterForm, videoUrl: e.target.value })} /></div>
                <div><Label>Duration (minutes)</Label><Input type="number" value={chapterForm.duration} onChange={(e) => setChapterForm({ ...chapterForm, duration: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Chapter'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {chLoading ? (
              <div className="text-center py-12"><Loader2 className="h-7 w-7 animate-spin mx-auto" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>#</TableHead><TableHead>Title</TableHead><TableHead>Description</TableHead><TableHead>Video</TableHead><TableHead>Duration</TableHead><TableHead>Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {chapters.map((ch, i) => (
                    <TableRow key={ch.id}>
                      <TableCell className="text-muted-foreground w-10">{ch.order ?? i + 1}</TableCell>
                      <TableCell className="font-medium">{ch.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{ch.description || '—'}</TableCell>
                      <TableCell>
                        {ch.videoUrl ? (
                          <a href={ch.videoUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline truncate block max-w-[120px]">{ch.videoUrl}</a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{ch.duration ? `${ch.duration} min` : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="text-blue-600 h-8 w-8" onClick={() => openEditChapter(ch)} title="Edit" aria-label={`Edit chapter ${ch.title}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600 h-8 w-8" onClick={() => handleDeleteChapter(ch.id, ch.title)} aria-label={`Delete chapter ${ch.title}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {chapters.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No chapters yet. Add your first chapter!</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={editChapterOpen} onOpenChange={setEditChapterOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Chapter</DialogTitle></DialogHeader>
            <form onSubmit={handleEditChapter} className="space-y-4 mt-4">
              <div><Label>Title *</Label><Input value={editChapterForm.title} onChange={(e) => setEditChapterForm({ ...editChapterForm, title: e.target.value })} required /></div>
              <div><Label>Description</Label><Textarea value={editChapterForm.description} onChange={(e) => setEditChapterForm({ ...editChapterForm, description: e.target.value })} /></div>
              <div><Label>Video URL</Label><Input placeholder="YouTube, Vimeo, or direct URL" value={editChapterForm.videoUrl} onChange={(e) => setEditChapterForm({ ...editChapterForm, videoUrl: e.target.value })} /></div>
              <div><Label>Duration (minutes)</Label><Input type="number" value={editChapterForm.duration} onChange={(e) => setEditChapterForm({ ...editChapterForm, duration: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Subjects view ──────────────────────────────────────────────────────────
  if (view === 'subjects' && selectedCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setView('courses')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Courses
          </Button>
          <span className="text-sm font-semibold text-gray-900">{selectedCourse.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="h-6 w-6 text-purple-600" />Subjects</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage subjects for {selectedCourse.name}</p>
          </div>
          <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600"><Plus className="h-4 w-4 mr-2" />Add Subject</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Subject</DialogTitle></DialogHeader>
              <form onSubmit={handleAddSubject} className="space-y-4 mt-4">
                <div><Label>Subject Name *</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="e.g. Physics, Mathematics" required /></div>
                <div><Label>Description</Label><Textarea value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} placeholder="Optional description" /></div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : 'Add Subject'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subLoading ? (
            <div className="col-span-3 text-center py-12"><Loader2 className="h-7 w-7 animate-spin mx-auto" /></div>
          ) : subjects.map((sub) => (
            <Card key={sub.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => loadChapters(sub)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><BookOpen className="h-5 w-5 text-blue-600" /></div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-purple-600 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); openEditSubject(sub); }}
                    title="Edit"
                    aria-label={`Edit subject ${sub.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id, sub.name); }}
                    aria-label={`Delete subject ${sub.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                </div>
                <h3 className="font-bold text-base mb-1">{sub.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{sub.description || 'No description'}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Order: {sub.order ?? '—'}</span>
                  <span className="flex items-center gap-1 text-blue-600">Chapters <ChevronRight className="h-3 w-3" /></span>
                </div>
              </CardContent>
            </Card>
          ))}
          {!subLoading && subjects.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">No subjects yet. Add your first subject!</div>
          )}
        </div>

        <Dialog open={editSubjectOpen} onOpenChange={setEditSubjectOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Subject</DialogTitle></DialogHeader>
            <form onSubmit={handleEditSubject} className="space-y-4 mt-4">
              <div><Label>Subject Name *</Label><Input value={editSubjectForm.name} onChange={(e) => setEditSubjectForm({ ...editSubjectForm, name: e.target.value })} required /></div>
              <div><Label>Description</Label><Textarea value={editSubjectForm.description} onChange={(e) => setEditSubjectForm({ ...editSubjectForm, description: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Courses list view ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Management</h1>
          <p className="text-muted-foreground mt-2">Manage courses, subjects, and chapters</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCourses}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600"><Plus className="h-4 w-4 mr-2" /> Add Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Course</DialogTitle></DialogHeader>
              <form onSubmit={handleAddCourse} className="space-y-4 mt-4">
                <div><Label>Course Name *</Label><Input value={courseForm.name} onChange={(e) => setCourseForm({...courseForm, name: e.target.value})} required /></div>
                <div><Label>Description *</Label><Textarea value={courseForm.description} onChange={(e) => setCourseForm({...courseForm, description: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Class Level *</Label><Input placeholder="e.g. Class 11-12" value={courseForm.classLevel} onChange={(e) => setCourseForm({...courseForm, classLevel: e.target.value})} required /></div>
                  <div><Label>Duration (months) *</Label><Input type="number" value={courseForm.duration} onChange={(e) => setCourseForm({...courseForm, duration: e.target.value})} required /></div>
                  <div className="col-span-2"><Label>Fee (₹) *</Label><Input type="number" value={courseForm.fee} onChange={(e) => setCourseForm({...courseForm, fee: e.target.value})} required /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Course'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Courses</p><h3 className="text-3xl font-bold mt-2">{courses.length}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Active</p><h3 className="text-3xl font-bold mt-2 text-green-600">{courses.filter(c => c.status === 'active').length}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Revenue Potential</p><h3 className="text-3xl font-bold mt-2 text-blue-600">₹{courses.reduce((s, c) => s + Number(c.fee || 0), 0).toLocaleString('en-IN')}</h3></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><GraduationCap className="h-6 w-6 text-purple-600" /></div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                    <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-purple-600 h-7 w-7" onClick={() => openEditCourse(c)} title="Edit" aria-label={`Edit course ${c.name}`}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 h-7 w-7" onClick={() => handleDeleteCourse(c.id, c.name)} aria-label={`Delete course ${c.name}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-1">{c.name}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-muted-foreground">{c.classLevel || 'All levels'}{c.duration ? ` • ${c.duration} months` : ''}</span>
                  <span className="font-bold text-green-600">₹{Number(c.fee).toLocaleString('en-IN')}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-purple-700 border-purple-200 hover:bg-purple-50"
                  onClick={() => loadSubjects(c)}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />Manage Subjects & Chapters
                </Button>
              </CardContent>
            </Card>
          ))}
          {courses.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground">No courses yet. Add your first course!</div>
          )}
        </div>
      )}

      <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Course</DialogTitle></DialogHeader>
          <form onSubmit={handleEditCourse} className="space-y-4 mt-4">
            <div><Label>Course Name *</Label><Input value={editCourseForm.name} onChange={(e) => setEditCourseForm({...editCourseForm, name: e.target.value})} required /></div>
            <div><Label>Description *</Label><Textarea value={editCourseForm.description} onChange={(e) => setEditCourseForm({...editCourseForm, description: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Class Level</Label><Input placeholder="e.g. Class 11-12" value={editCourseForm.classLevel} onChange={(e) => setEditCourseForm({...editCourseForm, classLevel: e.target.value})} /></div>
              <div><Label>Duration (months)</Label><Input type="number" value={editCourseForm.duration} onChange={(e) => setEditCourseForm({...editCourseForm, duration: e.target.value})} /></div>
              <div><Label>Fee (₹) *</Label><Input type="number" value={editCourseForm.fee} onChange={(e) => setEditCourseForm({...editCourseForm, fee: e.target.value})} required /></div>
              <div><Label>Status</Label>
                <Select value={editCourseForm.status} onValueChange={(v) => setEditCourseForm({...editCourseForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
