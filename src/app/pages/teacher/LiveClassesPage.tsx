import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Trash2, Loader2, RefreshCw, Video, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const LiveClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', batchId: '', scheduledAt: '', duration: '60', meetLink: '', description: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.teacher.getLiveClasses(), api.teacher.getBatches()]).then(([c, b]) => {
      if (c.success) setClasses(c.data);
      if (b.success) setBatches(b.data);
    }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt) : null;
      await api.teacher.createLiveClass({
        title: form.title,
        batchId: form.batchId,
        description: form.description,
        duration: Number(form.duration) || 60,
        meetingLink: form.meetLink,
        scheduledDate: scheduledAt?.toISOString(),
        scheduledTime: scheduledAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '',
      });
      toast.success('Live class scheduled');
      setAddOpen(false);
      setForm({ title: '', batchId: '', scheduledAt: '', duration: '60', meetLink: '', description: '' });
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this live class?')) return;
    try { await api.teacher.deleteLiveClass(id); toast.success('Class cancelled'); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Classes</h1>
          <p className="text-muted-foreground mt-2">Schedule and manage live teaching sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-red-600 to-pink-600"><Plus className="h-4 w-4 mr-2" /> Schedule Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Live Class</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-4">
                <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required /></div>
                <div>
                  <Label>Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm({...form, batchId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Scheduled At *</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({...form, scheduledAt: e.target.value})} required /></div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({...form, duration: e.target.value})} /></div>
                </div>
                <div><Label>Meet Link *</Label><Input type="url" placeholder="https://meet.google.com/..." value={form.meetLink} onChange={(e) => setForm({...form, meetLink: e.target.value})} required /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
                <Button type="submit" className="w-full" disabled={saving || !form.batchId}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scheduling...</> : 'Schedule Class'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Batch</TableHead><TableHead>Scheduled</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Link</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.title}</TableCell>
                  <TableCell>{c.batchName || '—'}</TableCell>
                  <TableCell className="text-sm">{c.scheduledDate ? new Date(c.scheduledDate).toLocaleString() : '—'}</TableCell>
                  <TableCell>{c.duration ? c.duration + ' min' : '—'}</TableCell>
                  <TableCell><Badge variant={c.status === 'live' ? 'destructive' : c.status === 'completed' ? 'secondary' : 'default'}>{c.status}</Badge></TableCell>
                  <TableCell>{c.meetingLink && <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600"><ExternalLink className="h-4 w-4" /></a>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No live classes scheduled</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
