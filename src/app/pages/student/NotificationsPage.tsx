import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Loader2, Bell, CheckCheck, BellRing, Megaphone, BookOpen, ClipboardList, Video, DollarSign, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../lib/api';

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  broadcast:        { icon: <Megaphone className="h-4 w-4" />,     color: 'text-purple-600 bg-purple-50',  label: 'Broadcast' },
  material_upload:  { icon: <BookOpen className="h-4 w-4" />,      color: 'text-blue-600 bg-blue-50',      label: 'Material' },
  test_graded:      { icon: <ClipboardList className="h-4 w-4" />, color: 'text-green-600 bg-green-50',    label: 'Test' },
  assignment_graded:{ icon: <ClipboardList className="h-4 w-4" />, color: 'text-green-600 bg-green-50',    label: 'Assignment' },
  live_class:       { icon: <Video className="h-4 w-4" />,         color: 'text-red-600 bg-red-50',        label: 'Live Class' },
  fee_payment:      { icon: <DollarSign className="h-4 w-4" />,    color: 'text-yellow-600 bg-yellow-50',  label: 'Fee' },
  doubt_reply:      { icon: <MessageCircle className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-50',  label: 'Doubt' },
  general:          { icon: <Bell className="h-4 w-4" />,          color: 'text-gray-600 bg-gray-100',     label: 'General' },
};

const getMeta = (type: string) => TYPE_META[type] ?? TYPE_META['general'];

const PAGE_SIZE = 20;

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchPage = useCallback(async (reset: boolean, type: string) => {
    if (reset) { setLoading(true); cursorRef.current = null; }
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (type !== 'all') params.set('type', type);
      if (!reset && cursorRef.current) params.set('before', cursorRef.current);

      const r = await api.notifications.getAll(Object.fromEntries(params));
      if (r.success) {
        const data: any[] = r.data;
        setNotifications(prev => reset ? data : [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        if (data.length > 0) cursorRef.current = data[data.length - 1].createdAt;
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchPage(true, typeFilter); }, [typeFilter, fetchPage]);

  const markRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    await api.notifications.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarkingAll(false);
  };

  const typeOptions = [
    { value: 'all', label: 'All types' },
    ...Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label })),
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BellRing className="h-8 w-8 text-indigo-600" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead} disabled={markingAll} className="text-sm">
              {markingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2" />}
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notification list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const meta = getMeta(n.type);
                return (
                  <div
                    key={n.id}
                    className={`flex gap-4 px-5 py-4 transition-colors hover:bg-gray-50/50 cursor-pointer ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                    onClick={() => { if (!n.isRead) markRead(n.id); }}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${meta.color}`}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`text-sm ${!n.isRead ? 'font-semibold' : 'font-medium'} truncate`}>{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 border-0 ${meta.color}`}>
                          {meta.label}
                        </Badge>
                        {n.link && (
                          <a href={n.link} className="text-xs text-indigo-600 hover:underline" onClick={e => e.stopPropagation()}>
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {!loading && hasMore && (
            <div className="p-4 text-center border-t">
              <Button variant="outline" onClick={() => fetchPage(false, typeFilter)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
