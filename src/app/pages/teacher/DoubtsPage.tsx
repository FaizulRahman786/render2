import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Loader2, RefreshCw, MessageSquare, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const DoubtsPage: React.FC = () => {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.teacher.getDoubts().then((r) => { if (r.success) setDoubts(r.data); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleReply = async (doubtId: string) => {
    const reply = replyText[doubtId];
    if (!reply?.trim()) return;
    setSending(doubtId);
    try {
      await api.teacher.replyDoubt(doubtId, reply);
      toast.success('Reply sent');
      setReplyText({ ...replyText, [doubtId]: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSending(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Doubts</h1>
          <p className="text-muted-foreground mt-2">Answer questions from your students</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="destructive">{doubts.filter(d => d.status === 'open').length} Open</Badge>
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <div className="space-y-4">
          {doubts.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{d.studentName || 'Student'}</span>
                      <Badge variant={d.status === 'open' ? 'destructive' : 'secondary'} className="text-xs">{d.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{d.subjectName || 'General'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</span>
                </div>
                <p className="mb-4 bg-gray-50 p-3 rounded-lg text-sm">{d.question}</p>
                {d.replies && d.replies.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {d.replies.map((r: any, i: number) => (
                      <div key={i} className="bg-blue-50 p-3 rounded-lg text-sm">
                        <span className="font-medium text-blue-700">Teacher: </span>{r.reply}
                      </div>
                    ))}
                  </div>
                )}
                {d.status === 'open' && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Write your answer..."
                      className="text-sm"
                      value={replyText[d.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [d.id]: e.target.value })}
                    />
                    <Button onClick={() => handleReply(d.id)} disabled={sending === d.id} className="shrink-0">
                      {sending === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {doubts.length === 0 && <Card><CardContent className="text-center py-12 text-muted-foreground">No doubts from students yet</CardContent></Card>}
        </div>
      )}
    </div>
  );
};
