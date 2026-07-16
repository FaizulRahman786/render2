import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Progress } from '../../components/ui/progress';
import { Loader2, ClipboardList, PlayCircle, Clock, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export const StudentTestsPage: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Test-taking state
  const [testOpen, setTestOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qLoading, setQLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.student.getTests()
      .then((r) => { if (r.success) setTests(r.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const AUTOSAVE_KEY = (testId: string) => `test_autosave_${testId}`;

  const startTest = async (test: any) => {
    setQLoading(true);
    setActiveTest(test);
    setCurrentQ(0);
    setResult(null);
    setConfirmSubmit(false);
    try {
      const r = await api.student.getTestQuestions(test.id);
      if (!r.success || !r.data.length) {
        toast.error('This test has no questions yet. Check back later.');
        return;
      }
      setQuestions(r.data);
      // Restore autosaved answers if available
      const saved = localStorage.getItem(AUTOSAVE_KEY(test.id));
      setAnswers(saved ? JSON.parse(saved) : {});
      setTimeLeft((test.duration || 60) * 60);
      setTestOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Could not load test');
    } finally {
      setQLoading(false);
    }
  };

  // Autosave answers to localStorage every time answers change
  useEffect(() => {
    if (activeTest && testOpen && !result && Object.keys(answers).length > 0) {
      localStorage.setItem(AUTOSAVE_KEY(activeTest.id), JSON.stringify(answers));
    }
  }, [answers, activeTest, testOpen, result]);

  // Keep a ref to the latest handleSubmit so the timer's auto-submit always
  // sees the current answers (the interval closure is created once per test).
  const handleSubmitRef = useRef<(autoSubmit?: boolean) => void>(() => {});

  // Timer countdown
  useEffect(() => {
    if (!testOpen || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [testOpen, result]);

  const handleSubmit = async (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    setConfirmSubmit(false);
    try {
      const payload = questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] || '',
      }));
      const r = await api.student.submitTest(activeTest.id, payload);
      if (r.success) {
        // Clear autosaved answers after successful submission
        localStorage.removeItem(AUTOSAVE_KEY(activeTest.id));
        setResult(r.data);
        if (autoSubmit) toast.info('Time is up! Your answers were submitted automatically.');
        else toast.success('Test submitted!');
        // Refresh test list to mark as attempted
        const tRes = await api.student.getTests();
        if (tRes.success) setTests(tRes.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Submission failed');
      setTestOpen(false);
    } finally {
      setSubmitting(false);
    }
  };
  handleSubmitRef.current = handleSubmit;

  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;
  const progress = totalQ ? Math.round((answeredCount / totalQ) * 100) : 0;
  const isUrgent = timeLeft < 120;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tests & Assessments</h1>
        <p className="text-muted-foreground mt-2">View and attempt tests scheduled for your batches</p>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test Title</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.totalMarks}</TableCell>
                  <TableCell>{t.duration ? t.duration + ' min' : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'published' ? 'default' : 'secondary'}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'published' && (
                      <Button
                        size="sm"
                        onClick={() => startTest(t)}
                        disabled={qLoading}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600"
                      >
                        {qLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="h-4 w-4 mr-1" />Start Test</>}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {tests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No tests scheduled yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Test-Taking Dialog */}
      <Dialog open={testOpen} onOpenChange={(open) => { if (!open && !result) return; setTestOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-0">

          {/* Result Screen */}
          {result ? (
            <div className="flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${result.passed !== false ? 'bg-green-100' : 'bg-red-100'}`}>
                <CheckCircle2 className={`h-14 w-14 ${result.passed !== false ? 'text-green-500' : 'text-red-400'}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {result.passed === true ? 'Congratulations! You Passed' : result.passed === false ? 'Better Luck Next Time' : 'Test Submitted!'}
                </h2>
                <p className="text-muted-foreground mt-1">{activeTest?.title}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 w-full max-w-md">
                <Card className="text-center p-4">
                  <p className="text-3xl font-bold text-indigo-600">{result.marksObtained}</p>
                  <p className="text-xs text-muted-foreground mt-1">Marks Obtained</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-3xl font-bold text-gray-700">{result.totalMarks}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Marks</p>
                </Card>
                <Card className={`text-center p-4 ${result.percentage >= 50 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-3xl font-bold ${result.percentage >= 50 ? 'text-green-600' : 'text-red-500'}`}>{result.percentage}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Score</p>
                </Card>
              </div>
              <Button onClick={() => setTestOpen(false)} className="bg-gradient-to-r from-indigo-600 to-purple-600">
                Back to Tests
              </Button>
            </div>
          ) : confirmSubmit ? (
            /* Confirm Submit Screen */
            <div className="flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Submit Test?</h2>
                <p className="text-muted-foreground mt-2">
                  You have answered <strong>{answeredCount}</strong> of <strong>{totalQ}</strong> questions.
                  {answeredCount < totalQ && <span className="text-amber-600"> {totalQ - answeredCount} question{totalQ - answeredCount > 1 ? 's' : ''} unanswered.</span>}
                </p>
                <p className="text-sm text-red-500 mt-2">This action cannot be undone.</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Go Back</Button>
                <Button onClick={() => handleSubmit(false)} disabled={submitting} className="bg-gradient-to-r from-green-600 to-teal-600">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Confirm Submit'}
                </Button>
              </div>
            </div>
          ) : (
            /* Question Screen */
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className={`p-4 border-b flex items-center justify-between ${isUrgent ? 'bg-red-50' : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{activeTest?.title}</h2>
                  <p className="text-sm text-muted-foreground">Question {currentQ + 1} of {totalQ}</p>
                </div>
                <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-2 rounded-lg ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-white text-indigo-700'}`}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Progress */}
              <div className="px-6 pt-4 pb-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{answeredCount} answered</span>
                  <span>{totalQ - answeredCount} remaining</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Question Navigator */}
              <div className="px-6 py-3 flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(idx)}
                    className={`w-8 h-8 rounded text-xs font-bold border-2 transition-colors ${idx === currentQ ? 'bg-indigo-600 border-indigo-600 text-white' : answers[q.id] ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-400'}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Current Question */}
              {questions[currentQ] && (
                <div className="px-6 py-4 flex-1">
                  <Card className="border-indigo-100">
                    <CardContent className="p-6 space-y-5">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Q{currentQ + 1} · {questions[currentQ].marks} mark{questions[currentQ].marks > 1 ? 's' : ''}</p>
                        <p className="text-base font-medium text-gray-900 leading-relaxed">{questions[currentQ].questionText}</p>
                      </div>

                      <div className="space-y-3">
                        {(Array.isArray(questions[currentQ].options) ? questions[currentQ].options : []).map((opt: string, optIdx: number) => {
                          const label = OPTION_LABELS[optIdx];
                          const selected = answers[questions[currentQ].id] === label;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => setAnswers(prev => ({ ...prev, [questions[currentQ].id]: label }))}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm border-2 ${selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-gray-500'}`}>
                                {label}
                              </div>
                              <span className="text-sm">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                  disabled={currentQ === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                {currentQ < totalQ - 1 ? (
                  <Button
                    onClick={() => setCurrentQ(prev => Math.min(totalQ - 1, prev + 1))}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setConfirmSubmit(true)}
                    className="bg-gradient-to-r from-green-600 to-teal-600"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Test
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
