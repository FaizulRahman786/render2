import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, CalendarCheck, Plus, CheckCircle2, XCircle, Clock, Edit, Trash2, ChevronRight } from 'lucide-react';
import { api, BASE_URL, getAuthToken } from '../../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

const authHeader = async (): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const apiFetch = async (url: string, opts?: RequestInit) => {
  // url may be like '/api/teacher/...' — strip leading /api to join with BASE_URL which already contains /api
  const path = url.startsWith('/api') ? url.slice(4) : url;
  const headers = await authHeader();
  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...headers, ...(opts?.headers ?? {}) } });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const message = typeof data === 'string' ? data : (data.error || data.message || `Request failed (${res.status})`);
    throw new Error(message);
  }
  return data;
};

const STATUS_STYLES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  present: { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Present' },
  absent:  { color: 'bg-red-100 text-red-700 border-red-200',   icon: <XCircle className="h-3.5 w-3.5" />,      label: 'Absent'  },
  late:    { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'Late'    },
};

export const AttendancePage: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', sessionDate: '', topic: '' });

  useEffect(() => {
    api.teacher.getBatches().then((r) => {
      if (r.success) {
        setBatches(r.data);
        if (r.data.length > 0) setSelectedBatch(r.data[0].id);
      }
    }).catch(console.error);
  }, []);

  const fetchSessions = useCallback((batchId: string, resetSelection: boolean) => {
    if (!batchId) return;
    setLoadingSessions(true);
    if (resetSelection) {
      setActiveSession(null);
      setSessionRecords([]);
    }
    apiFetch(`/api/teacher/attendance/sessions?batchId=${batchId}`)
      .then(r => { if (r.success) setSessions(r.data); })
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, []);

  const loadSessions = useCallback((batchId: string) => fetchSessions(batchId, true), [fetchSessions]);
  const refreshSessions = useCallback((batchId: string) => fetchSessions(batchId, false), [fetchSessions]);

  useEffect(() => { if (selectedBatch) loadSessions(selectedBatch); }, [selectedBatch, loadSessions]);

  const openSession = (session: any) => {
    setActiveSession(session);
    setLoadingRecords(true);
    apiFetch(`/api/teacher/attendance/sessions/${session.id}`)
      .then(r => { if (r.success) setSessionRecords(r.data.records); })
      .catch(console.error)
      .finally(() => setLoadingRecords(false));
  };

  const setStatus = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setSessionRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
  };

  const saveAttendance = async () => {
    if (!activeSession) return;
    setSaving(true);
    try {
      const session = activeSession;
      const r = await apiFetch(`/api/teacher/attendance/sessions/${session.id}`, {
        method: 'PUT',
        body: JSON.stringify({ records: sessionRecords.map(r => ({ studentId: r.studentId, status: r.status, note: r.note })) }),
      });
      if (!r || !r.success) { toast.error('Failed to save attendance. Please try again.'); return; }
      const present = sessionRecords.filter(r => r.status === 'present').length;
      const absent  = sessionRecords.filter(r => r.status === 'absent').length;
      const late    = sessionRecords.filter(r => r.status === 'late').length;
      setActiveSession({ ...session, presentCount: present, absentCount: absent, lateCount: late, totalRecords: sessionRecords.length });
      refreshSessions(selectedBatch);
      toast.success('Attendance saved');
    } catch (e: any) { console.error(e); toast.error(e.message || 'Failed to save attendance'); }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    if (!newSession.title || !newSession.sessionDate) return;
    setCreateLoading(true);
    try {
      const r = await apiFetch('/api/teacher/attendance/sessions', {
        method: 'POST',
        body: JSON.stringify({ batchId: selectedBatch, ...newSession }),
      });
      if (r.success) {
        setShowCreate(false);
        setNewSession({ title: '', sessionDate: '', topic: '' });
        loadSessions(selectedBatch);
        openSession(r.data.session);
      } else {
        toast.error(r.error || 'Failed to create session');
      }
    } catch (e: any) { console.error(e); toast.error(e.message || 'Failed to create session'); }
    finally { setCreateLoading(false); }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this attendance session? This cannot be undone.')) return;
    try {
      const r = await apiFetch(`/api/teacher/attendance/sessions/${sessionId}`, { method: 'DELETE' });
      if (!r?.success) { toast.error(r?.error || 'Failed to delete session'); return; }
      if (activeSession?.id === sessionId) { setActiveSession(null); setSessionRecords([]); }
      loadSessions(selectedBatch);
      toast.success('Session deleted');
    } catch (e: any) { console.error(e); toast.error(e.message || 'Failed to delete session'); }
  };

  const batch = batches.find(b => b.id === selectedBatch);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-indigo-600" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">Take and manage class attendance per batch session</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select batch…" />
            </SelectTrigger>
            <SelectContent>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}{b.courseName ? ` · ${b.courseName}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button disabled={!selectedBatch} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Attendance Session</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Session Title *</Label>
                  <Input className="mt-1" placeholder="e.g. Class 1 - Introduction" value={newSession.title} onChange={e => setNewSession(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input className="mt-1" type="datetime-local" value={newSession.sessionDate} onChange={e => setNewSession(p => ({ ...p, sessionDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Topic (optional)</Label>
                  <Input className="mt-1" placeholder="e.g. Newton's Laws" value={newSession.topic} onChange={e => setNewSession(p => ({ ...p, topic: e.target.value }))} />
                </div>
                <p className="text-xs text-muted-foreground">All students in {batch?.name ?? 'this batch'} will be pre-marked as Present.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLoading || !newSession.title || !newSession.sessionDate} className="bg-indigo-600 hover:bg-indigo-700">
                  {createLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create & Take Attendance
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sessions list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingSessions ? (
                <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm px-4">
                  <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No sessions yet. Create one to start tracking attendance.
                </div>
              ) : (
                <div className="divide-y">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${activeSession?.id === s.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''}`}
                      onClick={() => openSession(s)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSession(s); } }}
                      aria-label={s.title}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(s.sessionDate), 'dd MMM yyyy, hh:mm a')}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-green-700">✓ {Number(s.presentCount ?? 0)}</span>
                          <span className="text-xs text-red-600">✗ {Number(s.absentCount ?? 0)}</span>
                          {Number(s.lateCount) > 0 && <span className="text-xs text-yellow-700">⏰ {Number(s.lateCount)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} aria-label={`Delete session ${s.title}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mark attendance */}
        <div className="lg:col-span-3">
          {!activeSession ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <Edit className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Select a session from the left to mark attendance,<br />or create a new session.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{activeSession.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {format(new Date(activeSession.sessionDate), 'EEEE, dd MMM yyyy · hh:mm a')}
                      {activeSession.topic && <span> · {activeSession.topic}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {(['present', 'absent', 'late'] as const).map(s => (
                      <span key={s} className={`px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLES[s].color}`}>
                        {sessionRecords.filter(r => r.status === s).length} {STATUS_STYLES[s].label}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Quick mark all buttons */}
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="text-green-700 border-green-200 hover:bg-green-50 text-xs" onClick={() => setSessionRecords(prev => prev.map(r => ({ ...r, status: 'present' })))}>All Present</Button>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => setSessionRecords(prev => prev.map(r => ({ ...r, status: 'absent' })))}>All Absent</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingRecords ? (
                  <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center w-36">Status</TableHead>
                        <TableHead className="w-36">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionRecords.map((r) => (
                        <TableRow key={r.studentId}>
                          <TableCell className="font-medium text-sm">{r.studentName}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              {(['present', 'absent', 'late'] as const).map(status => (
                                <button
                                  key={status}
                                  onClick={() => setStatus(r.studentId, status)}
                                  className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all ${r.status === status ? STATUS_STYLES[status].color : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}
                                >
                                  {STATUS_STYLES[status].icon}
                                  <span className="hidden sm:inline">{STATUS_STYLES[status].label}</span>
                                </button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-7 text-xs"
                              placeholder="Note…"
                              value={r.note ?? ''}
                              onChange={(e) => setSessionRecords(prev => prev.map(rec => rec.studentId === r.studentId ? { ...rec, note: e.target.value } : rec))}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {sessionRecords.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-sm">No students in this batch</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {sessionRecords.length > 0 && (
                <div className="p-4 border-t">
                  <Button onClick={saveAttendance} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Attendance
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
