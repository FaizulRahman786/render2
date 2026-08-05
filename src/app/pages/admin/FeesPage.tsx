import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Plus, Loader2, RefreshCw, IndianRupee, CheckCircle, Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { TablePagination } from '../../components/shared/TablePagination';
import { toast } from 'sonner';

const DEFAULT_LIMIT = 20;

export const FeesPage: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ totalAmount: 0, totalDiscount: 0 });
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentId: '', amount: '', dueDate: '', description: '', feeType: 'tuition' });
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback((p = page, s = search) => {
    setLoading(true);
    api.admin.getFees({ page: p, limit: DEFAULT_LIMIT, search: s || undefined })
      .then((r) => {
        if (r.success) {
          setFees(r.data);
          setPagination(r.pagination);
          if (r.stats) setStats(r.stats);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  const loadStudents = () => {
    api.admin.getAllStudents().then((r) => { if (r.success) setAllStudents(r.data); }).catch(console.error);
  };

  useEffect(() => { load(); loadStudents(); }, [page]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setPage(1);
      load(1, val);
    }, 400);
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.admin.createFee({ studentId: form.studentId, totalAmount: form.amount, dueDate: form.dueDate });
      toast.success('Fee record created');
      setAddOpen(false);
      setForm({ studentId: '', amount: '', dueDate: '', description: '', feeType: 'tuition' });
      load(1, search);
      setPage(1);
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleRecordPayment = async (feeId: string) => {
    setSaving(true);
    try {
      await api.admin.recordPayment(feeId, { amount: payAmount, paymentMode: payMethod });
      toast.success('Payment recorded');
      setPayOpen(null);
      setPayAmount('');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fees Management</h1>
          <p className="text-muted-foreground mt-2">Track fees and payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => load()}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-teal-600"><Plus className="h-4 w-4 mr-2" /> Add Fee</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Fee Record</DialogTitle></DialogHeader>
              <form onSubmit={handleAddFee} className="space-y-4 mt-4">
                <div>
                  <Label>Student *</Label>
                  <Select value={form.studentId} onValueChange={(v) => setForm({...form, studentId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {allStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required /></div>
                  <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({...form, dueDate: e.target.value})} /></div>
                </div>
                <Button type="submit" className="w-full" disabled={saving || !form.studentId}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Fee Record'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-blue-100 rounded-xl"><IndianRupee className="h-6 w-6 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Billed</p><h3 className="text-2xl font-bold text-blue-600">₹{Number(stats.totalAmount).toLocaleString('en-IN')}</h3></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-orange-100 rounded-xl"><IndianRupee className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-muted-foreground">Total Discount</p><h3 className="text-2xl font-bold text-orange-600">₹{Number(stats.totalDiscount).toLocaleString('en-IN')}</h3></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-green-100 rounded-xl"><IndianRupee className="h-6 w-6 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Records</p><h3 className="text-2xl font-bold">{pagination.total}</h3></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Fee Records</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                className="pl-9 pr-8 w-56"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); load(1, ''); }} className="absolute right-2 top-2.5 text-muted-foreground hover:text-gray-900">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Final</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <div className="font-medium">{f.studentName || '—'}</div>
                          <div className="text-xs text-muted-foreground">{f.studentEmail}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.courseName || '—'}</TableCell>
                        <TableCell>₹{Number(f.totalAmount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-orange-600">{Number(f.discount) > 0 ? `₹${Number(f.discount).toLocaleString('en-IN')}` : '—'}</TableCell>
                        <TableCell className="font-medium text-green-700">₹{Number(f.finalAmount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Dialog open={payOpen === f.id} onOpenChange={(o) => setPayOpen(o ? f.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />Record Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Record Payment for {f.studentName}</DialogTitle></DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div><Label>Amount (₹)</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder={String(f.finalAmount)} /></div>
                                <div>
                                  <Label>Payment Method</Label>
                                  <Select value={payMethod} onValueChange={setPayMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="upi">UPI</SelectItem>
                                      <SelectItem value="card">Card</SelectItem>
                                      <SelectItem value="net_banking">Net Banking</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button className="w-full" disabled={saving || !payAmount} onClick={() => handleRecordPayment(f.id)}>
                                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recording...</> : 'Record Payment'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                    {fees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {search ? 'No fees match your search' : 'No fee records yet'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <TablePagination
                pagination={pagination}
                onPageChange={(p) => { setPage(p); }}
                onLimitChange={() => {}}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
