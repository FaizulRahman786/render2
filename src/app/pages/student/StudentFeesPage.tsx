import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, IndianRupee, Printer, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'sonner';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[ch];
  });
}

function printReceipt(fee: any, payments: any[]) {
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fee Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { margin: 0; font-size: 24px; color: #1a1a2e; }
        .header p { margin: 4px 0; color: #666; font-size: 13px; }
        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 8px; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 14px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .row .label { color: #666; }
        .row .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f5f5f5; padding: 8px 12px; text-align: left; border: 1px solid #ddd; }
        td { padding: 8px 12px; border: 1px solid #ddd; }
        .total-row { font-weight: bold; background: #f0f4ff; }
        .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; display: flex; justify-content: space-between; font-size: 12px; color: #888; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎓 Coaching Platform</h1>
        <p>Fee Receipt</p>
        <span class="badge">Receipt #${escapeHtml(fee.id?.slice(-8).toUpperCase())}</span>
      </div>
      <div class="section">
        <h3>Student Details</h3>
        <div class="row"><span class="label">Name</span><span class="value">${escapeHtml(fee.studentName) || '—'}</span></div>
        <div class="row"><span class="label">Email</span><span class="value">${escapeHtml(fee.studentEmail) || '—'}</span></div>
        <div class="row"><span class="label">Course</span><span class="value">${escapeHtml(fee.courseName) || '—'}</span></div>
      </div>
      <div class="section">
        <h3>Fee Details</h3>
        <div class="row"><span class="label">Total Amount</span><span class="value">₹${Number(fee.totalAmount).toLocaleString('en-IN')}</span></div>
        <div class="row"><span class="label">Discount</span><span class="value">₹${Number(fee.discount || 0).toLocaleString('en-IN')}</span></div>
        <div class="row"><span class="label">Final Amount</span><span class="value">₹${Number(fee.finalAmount).toLocaleString('en-IN')}</span></div>
        <div class="row"><span class="label">Due Date</span><span class="value">${fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}</span></div>
      </div>
      ${payments.length > 0 ? `
      <div class="section">
        <h3>Payment History</h3>
        <table>
          <thead><tr><th>#</th><th>Date</th><th>Amount</th><th>Mode</th><th>Transaction ID</th></tr></thead>
          <tbody>
            ${payments.map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}</td>
                <td>₹${Number(p.amount).toLocaleString('en-IN')}</td>
                <td>${escapeHtml(p.paymentMode) || '—'}</td>
                <td>${escapeHtml(p.transactionId || p.receiptNumber) || '—'}</td>
              </tr>`).join('')}
            <tr class="total-row"><td colspan="2">Total Paid</td><td>₹${totalPaid.toLocaleString('en-IN')}</td><td colspan="2"></td></tr>
          </tbody>
        </table>
      </div>` : ''}
      <div class="footer">
        <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
        <span>This is a computer-generated receipt.</span>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}

export const StudentFeesPage: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    api.student.getFees()
      .then((r) => {
        if (r.success) {
          setFees(r.data.fees ?? []);
          setPayments(r.data.payments ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalDue = fees.reduce((s, f) => s + Math.max(0, Number(f.finalAmount) - payments.filter(p => p.feeId === f.id).reduce((a, p) => a + Number(p.amount), 0)), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

  const handlePrintReceipt = async (fee: any) => {
    setPrintingId(fee.id);
    try {
      const r = await api.student.getFeeReceipt(fee.id).catch(() => null);
      if (r?.success) {
        printReceipt(r.data.fee, r.data.payments);
      } else {
        toast.error('Could not fetch the receipt. Please try again.');
      }
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Fees</h1>
        <p className="text-muted-foreground mt-2">Track your fee payments and download receipts</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-green-100 rounded-xl"><IndianRupee className="h-5 w-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Total Paid</p><h3 className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</h3></div></div></CardContent></Card>
        <Card className={totalDue > 0 ? 'border-red-200' : ''}><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-red-100 rounded-xl"><IndianRupee className="h-5 w-5 text-red-600" /></div><div><p className="text-sm text-muted-foreground">Amount Due</p><h3 className={'text-2xl font-bold ' + (totalDue > 0 ? 'text-red-600' : 'text-green-600')}>₹{totalDue.toLocaleString('en-IN')}</h3></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center gap-3"><div className="p-3 bg-blue-100 rounded-xl"><IndianRupee className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Fee Records</p><h3 className="text-2xl font-bold">{fees.length}</h3></div></div></CardContent></Card>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Course</TableHead><TableHead>Total Amount</TableHead><TableHead>Discount</TableHead><TableHead>Final</TableHead><TableHead>Due Date</TableHead><TableHead>Receipt</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.courseName || 'General Fee'}</TableCell>
                    <TableCell>₹{Number(f.totalAmount).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-green-600">-₹{Number(f.discount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-semibold">₹{Number(f.finalAmount).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrintReceipt(f)}
                        disabled={printingId === f.id}
                      >
                        {printingId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Printer className="h-3 w-3 mr-1" />}
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {fees.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No fee records found</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>

          {payments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Download className="h-5 w-5" />Payment History</h2>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Transaction ID</TableHead><TableHead>Receipt No</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="font-semibold text-green-700">₹{Number(p.amount).toLocaleString('en-IN')}</TableCell>
                        <TableCell className="capitalize">{p.paymentMode || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{p.transactionId || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{p.receiptNumber || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
