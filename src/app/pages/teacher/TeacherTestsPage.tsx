import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Loader2, RefreshCw, ListChecks, Trash2, CheckCircle2, Eye } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyQuestion = () => ({
  questionText: '',
  questionType: 'mcq',
  marks: '1',
  options: ['', '', '', ''],
  correctAnswer: '',
});

export const TeacherTestsPage: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', batchId: '', totalMarks: '100', duration: '60', passingMarks: '', startDate: '', endDate: '' });

  // Question builder state
  const [qOpen, setQOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([emptyQuestion()]);
  const [qLoading, setQLoading] = useState(false);
  const [qSaving, setQSaving] = useState(false);

  // Results viewer
  const [resultsOpen, setResultsOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.teacher.getTests(), api.teacher.getBatches()])
      .then(([t, b]) => {
        if (t.success) setTests(t.data);
        if (b.success) setBatches(b.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.teacher.createTest({
        ...form,
        totalMarks: form.totalMarks,
        duration: form.duration,
        passingMarks: form.passingMarks || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      toast.success('Test created — now add questions using the Questions button');
      setAddOpen(false);
      setForm({ title: '', batchId: '', totalMarks: '100', duration: '60', passingMarks: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handlePublish = async (id: string) => {
    if (publishingId) return;
    setPublishingId(id);
    try {
      await api.teacher.updateTest(id, { status: 'published' });
      toast.success('Test published — students can now see and attempt it');
      load();
    } catch (err: any) { toast.error(err.message); }
    finally { setPublishingId(null); }
  };

  const openQuestions = async (test: any) => {
    setActiveTest(test);
    setQOpen(true);
    setQLoading(true);
    try {
      const r = await api.teacher.getTestQuestions(test.id);
      if (r.success && r.data.length > 0) {
        setQuestions(r.data.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          marks: String(q.marks),
        })));
      } else {
        setQuestions([emptyQuestion()]);
      }
    } catch { setQuestions([emptyQuestion()]); }
    finally { setQLoading(false); }
  };

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);

  const removeQuestion = (idx: number) =>
    setQuestions(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, field: string, value: any) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));

  const updateOption = (qIdx: number, optIdx: number, value: string) =>
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));

  const saveQuestions = async () => {
    const invalid = questions.find(q => !q.questionText.trim() || q.options.some((o: string) => !o.trim()) || !q.correctAnswer);
    if (invalid) { toast.error('Please fill all question fields and select a correct answer'); return; }
    setQSaving(true);
    try {
      await api.teacher.saveTestQuestions(activeTest.id, questions.map(q => ({
        ...q,
        options: q.options,
      })));
      toast.success(`${questions.length} question${questions.length > 1 ? 's' : ''} saved`);
      setQOpen(false);
    } catch (err: any) { toast.error(err.message); } finally { setQSaving(false); }
  };

  const openResults = async (test: any) => {
    setActiveTest(test);
    setResultsOpen(true);
    setResultsLoading(true);
    try {
      const r = await api.teacher.getTestResults(test.id);
      if (r.success) setResults(r.data);
    } catch { setResults([]); }
    finally { setResultsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tests & Assessments</h1>
          <p className="text-muted-foreground mt-2">Create tests, add MCQ questions, and publish to students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" /> Create Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Test</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div><Label>Test Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div>
                  <Label>Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm({ ...form, batchId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Total Marks *</Label><Input type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} required /></div>
                  <div><Label>Passing Marks</Label><Input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving || !form.batchId}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Test'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.batchName || '—'}</TableCell>
                    <TableCell>{t.totalMarks}{t.passingMarks ? <span className="text-xs text-muted-foreground ml-1">(pass: {t.passingMarks})</span> : ''}</TableCell>
                    <TableCell>{t.duration ? t.duration + ' min' : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'published' ? 'default' : 'secondary'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openQuestions(t)}>
                          <ListChecks className="h-4 w-4 mr-1" /> Questions
                        </Button>
                        {t.status === 'published' && (
                          <Button size="sm" variant="outline" onClick={() => openResults(t)}>
                            <Eye className="h-4 w-4 mr-1" /> Results
                          </Button>
                        )}
                        {t.status === 'draft' && (
                          <Button size="sm" onClick={() => handlePublish(t.id)} disabled={publishingId !== null}>
                            {publishingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {tests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No tests yet. Create one and add MCQ questions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Question Builder Dialog */}
      <Dialog open={qOpen} onOpenChange={setQOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-600" />
              Questions — {activeTest?.title}
            </DialogTitle>
          </DialogHeader>

          {qLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-6 mt-2">
              {questions.map((q, qIdx) => (
                <Card key={qIdx} className="border-2 border-dashed border-indigo-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base text-indigo-700">Question {qIdx + 1}</CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Marks</Label>
                          <Input
                            type="number"
                            min="1"
                            className="w-16 h-8 text-sm"
                            value={q.marks}
                            onChange={(e) => updateQuestion(qIdx, 'marks', e.target.value)}
                          />
                        </div>
                        <Button size="sm" variant="ghost" className="text-red-500 h-8 w-8 p-0" onClick={() => removeQuestion(qIdx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Question Text *</Label>
                      <Input
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                        placeholder="Enter question..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="mb-2 block">Answer Options *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {q.options.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 cursor-pointer transition-colors ${q.correctAnswer === OPTION_LABELS[optIdx] ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-500'}`}
                              onClick={() => updateQuestion(qIdx, 'correctAnswer', OPTION_LABELS[optIdx])}>
                              {OPTION_LABELS[optIdx]}
                            </div>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${OPTION_LABELS[optIdx]}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                      {q.correctAnswer && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Correct answer: Option {q.correctAnswer}
                        </p>
                      )}
                      {!q.correctAnswer && (
                        <p className="text-xs text-amber-500 mt-2">Click a letter circle to mark the correct answer</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addQuestion} className="w-full border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50">
                <Plus className="h-4 w-4 mr-2" /> Add Another Question
              </Button>

              <div className="flex justify-between items-center pt-2 border-t">
                <p className="text-sm text-muted-foreground">{questions.length} question{questions.length > 1 ? 's' : ''} · {questions.reduce((s, q) => s + parseInt(q.marks || '1'), 0)} total marks</p>
                <Button onClick={saveQuestions} disabled={qSaving} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  {qSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save All Questions'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Results — {activeTest?.title}</DialogTitle>
          </DialogHeader>
          {resultsLoading ? (
            <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.marksObtained} / {activeTest?.totalMarks}</TableCell>
                    <TableCell>
                      <Badge variant={parseFloat(r.percentage) >= 50 ? 'default' : 'destructive'}>
                        {parseFloat(r.percentage).toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.submittedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
