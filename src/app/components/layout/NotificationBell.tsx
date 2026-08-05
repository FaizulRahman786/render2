import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, Info, AlertCircle, BookOpen, DollarSign, GraduationCap } from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { useRealtimeNotifications, RealtimeNotificationEvent } from '../../hooks/useRealtimeNotifications';
import { toast } from 'sonner';

const typeIcon = (type: string) => {
  if (type === 'fee') return DollarSign;
  if (type === 'test') return BookOpen;
  if (type === 'class') return GraduationCap;
  if (type === 'doubt') return AlertCircle;
  return Info;
};

const typeColor = (type: string) => {
  if (type === 'fee') return 'text-green-600';
  if (type === 'test') return 'text-purple-600';
  if (type === 'class') return 'text-blue-600';
  if (type === 'doubt') return 'text-orange-600';
  return 'text-blue-600';
};

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const notificationsRef = useRef<any[]>([]);
  notificationsRef.current = notifications;

  const fetchCount = async () => {
    try {
      const r = await api.notifications.getUnreadCount();
      if (r.success) setUnread(r.data.count);
    } catch {}
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const r = await api.notifications.getAll();
      if (r.success) setNotifications(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Real-time notification handler
  const handleRealtime = useCallback((n: RealtimeNotificationEvent) => {
    // Guard against duplicates: the 60s count poll may already have fetched it.
    const alreadyHas = (id?: string) => id ? notificationsRef.current.some(x => x.id === id) : false;
    if (n.id && alreadyHas(n.id)) return;

    // Prepend to list if panel is open
    if (openRef.current) {
      setNotifications(prev => [n, ...prev]);
    }
    // Increment unread badge
    setUnread(prev => prev + 1);
    // Show toast
    const Icon = typeIcon(n.type);
    toast(n.title, {
      description: n.message,
      icon: React.createElement(Icon, { className: `h-4 w-4 ${typeColor(n.type)}` }),
      duration: 5000,
    });
  }, []);

  useRealtimeNotifications({ onNotification: handleRealtime });

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) loadNotifications();
  };

  const markRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch (err) { console.error('Failed to mark notification read:', err); }
  };

  const markAll = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (err) { console.error('Failed to mark all read:', err); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" className="relative" onClick={handleOpen} aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none px-0.5 animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold text-sm">
              Notifications
              {unread > 0 && (
                <span className="ml-1 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">{unread} new</span>
              )}
            </span>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y">
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const Icon = typeIcon(n.type);
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => !n.isRead && markRead(n.id)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !n.isRead) { e.preventDefault(); markRead(n.id); } }}
                    aria-label={n.title}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${n.isRead ? 'bg-gray-100' : 'bg-blue-100'}`}>
                      <Icon className={`h-4 w-4 ${n.isRead ? 'text-gray-500' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
