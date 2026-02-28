import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import type { FarmState, Settings } from '@/types';

const API_BASE = '/api';

function getSocket() {
  if (typeof window === 'undefined') return null;
  const existing = (window as any).__socket;
  if (existing && existing.connected) return existing;
  const socket = io('http://localhost:3001', { 
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
  });
  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('disconnect', () => console.log('[socket] disconnected'));
  socket.on('connect_error', (err: any) => console.log('[socket] error:', err.message));
  (window as any).__socket = socket;
  return socket;
}

export function useFarmState() {
  const [state, setState] = useState<FarmState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/game-data`);
      const data = await res.json();
      setState(data);
    } catch (error) {
      console.error('Failed to fetch state:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const doFetch = async () => {
      try {
        // await fetch(`${API_BASE}/refresh-data`, { method: 'POST' });
      } catch (e) {}
      fetchState();
    };
    doFetch();
    const interval = setInterval(doFetch, 500);

    const socket = getSocket();
    if (socket) {
      socket.on('state', (data: any) => {
        // console.log('[socket] state received:', Object.keys(data));
        setState(data);
      });
      socket.on('connect', () => console.log('[socket] connected'));
      socket.on('disconnect', () => console.log('[socket] disconnected'));
    }

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('state');
      }
    };
  }, [fetchState]);

  return { state, loading, refetch: fetchState };
}

export function useBotStatus() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setRunning(data.running);
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    
    const socket = getSocket();
    if (!socket) return;

    socket.on('botStatus', (data: { running: boolean }) => {
      setRunning(data.running);
    });

    socket.on('botLog', (msg: string) => {
      setLogs(prev => [...prev.slice(-99), msg]);
    });

    socket.on('botError', (msg: string) => {
      setError(msg);
    });

    return () => {
      socket.off('botStatus');
      socket.off('botLog');
      socket.off('botError');
    };
  }, [fetchStatus]);

  const startBot = async (code: string, platform = 'qq', interval = 10, friendInterval = 10, autoSettings?: any) => {
    setLogs([]);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/start-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, platform, interval, friendInterval, ...autoSettings }),
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to start bot:', err);
      return { success: false, message: 'Failed to start bot' };
    }
  };

  const stopBot = async () => {
    try {
      const res = await fetch(`${API_BASE}/stop-bot`, {
        method: 'POST',
      });
      return await res.json();
    } catch (err) {
      console.error('Failed to stop bot:', err);
      return { success: false, message: 'Failed to stop bot' };
    }
  };

  return { running, loading, startBot, stopBot, refetch: fetchStatus, logs, error };
}

export function useLogs(limit = 100) {
  const [logs, setLogs] = useState<any[]>([]);
  const lastLogKeyRef = useRef<string>('');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/logs?limit=${limit}`);
      const data = await res.json();
      
      // Dedupe: remove consecutive duplicates based on tag+message
      const deduped: any[] = [];
      for (const log of data) {
        const logKey = `${log.tag}:${log.message}`;
        if (logKey !== lastLogKeyRef.current) {
          deduped.push(log);
          lastLogKeyRef.current = logKey;
        }
      }
      
      // Sort by timestamp descending (newest first) and slice
      const sorted = deduped
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, limit);
      setLogs(sorted);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchLogs]);

  return { logs, refetch: fetchLogs };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const socketRef = useRef<any>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const socket = getSocket();
    socketRef.current = socket;
    
    const handleSettingsUpdate = (data: Settings) => {
      setSettings(data);
    };

    socket.on('settingsUpdate', handleSettingsUpdate);

    return () => {
      socket.off('settingsUpdate', handleSettingsUpdate);
    };
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  return { settings, updateSettings, refetch: fetchSettings };
}

export async function triggerAction(type: string, data?: any) {
  try {
    const res = await fetch(`${API_BASE}/action/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return await res.json();
  } catch (error) {
    console.error(`Failed to trigger action ${type}:`, error);
  }
}

export async function clearLogs() {
  try {
    await fetch(`${API_BASE}/logs/clear`, { method: 'POST' });
  } catch (error) {
    console.error('Failed to clear logs:', error);
  }
}
