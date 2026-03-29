/**
 * HealingDashboard v4 — Silent Luxury Orchestrator
 * Glass nav on scroll, weight-contrast typography, progressive disclosure.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  useTheme, glass, glassNav,
  layout, sp, radius, ease, dur, font, type,
  type ObservationLog, type AnomalyData, type HealingAction,
} from '../designSystem';
import StatCard from '../components/StatCard';
import ThemeToggle from '../components/Toggle';
import ObservationFeed from '../components/ObservationFeed';
import DetectionAlerts from '../components/DetectionAlerts';
import HealingActionsPanel from '../components/HealingActions';
import AICopilot from '../components/AICopilot';

const API = import.meta.env.VITE_API_URL || '';

function RefreshIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
      <path d="M1.5 7.5a6 6 0 0 1 11-3" /><path d="M13.5 7.5a6 6 0 0 1-11 3" />
      <polyline points="1.5,2.5 1.5,6.5 5,5.5" /><polyline points="13.5,12.5 13.5,8.5 10,9.5" />
    </svg>
  );
}

export default function HealingDashboard() {
  const { theme, isDark } = useTheme();

  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

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
    } catch { /* empty state fallback */ }
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

  return (
    <div style={{ minHeight: '100vh', fontFamily: font, color: theme.textPrimary }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: layout.navHeight,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${sp[5]}px`,
        transition: `all ${dur.base}ms ${ease.standard}`,
        ...(scrolled ? { ...glassNav(isDark) } : { background: 'transparent' }),
      }}>
        <span style={{ ...type.h2, fontSize: 18, fontWeight: 600, fontFamily: font, color: theme.textPrimary, letterSpacing: '-0.02em' }}>
          Niramay
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp[2] }}>
          {/* Live */}
          <button onClick={() => setIsLive(!isLive)} className="nr-btn" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: radius.pill, border: 'none',
            ...glass(isDark),
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isLive ? theme.success : theme.textTertiary,
              transition: `background ${dur.base}ms ${ease.standard}` }} />
            <span style={{ ...type.caption, fontSize: 10, fontFamily: font, color: theme.textSecondary, fontWeight: 300 }}>
              {isLive ? 'Live' : 'Paused'}
            </span>
          </button>
          {/* Refresh */}
          <button onClick={fetchData} className="nr-btn" aria-label="Refresh" style={{
            width: 34, height: 34, borderRadius: radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none',
          }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.hoverShadow)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <RefreshIcon color={theme.textTertiary} />
          </button>
          <span style={{ ...type.caption, fontSize: 10, fontFamily: font, color: theme.textTertiary, fontWeight: 300 }}>
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{
        maxWidth: layout.maxWidth, margin: '0 auto',
        padding: `${layout.navHeight + sp[6]}px ${sp[6]}px ${sp[7]}px`,
      }}>

        {/* Title */}
        <div style={{ marginBottom: sp[6] }}>
          <h1 style={{ ...type.h1, fontFamily: font, color: theme.textPrimary, marginBottom: sp.half }}>
            Healing Layer
          </h1>
          <p style={{ ...type.body, fontWeight: 300, fontFamily: font, color: theme.textTertiary, maxWidth: 440 }}>
            Real-time monitoring across Observation, Detection, and Healing
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="nr-stats" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: sp[7],
          padding: `${sp[4]}px 0`,
          borderTop: `1px solid ${theme.border}`,
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <StatCard label="Requests" value={tot} />
          <StatCard label="Success" value={`${rate}%`} accentColor={theme.success} />
          <StatCard label="Latency" value={`${avg}ms`} />
          <StatCard label="Anomalies" value={anomalyData?.total || 0}
            accentColor={anomalyData && anomalyData.total > 0 ? theme.warning : undefined} />
          <StatCard label="Healed" value={healingActions.length}
            accentColor={healingActions.length > 0 ? theme.success : undefined} />
        </div>

        {/* ── 2×2 Grid ── */}
        <div className="nr-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: sp[4],
        }}>
          <ObservationFeed logs={logs} />
          <DetectionAlerts data={anomalyData} />
          <HealingActionsPanel actions={healingActions} />
          <AICopilot />
        </div>
      </div>
    </div>
  );
}
