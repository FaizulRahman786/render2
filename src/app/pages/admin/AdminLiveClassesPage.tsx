import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Loader2, Video, Search, ExternalLink, Calendar, RefreshCw, Radio, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { format } from 'date-fns';

const STATUS_META: Record<string, { label: string; variant: any; icon: React.ReactNode; color: string }> = {
  scheduled: { label: 'Scheduled', variant: 'default',     icon: <Clock className="h-3.5 w-3.5" />,       color: 'bg-blue-100 text-blue-700 border-blue-200' },
  live:       { label: 'Live',      variant: 'destructive', icon: <Radio className="h-3.5 w-3.5" />,        color: 'bg-red-100 text-red-700 border-red-200 animate-pulse' },
  completed:  { label: 'Completed', variant: 'secondary',   icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled:  { label: 'Cancelled', variant: 'outline',     icon: <XCircle className="h-3.5 w-3.5" />,      color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export const AdminLiveClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback((p: number, q: string, status: string) => {
    setLoading(true);
    const params: any = { page: p, limit: 20, search: q || undefined, status: status !== 'all' ? status : undefined };
    api.admin.getLiveClasses(params)
      .then((r) => {
        if (r.success) {
          setClasses(r.data);
          setTotal(r.pagination?.total ?? r.data.length);
          setTotalPages(r.pagination?.totalPages ?? 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1, search, statusFilter); setPage(1); }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, search, statusFilter);
  };

  const handlePage = (p: number) => { setPage(p); load(p, search, statusFilter); };

  const liveCount      = classes.filter(c => c.status === 'live').length;
  const scheduledCount = classes.filter(c => c.status === 'scheduled').length;
  const completedCount = classes.filter(c => c.status === 'completed').length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Video className="h-8 w-8 text-red-600" />
              Live Classes
            </h1>
            <p className="text-muted-foreground mt-1">Monitor all live and scheduled sessions across batches</p>
          </div>
          <Button variant="outline" onClick={() => load(page, search, statusFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: total, color: 'text-gray-900', bg: 'bg-gray-50', icon: <Video className="h-5 w-5 text-gray-500" /> },
            { label: 'Scheduled (this page)', value: scheduledCount, color: 'text-blue-700', bg: 'bg-blue-50', icon: <Clock className="h-5 w-5 text-blue-600" /> },
            { label: 'Live Now (this page)', value: liveCount, color: 'text-red-700', bg: 'bg-red-50', icon: <Radio className="h-5 w-5 text-red-600" /> },
            { label: 'Completed (this page)', value: completedCount, color: 'text-green-700', bg: 'bg-green-50', icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className={`p-5 ${s.bg} rounded-lg`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">{s.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-60">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by title, teacher, or batch…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button type="submit" variant="outline">Search</Button>
              </form>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-red-600" />
              All Sessions
              <span className="ml-auto text-sm font-normal text-muted-foreground">{total} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-red-600" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead>Class</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-20">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((c) => {
                      const meta = STATUS_META[c.status] ?? STATUS_META['scheduled'];
                      return (
                        <TableRow key={c.id} className="hover:bg-gray-50/50">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{c.title}</p>
                              {c.description && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground truncate max-w-52 cursor-default">{c.description}</p>
                                  </TooltipTrigger>
                                  <TooltipContent><p className="max-w-xs text-xs">{c.description}</p></TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{c.teacherName ?? '—'}</TableCell>
                          <TableCell>
                            {c.batchName ? (
                              <Badge variant="outline" className="text-xs">{c.batchName}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.scheduledDate ? (
                              <div>
                                <p>{format(new Date(c.scheduledDate), 'dd MMM yyyy')}</p>
                                <p className="text-xs text-muted-foreground">{c.scheduledTime ?? ''}</p>
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {c.duration ? `${c.duration} min` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${meta.color}`}>
                              {meta.icon} {meta.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {c.meetingLink ? (
                              <a href={c.meetingLink} target="_blank" rel="noopener noreferrer" aria-label={`Open meeting link for ${c.title}`}>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" tabIndex={-1}>
                                  <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                                </Button>
                              </a>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {classes.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                          <Video className="h-8 w-8 mx-auto mb-3 opacity-30" />
                          No live classes found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePage(page - 1)} disabled={page <= 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => handlePage(page + 1)} disabled={page >= totalPages}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};
