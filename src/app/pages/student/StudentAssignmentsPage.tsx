import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState<string | null>(null);
  const [submission, setSubmission] = useState({ content: '', fileUrl: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.student.getAssignments().then((r) => { if (r.success) setAssignments(r.data); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSubmit = async (id: string) => {
    setSaving(true);
    try {
      await api.student.submitAssignment(id, {
        submissionText: submission.content,
        submissionUrl: submission.fileUrl || undefined,
      });
      toast.success('Assignment submitted!');
      setSubmitOpen(null);
      setSubmission({ content: '', fileUrl: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
        <p className="text-muted-foreground mt-2">View and submit your assignments</p>
      </div>
      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Max Marks</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => {
                const isSubmitted = !!a.submissionId || a.submissionStatus === 'submitted' || a.submissionStatus === 'graded';
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && !isSubmitted;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.totalMarks ?? '—'}</TableCell>
                    <TableCell className={'text-sm ' + (isOverdue ? 'text-red-600' : 'text-muted-foreground')}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={isSubmitted ? 'default' : isOverdue ? 'destructive' : 'secondary'}>
                        {isSubmitted ? (a.submissionStatus === 'graded' ? 'Graded' : 'Submitted') : isOverdue ? 'Overdue' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!isSubmitted && (
                        <Dialog open={submitOpen === a.id} onOpenChange={(o) => setSubmitOpen(o ? a.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm"><Send className="h-3 w-3 mr-1" />Submit</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Submit: {a.title}</DialogTitle></DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div><Label>Your Answer *</Label><Textarea value={submission.content} onChange={(e) => setSubmission({...submission, content: e.target.value})} placeholder="Write your answer here..." rows={5} /></div>
                              <div><Label>File URL (optional)</Label><Input type="url" value={submission.fileUrl} onChange={(e) => setSubmission({...submission, fileUrl: e.target.value})} placeholder="https://..." /></div>
                              <Button className="w-full" onClick={() => handleSubmit(a.id)} disabled={saving || !submission.content}>
                                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit Assignment'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {assignments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No assignments yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
