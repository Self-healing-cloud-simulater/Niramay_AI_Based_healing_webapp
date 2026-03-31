/**
 * useNiramayData — Shared data fetching hook for all Niramay pages.
 * Polls observation logs, anomaly data, and healing actions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { ObservationLog, AnomalyData, HealingAction } from '../designSystem';

const API = import.meta.env.VITE_API_URL || '';

export interface NiramayData {
  logs: ObservationLog[];
  anomalyData: AnomalyData | null;
  healingActions: HealingAction[];
  isLive: boolean;
  setIsLive: (v: boolean) => void;
  lastRefresh: Date;
  loading: boolean;
  fetchData: () => void;
  metrics: {
    totalRequests: number;
    successRate: string;
    avgLatency: string;
    activeAnomalies: number;
    totalHealed: number;
  };
}

export function useNiramayData(): NiramayData {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.allSettled([
        axios.get(`${API}/api/v1/observation/logs?limit=50`),
        axios.get(`${API}/api/v1/detection/anomalies?limit=30`),
        axios.get(`${API}/api/v1/healing/actions?limit=30`),
      ]);
      if (a.status === 'fulfilled') setLogs(a.value.data);
      if (b.status === 'fulfilled') setAnomalyData(b.value.data);
      if (c.status === 'fulfilled') setHealingActions(c.value.data);
      setLastRefresh(new Date());
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isLive) timerRef.current = setInterval(fetchData, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive, fetchData]);

  const tot = logs.length;
  const fail = logs.filter(l => l.status_code >= 400).length;
  const avg = tot > 0 ? (logs.reduce((s, l) => s + l.response_time_ms, 0) / tot).toFixed(0) : '—';
  const rate = tot > 0 ? ((1 - fail / tot) * 100).toFixed(1) : '—';

  return {
    logs,
    anomalyData,
    healingActions,
    isLive,
    setIsLive,
    lastRefresh,
    loading,
    fetchData,
    metrics: {
      totalRequests: tot,
      successRate: rate,
      avgLatency: avg,
      activeAnomalies: anomalyData?.total || 0,
      totalHealed: healingActions.length,
    },
  };
}
