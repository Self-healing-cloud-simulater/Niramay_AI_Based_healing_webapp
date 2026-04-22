/**
 * useNiramayData — Shared data fetching hook for all Niramay pages.
 * Polls observation logs, anomaly data, healing actions, and escalations.
 *
 * Also provides useLogHistory and useAnomalyHistory for OpenSearch data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { ObservationLog, AnomalyLog, HealingAction, SystemStats, EscalationAlert, IncidentReport } from '../designSystem';

const API = import.meta.env.VITE_API_URL || '';

export interface NiramayData {
  logs: ObservationLog[];
  anomalies: AnomalyLog[];
  healingActions: HealingAction[];
  escalations: EscalationAlert[];
  incidentReports: IncidentReport[];
  stats: SystemStats | null;
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
  const [anomalies, setAnomalies] = useState<AnomalyLog[]>([]);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [escalations, setEscalations] = useState<EscalationAlert[]>([]);
  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const fetchData = useCallback(async () => {
    try {
      const [a, b, c, d, e, f] = await Promise.allSettled([
        axios.get(`${API}/api/v1/observation/logs?limit=50`),
        axios.get(`${API}/api/v1/detection/anomalies?limit=30`),
        axios.get(`${API}/api/v1/healing/actions?limit=30`),
        axios.get(`${API}/api/v1/stats`),
        axios.get(`${API}/api/v1/escalations?limit=20`),
        axios.get(`${API}/api/v1/incident/reports?limit=20`),
      ]);
      
      if (a.status === 'fulfilled' && Array.isArray(a.value.data)) {
        setLogs(a.value.data);
      }
      if (b.status === 'fulfilled' && Array.isArray(b.value.data)) {
        setAnomalies(b.value.data);
      }
      if (c.status === 'fulfilled' && Array.isArray(c.value.data)) {
        setHealingActions(c.value.data);
      }
      if (d.status === 'fulfilled' && d.value.data) {
        setStats(d.value.data);
      }
      if (e.status === 'fulfilled' && Array.isArray(e.value.data)) {
        setEscalations(e.value.data);
      }
      if (f.status === 'fulfilled' && Array.isArray(f.value.data)) {
        setIncidentReports(f.value.data);
      }
      
      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Fetch data error:", err);
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
  const avg = tot > 0 ? (logs.reduce((s, l) => s + (l.response_time_ms ?? 0), 0) / tot).toFixed(0) : '—';
  const rate = tot > 0 ? ((1 - fail / tot) * 100).toFixed(1) : '—';

  return {
    logs,
    anomalies,
    healingActions,
    escalations,
    incidentReports,
    stats,
    isLive,
    setIsLive,
    lastRefresh,
    loading,
    fetchData,
    metrics: {
      totalRequests: stats?.total_logs || 0,
      successRate: stats?.health_score !== undefined ? stats.health_score.toFixed(1) : '100.0',
      avgLatency: avg !== '—' ? `${avg}ms` : '—',
      activeAnomalies: stats?.total_anomalies || 0,
      totalHealed: healingActions.length,
    },
  };
}


/**
 * useLogHistory — Fetches historical logs from OpenSearch.
 * Refreshes every 30 seconds.
 */
export function useLogHistory(service?: string) {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (service) params.set('service', service);
      params.set('limit', '500');
      const res = await axios.get(`${API}/api/v1/observation/logs/history?${params}`);
      if (Array.isArray(res.data)) setLogs(res.data);
    } catch (err) {
      console.error('Log history fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return { logs, loading, refetch: fetchHistory };
}


/**
 * useAnomalyHistory — Fetches historical anomalies from OpenSearch.
 * Refreshes every 30 seconds.
 */
export function useAnomalyHistory(service?: string) {
  const [anomalies, setAnomalies] = useState<AnomalyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (service) params.set('service', service);
      params.set('limit', '200');
      const res = await axios.get(`${API}/api/v1/detection/anomalies/history?${params}`);
      if (Array.isArray(res.data)) setAnomalies(res.data);
    } catch (err) {
      console.error('Anomaly history fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return { anomalies, loading, refetch: fetchHistory };
}
