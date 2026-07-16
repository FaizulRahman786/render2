import { useEffect, useRef, useCallback } from 'react';
import { BASE_URL, getAuthToken } from '../lib/api';

export type RealtimeNotificationEvent = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  createdAt: string;
  isRead: boolean;
  [key: string]: any;
};

type Options = {
  onNotification: (n: RealtimeNotificationEvent) => void;
  enabled?: boolean;
};

const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function parseSseFrame(frame: string): unknown {
  const payload = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim();

  if (!payload) return null;
  return JSON.parse(payload);
}

export function useRealtimeNotifications({ onNotification, enabled = true }: Options) {
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const retryRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const connect = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;

    const token = await getAuthToken();
    if (!token || !mountedRef.current || !enabled) return;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const base = BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${base}/notifications/stream`, {
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok || !response.body) {
        throw new Error(`Notification stream rejected with ${response.status}`);
      }

      retryRef.current = 0;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (mountedRef.current && enabled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');

        let frameEnd = buffer.indexOf('\n\n');
        while (frameEnd >= 0) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);

          try {
            const msg = parseSseFrame(frame) as any;
            if (msg?.type === 'notification' && msg.data) {
              onNotificationRef.current(msg.data as RealtimeNotificationEvent);
            }
          } catch {
            // Ignore malformed SSE frames and keep the stream alive.
          }

          frameEnd = buffer.indexOf('\n\n');
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || !mountedRef.current || !enabled) return;

      if (retryRef.current >= MAX_RECONNECT_ATTEMPTS) return;
      const delay = Math.min(
        BASE_RECONNECT_DELAY * 2 ** retryRef.current,
        MAX_RECONNECT_DELAY,
      );
      retryRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        void connect();
      }, delay);
    }
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    retryRef.current = 0;
    void connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [connect]);
}
