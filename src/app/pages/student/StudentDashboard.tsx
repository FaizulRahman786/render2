import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import {
  Video, ClipboardList, FileText, ExternalLink, IndianRupee, TrendingUp,
  BookOpen, MessageCircle, CalendarCheck, GraduationCap, AlertCircle, Loader2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.student.dashboard().then((r) => { if (r.success) setStats(r.data); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const gradeColor = (pct: number) => pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';
  const gradeLabel = (pct: number) => pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, <span className="text-indigo-600">{user?.name?.split(' ')[0]}</span>!
        </h1>
        <p className="text-muted-foreground mt-1">Here's your learning snapshot for today.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Fee alert */}
          {stats?.feeStatus && Number(stats.feeStatus.outstanding) > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-orange-800">Fee Due</p>
                    <p className="text-sm text-orange-600">
                      ₹{Number(stats.feeStatus.outstanding).toLocaleString('en-IN')} due by{' '}
                      {stats.feeStatus.dueDate ? format(new Date(stats.feeStatus.dueDate), 'dd MMM yyyy') : '—'}
                    </p>
                  </div>
                  <Link to="/student/fees" className="ml-auto">
                    <Button size="sm" variant="outline" className="border-orange-400 text-orange-700">View Fees</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><ClipboardList className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available Tests</p>
                    <p className="text-2xl font-bold">{stats?.availableTestsCount ?? 0}</p>
                  </div>
                </div>
                <Link to="/student/tests" className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1">
                  Take a test <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg"><BookOpen className="h-5 w-5 text-orange-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pending Assignments</p>
                    <p className="text-2xl font-bold">{stats?.pendingAssignments?.length ?? 0}</p>
                  </div>
                </div>
                <Link to="/student/assignments" className="text-xs text-orange-600 hover:underline mt-2 flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg"><MessageCircle className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Open Doubts</p>
                    <p className="text-2xl font-bold">{stats?.openDoubtsCount ?? 0}</p>
                  </div>
                </div>
                <Link to="/student/doubts" className="text-xs text-purple-600 hover:underline mt-2 flex items-center gap-1">
                  View doubts <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg"><CalendarCheck className="h-5 w-5 text-green-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                    <p className="text-2xl font-bold">
                      {stats?.attendancePct !== null && stats?.attendancePct !== undefined ? `${stats.attendancePct}%` : '—'}
                    </p>
                  </div>
                </div>
                {stats?.attendanceSessions > 0 && (
                  <Progress value={stats.attendancePct} className="h-1.5 mt-2" />
                )}
                {stats?.attendancePct === null && (
                  <p className="text-xs text-muted-foreground mt-2">No sessions yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming assignments */}
          {stats?.pendingAssignments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-orange-600" />Upcoming Assignments</span>
                  <Link to="/student/assignments"><Button variant="ghost" size="sm" className="text-xs">View all <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.pendingAssignments.map((a: any) => {
                    const due = new Date(a.dueDate);
                    const isNear = due.getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;
                    return (
                      <div key={a.id} className={`flex items-center justify-between p-3 border rounded-lg ${isNear ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <div>
                          <p className="font-medium text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.batchName ?? a.courseName ?? ''}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={`text-xs font-medium ${isNear ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            Due {formatDistanceToNow(due, { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground">{format(due, 'dd MMM')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming live classes */}
          {stats?.upcomingClasses?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Video className="h-5 w-5 text-blue-600" />Upcoming Live Classes</span>
                  <Link to="/student/classes"><Button variant="ghost" size="sm" className="text-xs">View all <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.upcomingClasses.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.teacherName}{c.batchName ? ` · ${c.batchName}` : ''} ·{' '}
                          {c.scheduledDate ? format(new Date(c.scheduledDate), 'dd MMM') : ''} {c.scheduledTime || ''}
                        </p>
                      </div>
                      {c.meetingLink && (
                        <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="bg-blue-600 ml-3"><ExternalLink className="h-3 w-3 mr-1" />Join</Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: recent results + recent materials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent test results */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />Recent Results</span>
                  <Link to="/student/results"><Button variant="ghost" size="sm" className="text-xs">All <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentResults?.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentResults.map((r: any) => {
                      const pct = Number(r.percentage);
                      return (
                        <div key={r.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{r.testTitle}</p>
                            <p className="text-xs text-muted-foreground">{r.marksObtained}/{r.totalMarks} marks</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span className={`text-sm font-bold ${gradeColor(pct)}`}>{pct}%</span>
                            <Badge variant="outline" className="text-xs">{gradeLabel(pct)}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No graded results yet</p>
                )}
              </CardContent>
            </Card>

            {/* Recent materials */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-purple-600" />Recent Materials</span>
                  <Link to="/student/materials"><Button variant="ghost" size="sm" className="text-xs">All <ArrowRight className="h-3 w-3 ml-1" /></Button></Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentMaterials?.length > 0 ? (
                  <div className="space-y-2">
                    {stats.recentMaterials.map((m: any) => (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 border rounded-lg">
                        <div className="p-1.5 bg-purple-100 rounded flex-shrink-0"><FileText className="h-3.5 w-3.5 text-purple-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.uploaderName}</p>
                        </div>
                        {m.fileUrl && (
                          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline flex-shrink-0">Open</a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No materials uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Nav */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Quick Navigation</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'My Courses', href: '/student/courses', icon: BookOpen, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                  { label: 'Study Materials', href: '/student/materials', icon: FileText, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
                  { label: 'Live Classes', href: '/student/classes', icon: Video, color: 'text-red-600 bg-red-50 hover:bg-red-100' },
                  { label: 'Tests', href: '/student/tests', icon: ClipboardList, color: 'text-green-600 bg-green-50 hover:bg-green-100' },
                  { label: 'Assignments', href: '/student/assignments', icon: BookOpen, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
                  { label: 'Ask a Doubt', href: '/student/doubts', icon: MessageCircle, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
                  { label: 'My Results', href: '/student/results', icon: TrendingUp, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
                  { label: 'Fees', href: '/student/fees', icon: IndianRupee, color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' },
                ].map((a) => (
                  <Link key={a.label} to={a.href} className={`flex items-center gap-2 p-3 text-sm font-medium rounded-lg transition-colors ${a.color}`}>
                    <a.icon className="h-4 w-4 flex-shrink-0" />
                    {a.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
