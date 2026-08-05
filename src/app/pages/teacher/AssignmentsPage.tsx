import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Loader2, RefreshCw, Eye, CheckSquare, ExternalLink, Star, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

type View = 'list' | 'submissions';

export const AssignmentsPage: React.FC = () => {
  const [view, setView] = useState<View>('list');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', batchId: '', description: '', dueDate: '', maxMarks: '100' });

  // Submissions state
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ marks: '', feedback: '' });
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradingSaving, setGradingSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.teacher.getAssignments(), api.teacher.getBatches()]).then(([a, b]) => {
      if (a.success) setAssignments(a.data);
      if (b.success) setBatches(b.data);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.teacher.createAssignment({ title: form.title, batchId: form.batchId, description: form.description, dueDate: form.dueDate, totalMarks: parseInt(form.maxMarks) });
      toast.success('Assignment created');
      setAddOpen(false);
      setForm({ title: '', batchId: '', description: '', dueDate: '', maxMarks: '100' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const openSubmissions = async (assignment: any) => {
    setSelectedAssignment(assignment);
    setView('submissions');
    setSubLoading(true);
    setSubmissions([]);
    try {
      const r = await api.teacher.getAssignmentSubmissions(assignment.id);
      if (r.success) setSubmissions(r.data);
    } catch (err: any) { toast.error(err.message); } finally { setSubLoading(false); }
  };

  const openGradeDialog = (sub: any) => {
    setGradingId(sub.id);
    setGradeForm({ marks: sub.marksAwarded?.toString() ?? '', feedback: sub.feedback ?? '' });
    setGradeOpen(true);
  };

  const handleGrade = async () => {
    if (!gradingId || !selectedAssignment || gradingSaving) return;
    setGradingSaving(true);
    try {
      await api.teacher.gradeSubmission(selectedAssignment.id, gradingId, {
        marksAwarded: gradeForm.marks,
        feedback: gradeForm.feedback,
      });
      toast.success('Submission graded!');
      setGradeOpen(false);
      // Refresh submissions
      const r = await api.teacher.getAssignmentSubmissions(selectedAssignment.id);
      if (r.success) setSubmissions(r.data);
    } catch (err: any) { toast.error(err.message); }
    finally { setGradingSaving(false); }
  };

  const statusColor: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    graded: 'bg-green-100 text-green-700',
    pending: 'bg-gray-100 text-gray-600',
  };

  if (view === 'submissions' && selectedAssignment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setView('list')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedAssignment.title}</h1>
            <p className="text-muted-foreground text-sm">
              Batch: {selectedAssignment.batchName || '—'} &bull; Max Marks: {selectedAssignment.totalMarks ?? 100} &bull; Due: {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-blue-600">{submissions.length}</p><p className="text-sm text-muted-foreground mt-1">Total Submissions</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-600">{submissions.filter(s => s.status === 'graded').length}</p><p className="text-sm text-muted-foreground mt-1">Graded</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-orange-600">{submissions.filter(s => s.status !== 'graded').length}</p><p className="text-sm text-muted-foreground mt-1">Pending Review</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Student Submissions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {subLoading ? (
              <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.studentName}</p>
                          <p className="text-xs text-muted-foreground">{sub.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {sub.submissionUrl ? (
                          <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 text-sm hover:underline">
                            <ExternalLink className="h-3 w-3" /> View File
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground line-clamp-2">{sub.submissionText || '—'}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status] || 'bg-gray-100 text-gray-600'}`}>
                          {sub.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sub.status === 'graded' ? (
                          <span className="font-semibold text-green-700">{sub.marksAwarded}/{selectedAssignment.totalMarks ?? 100}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{sub.feedback || '—'}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openGradeDialog(sub)}>
                          <Star className="h-3 w-3 mr-1" />{sub.status === 'graded' ? 'Edit' : 'Grade'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {submissions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No submissions yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grade Dialog */}
        <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Marks Awarded (out of {selectedAssignment.totalMarks ?? 100}) *</Label>
                <Input
                  type="number"
                  min="0"
                  max={selectedAssignment.totalMarks ?? 100}
                  value={gradeForm.marks}
                  onChange={(e) => setGradeForm({ ...gradeForm, marks: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label>Feedback (optional)</Label>
                <Textarea
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Comments for the student…"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setGradeOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleGrade} className="flex-1 bg-green-600 hover:bg-green-700" disabled={!gradeForm.marks || gradingSaving}>
                  {gradingSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckSquare className="h-4 w-4 mr-2" />}Submit Grade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
          <p className="text-muted-foreground mt-2">Create assignments and review student submissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-yellow-600"><Plus className="h-4 w-4 mr-2" /> Create Assignment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
                <div>
                  <Label>Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm({...form, batchId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Due Date *</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} required /></div>
                  <div><Label>Max Marks</Label><Input type="number" value={form.maxMarks} onChange={(e) => setForm({...form, maxMarks: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving || !form.batchId}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Assignment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Title</TableHead><TableHead>Batch</TableHead><TableHead>Max Marks</TableHead><TableHead>Due Date</TableHead><TableHead>Submissions</TableHead><TableHead>Action</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.batchName || '—'}</TableCell>
                    <TableCell>{a.totalMarks ?? 100}</TableCell>
                    <TableCell className="text-sm">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>{a.submissionCount ?? 0}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openSubmissions(a)}>
                        <Eye className="h-4 w-4 mr-1" />View Submissions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
