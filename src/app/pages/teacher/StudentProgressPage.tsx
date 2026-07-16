import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Progress } from '../../components/ui/progress';
import { Loader2, Users, TrendingUp, ClipboardCheck, MessageCircle, Trophy, RefreshCw, GraduationCap } from 'lucide-react';
import { api, BASE_URL, getAuthToken } from '../../lib/api';

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'A':  'bg-green-100 text-green-700 border-green-200',
  'B':  'bg-blue-100 text-blue-700 border-blue-200',
  'C':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'D':  'bg-red-100 text-red-700 border-red-200',
  '—':  'bg-gray-100 text-gray-500 border-gray-200',
};

export const StudentProgressPage: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [progress, setProgress] = useState<any[]>([]);
  const [meta, setMeta] = useState({ totalTests: 0, totalAssignments: 0 });
  const [loading, setLoading] = useState(false);
  const [batchesLoading, setBatchesLoading] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'avgTestScore' | 'assignmentsSubmitted' | 'grade'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    api.teacher.getBatches()
      .then((r) => {
        if (r.success) {
          setBatches(r.data);
          if (r.data.length > 0) setSelectedBatch(r.data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setBatchesLoading(false));
  }, []);

  const loadProgress = useCallback((batchId: string) => {
    if (!batchId) return;
    setLoading(true);
    void (async () => {
      const path = `/teacher/batches/${batchId}/students/progress`;
      const token = await getAuthToken();
      return fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    })()
      .then(r => r.json())
      .then((r) => {
        if (r.success) {
          setProgress(r.data);
          setMeta({ totalTests: r.totalTests, totalAssignments: r.totalAssignments });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBatch) loadProgress(selectedBatch);
  }, [selectedBatch, loadProgress]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...progress].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  const avgScore = avg(progress.map(p => p.avgTestScore));
  const avgSubmission = meta.totalAssignments > 0
    ? Math.round(progress.reduce((s, p) => s + p.assignmentsSubmitted, 0) / Math.max(1, progress.length))
    : 0;
  const topStudents = progress.filter(p => p.avgTestScore >= 80).length;
  const atRisk = progress.filter(p => p.avgTestScore > 0 && p.avgTestScore < 50).length;

  const SortIcon = ({ field }: { field: typeof sortField }) => (
    <span className="ml-1 text-muted-foreground">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              Student Progress
            </h1>
            <p className="text-muted-foreground mt-1">Per-student performance across tests, assignments, and doubts</p>
          </div>
          <div className="flex items-center gap-3">
            {batchesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Select batch…" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.courseName ? `· ${b.courseName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={() => loadProgress(selectedBatch)} disabled={loading || !selectedBatch}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {!selectedBatch && !batchesLoading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>You are not assigned to any batch yet.</p>
            </CardContent>
          </Card>
        )}

        {selectedBatch && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg"><Users className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="text-2xl font-bold">{progress.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Test Score</p>
                      <p className="text-2xl font-bold">{avgScore}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg"><Trophy className="h-5 w-5 text-green-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Top Performers</p>
                      <p className="text-2xl font-bold text-green-600">{topStudents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg"><TrendingUp className="h-5 w-5 text-red-600" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">At Risk (&lt;50%)</p>
                      <p className="text-2xl font-bold text-red-600">{atRisk}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Context banner */}
            <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg text-sm text-muted-foreground border">
              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" />{meta.totalTests} tests in batch</span>
              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" />{meta.totalAssignments} assignments in batch</span>
              <span className="flex items-center gap-1.5"><ClipboardCheck className="h-4 w-4" />Avg {avgSubmission}/{meta.totalAssignments} assignments submitted</span>
            </div>

            {/* Progress Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  Student Breakdown
                  <span className="text-sm font-normal text-muted-foreground ml-2">— click column headers to sort</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50">
                          <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                            Student <SortIcon field="name" />
                          </TableHead>
                          <TableHead className="cursor-pointer select-none w-52" onClick={() => handleSort('avgTestScore')}>
                            Test Score <SortIcon field="avgTestScore" />
                          </TableHead>
                          <TableHead className="w-36">Tests</TableHead>
                          <TableHead className="cursor-pointer select-none w-44" onClick={() => handleSort('assignmentsSubmitted')}>
                            Assignments <SortIcon field="assignmentsSubmitted" />
                          </TableHead>
                          <TableHead className="w-28">Doubts</TableHead>
                          <TableHead className="cursor-pointer select-none w-20 text-center" onClick={() => handleSort('grade')}>
                            Grade <SortIcon field="grade" />
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sorted.map((s) => (
                          <TableRow key={s.studentId} className="hover:bg-gray-50/50">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{s.name}</p>
                                <p className="text-xs text-muted-foreground">{s.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`font-semibold ${s.avgTestScore >= 70 ? 'text-green-700' : s.avgTestScore >= 50 ? 'text-yellow-700' : s.avgTestScore > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {s.avgTestScore > 0 ? `${s.avgTestScore}%` : '—'}
                                  </span>
                                  {s.bestTestScore > 0 && <span className="text-muted-foreground">best {s.bestTestScore}%</span>}
                                </div>
                                {s.avgTestScore > 0 && (
                                  <Progress
                                    value={s.avgTestScore}
                                    className={`h-1.5 ${s.avgTestScore >= 70 ? '[&>div]:bg-green-500' : s.avgTestScore >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-400'}`}
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm cursor-default">
                                    {s.testsAttempted}/{meta.totalTests}
                                    {meta.totalTests > 0 && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        ({Math.round(s.testsAttempted / meta.totalTests * 100)}%)
                                      </span>
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Tests attempted out of {meta.totalTests} total</p></TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span>{s.assignmentsSubmitted}/{meta.totalAssignments}</span>
                                {s.assignmentsGraded > 0 && (
                                  <span className="text-xs text-muted-foreground ml-1">· {s.assignmentsGraded} graded</span>
                                )}
                                {meta.totalAssignments > 0 && s.assignmentsSubmitted < meta.totalAssignments && (
                                  <Badge variant="outline" className="ml-1 text-xs border-orange-200 text-orange-600">
                                    {meta.totalAssignments - s.assignmentsSubmitted} pending
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{s.totalDoubts}</span>
                                {s.openDoubts > 0 && (
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0">{s.openDoubts} open</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-bold ${GRADE_COLORS[s.grade]}`}>
                                {s.grade}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        {sorted.length === 0 && !loading && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                              <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                              No students enrolled in this batch yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
