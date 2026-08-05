import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Loader2, Plus, MessageSquare, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { useRealtimeNotifications, RealtimeNotificationEvent } from '../../hooks/useRealtimeNotifications';

export const StudentDoubtsPage: React.FC = () => {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId: '', question: '' });
  const [recentlyAnswered, setRecentlyAnswered] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    api.student.getDoubts()
      .then((r) => { if (r.success) setDoubts(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    api.student.getCourses()
      .then((r) => {
        if (r.success) {
          const all: { id: string; name: string }[] = [];
          for (const c of r.data) {
            for (const s of c.subjects ?? []) all.push({ id: s.id, name: s.name });
          }
          setSubjects(all);
        }
      })
      .catch(console.error);
  }, []);

  // Listen for real-time doubt replies via WebSocket
  const handleRealtime = useCallback((n: RealtimeNotificationEvent) => {
    if (n.type !== 'doubt') return;

    // Highlight the newly answered doubt, then reload the list
    if ((n as any).doubtId) {
      setRecentlyAnswered(prev => new Set([...prev, (n as any).doubtId]));
      setTimeout(() => {
        setRecentlyAnswered(prev => {
          const next = new Set(prev);
          next.delete((n as any).doubtId);
          return next;
        });
      }, 8000);
    }

    // Silently reload doubts to pull in the fresh reply
    api.student.getDoubts()
      .then((r) => { if (r.success) setDoubts(r.data); })
      .catch(() => {});
  }, []);

  // NotificationBell already manages its own WS — we hook in only for doubt-type events
  useRealtimeNotifications({ onNotification: handleRealtime });

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.student.postDoubt(form);
      toast.success('Doubt posted! Your teacher will reply soon.');
      setAddOpen(false);
      setForm({ subjectId: '', question: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Doubts</h1>
          <p className="text-muted-foreground mt-2">Ask questions and get answers from your teacher</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-600 to-blue-600">
                <Plus className="h-4 w-4 mr-2" />Post a Doubt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post a Doubt</DialogTitle></DialogHeader>
              <form onSubmit={handlePost} className="space-y-4 mt-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Your Question *</Label>
                  <Textarea
                    value={form.question}
                    onChange={(e) => setForm({ ...form, question: e.target.value })}
                    placeholder="Describe your doubt in detail..."
                    rows={4}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</> : 'Post Doubt'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-4">
          {doubts.map((d) => {
            const isNew = recentlyAnswered.has(d.id);
            return (
              <Card
                key={d.id}
                className={`transition-all duration-700 ${isNew ? 'ring-2 ring-green-400 shadow-green-100 shadow-md' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{d.subjectName || 'General'}</span>
                      {d.status === 'open' ? (
                        <Badge variant="secondary">Pending Reply</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Answered
                        </Badge>
                      )}
                      {isNew && (
                        <Badge className="bg-green-500 text-white animate-pulse text-xs">New reply!</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <p className="text-sm bg-gray-50 p-3 rounded-lg mb-3">{d.question}</p>

                  {d.replies && d.replies.length > 0 && (
                    <div className="space-y-2">
                      {d.replies.map((r: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg text-sm border ${isNew && i === d.replies.length - 1 ? 'bg-green-50 border-green-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="font-medium text-green-700 text-xs">Teacher's Answer</span>
                            {r.teacherName && <span className="text-xs text-muted-foreground">· {r.teacherName}</span>}
                          </div>
                          <p>{r.reply}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {doubts.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No doubts posted yet. Ask your first question!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
