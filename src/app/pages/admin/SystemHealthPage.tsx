import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Database, RefreshCw, CheckCircle2, XCircle, Users, Images, Megaphone, CalendarDays, Inbox } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useSeo } from '../../components/public/useSeo';

interface SystemStatus {
  checkedAt: string;
  database: { ok: boolean };
  counts: {
    users: number;
    mediaAssets: number;
    notices: number;
    events: number;
    enquiries: number;
  };
}

export const SystemHealthPage: React.FC = () => {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useSeo({ title: 'System Health', robots: 'noindex,nofollow' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.system();
      if (res.success) setData(res.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to reach the system endpoint');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="text-muted-foreground mt-2">Operational status of the platform's database and data volumes.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 mr-2 animate-spin' : 'h-4 w-4 mr-2'} /> Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-10 text-center">
            <XCircle className="h-10 w-10 mx-auto mb-3 text-red-500" />
            <p className="text-gray-700 font-medium">{error}</p>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-blue-600" /> Database</CardTitle>
              {data.database.ok ? (
                <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-600"><XCircle className="h-3.5 w-3.5 mr-1" /> Unreachable</Badge>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Last checked: <span className="font-medium text-gray-700">{new Date(data.checkedAt).toLocaleString('en-IN')}</span>
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {counts && [
              { label: 'Users', value: counts.users, icon: Users, color: 'from-blue-600 to-blue-400' },
              { label: 'Media assets', value: counts.mediaAssets, icon: Images, color: 'from-purple-600 to-purple-400' },
              { label: 'Notices', value: counts.notices, icon: Megaphone, color: 'from-amber-600 to-amber-400' },
              { label: 'Events', value: counts.events, icon: CalendarDays, color: 'from-green-600 to-green-400' },
              { label: 'Enquiries', value: counts.enquiries, icon: Inbox, color: 'from-pink-600 to-pink-400' },
            ].map((c) => (
              <Card key={c.label}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                      <h3 className="text-2xl font-bold mt-1">{Number(c.value).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className={'p-3 rounded-xl bg-gradient-to-br ' + c.color}>
                      <c.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};