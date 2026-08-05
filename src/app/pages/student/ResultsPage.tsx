import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, RefreshCw, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { useRealtimeNotifications, RealtimeNotificationEvent } from '../../hooks/useRealtimeNotifications';

export const ResultsPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newResultAlert, setNewResultAlert] = useState(false);

  const loadResults = useCallback(() => {
    setLoading(true);
    api.student.getResults()
      .then((r) => { if (r.success) setResults(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadResults(); }, [loadResults]);

  // Listen for real-time notifications — show banner when a test result arrives
  useRealtimeNotifications({
    onNotification: (n: RealtimeNotificationEvent) => {
      if (n.type === 'test' || n.title?.toLowerCase().includes('result') || n.title?.toLowerCase().includes('grade')) {
        setNewResultAlert(true);
      }
    },
  });

  const avg = results.length ? Math.round(results.reduce((s, r) => s + (Number(r.marksObtained) / Number(r.totalMarks)) * 100, 0) / results.length) : 0;
  const best = results.length ? Math.max(...results.map(r => Math.round((Number(r.marksObtained) / Number(r.totalMarks)) * 100))) : 0;
  const isPass = (r: any) => r.passingMarks != null ? (Number(r.marksObtained) / Number(r.totalMarks)) * 100 >= Number(r.passingMarks) : (Number(r.marksObtained) / Number(r.totalMarks)) * 100 >= 60;
  const passes = results.filter(r => r.status !== 'pending' && isPass(r)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
          <p className="text-muted-foreground mt-2">Your test performance history</p>
        </div>
        <Button variant="outline" onClick={() => { setNewResultAlert(false); loadResults(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {newResultAlert && (
        <div className="flex items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
          <p className="font-medium">🎉 A new test result may be available!</p>
          <Button size="sm" onClick={() => { setNewResultAlert(false); loadResults(); }}>
            Load Results
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Tests Attempted</p><h3 className="text-3xl font-bold mt-2">{results.length}</h3></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Average Score</p><h3 className="text-3xl font-bold mt-2 text-blue-600">{avg}%</h3></CardContent></Card>
        <Card><CardContent className="p-6 flex items-center gap-3"><Trophy className="h-8 w-8 text-yellow-500 flex-shrink-0" /><div><p className="text-sm text-muted-foreground">Best Score</p><h3 className="text-3xl font-bold text-green-600">{best}%</h3></div></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Tests Passed</p><h3 className="text-3xl font-bold mt-2 text-green-600">{passes}</h3></CardContent></Card>
      </div>

      {loading ? <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div> : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Test</TableHead><TableHead>Marks</TableHead><TableHead>Percentage</TableHead><TableHead>Grade</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => {
                const pct = Math.round((Number(r.marksObtained) / Number(r.totalMarks)) * 100);
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';
                const passed = isPass(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.testTitle || 'Test'}</TableCell>
                    <TableCell>{r.status === 'pending' ? '—' : `${r.marksObtained}/${r.totalMarks}`}</TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <Badge variant="secondary">Awaiting evaluation</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${passed ? 'bg-blue-600' : 'bg-red-400'}`} style={{ width: pct + '%' }} />
                          </div>
                          <span className="text-sm">{pct}%</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.status === 'pending' ? (
                        <Badge variant="secondary">—</Badge>
                      ) : (
                        <Badge variant={passed ? 'default' : 'secondary'} className={pct >= 90 ? 'bg-green-600' : ''}>
                          {grade}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                );
              })}
              {results.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No results yet. Take a test to see your scores here!</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
