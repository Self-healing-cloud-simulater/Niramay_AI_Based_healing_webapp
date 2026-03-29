/**
 * HealingDashboard — Orchestrator
 *
 * Glass navigation on scroll, editorial stat numbers,
 * 2×2 glass panel grid. All functionality preserved.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  useTheme, glass, glassSubtle,
  layout, sp, radius, ease, dur, font, type,
  type ObservationLog, type AnomalyData, type HealingAction,
} from '../designSystem';
import StatCard from '../components/StatCard';
import ThemeToggle from '../components/Toggle';
import ObservationFeed from '../components/ObservationFeed';
import DetectionAlerts from '../components/DetectionAlerts';
import HealingActionsPanel from '../components/HealingActions';
import AICopilot from '../components/AICopilot';

const API_BASE = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 3000;

/* SVG Icons — thin stroke, never filled */
function RefreshIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 7a6 6 0 0 1 11.2-2.8" /><path d="M13 7a6 6 0 0 1-11.2 2.8" />
      <polyline points="1,2.5 1,6.5 4.5,5.5" /><polyline points="13,11.5 13,7.5 9.5,8.5" />
    </svg>
  );
}

/* Live toggle — minimal pill */
function LiveToggle({ on, onToggle, theme }: { on: boolean; onToggle: () => void; theme: ReturnType<typeof useTheme>['theme'] }) {
  return (
    <button onClick={onToggle} aria-label="Toggle live polling" style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: radius.pill,
      background: theme.hoverBg, border: 'none', cursor: 'pointer',
      transition: `background ${dur.default}ms ${ease.standard}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: on ? theme.success : theme.textTertiary,
        transition: `background ${dur.default}ms ${ease.standard}`,
      }} />
      <span style={{ ...type.caption, fontSize: 10, fontFamily: font, color: theme.textSecondary }}>
        {on ? 'Live' : 'Paused'}
      </span>
    </button>
  );
}

export default function HealingDashboard() {
  const { theme, isDark } = useTheme();

  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [scrolled, setScrolled] = useState(false);
  const [refreshHovered, setRefreshHovered] = useState(false);

  /* Scroll listener for glass nav */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Data fetching — identical logic */
  const fetchData = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/v1/observation/logs?limit=50`),
        axios.get(`${API_BASE}/api/v1/detection/anomalies?limit=30`),
        axios.get(`${API_BASE}/api/v1/healing/actions?limit=30`),
      ]);
      if (a.status === 'fulfilled') setLogs(a.value.data);
      if (b.status === 'fulfilled') setAnomalyData(b.value.data);
      if (c.status === 'fulfilled') setHealingActions(c.value.data);
      setLastRefresh(new Date());
    } catch { /* panels show empty state */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (isLive) timerRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive, fetchData]);

  /* Derived */
  const tot = logs.length;
  const fail = logs.filter(l => l.status_code >= 400).length;
  const avg = tot > 0 ? (logs.reduce((s, l) => s + l.response_time_ms, 0) / tot).toFixed(0) : '—';
  const rate = tot > 0 ? ((1 - fail / tot) * 100).toFixed(1) : '—';

  return (
    <div style={{
      minHeight: '100vh',
      color: theme.textPrimary,
      fontFamily: font,
      transition: `color ${dur.slow}ms ${ease.standard}`,
    }}>

      {/* ── Navigation — gains glass on scroll ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        height: layout.navHeight,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `0 ${sp[5]}px`,
        transition: `all ${dur.default}ms ${ease.standard}`,
        ...(scrolled ? { ...glass(isDark), borderRadius: 0, borderBottom: `1px solid ${theme.border}` } : { background: 'transparent' }),
      }}>
        <span style={{ ...type.h2, fontSize: 20, fontWeight: 300, fontFamily: font, color: theme.textPrimary, letterSpacing: '-0.01em' }}>
          Niramay
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp[1] }}>
          <LiveToggle on={isLive} onToggle={() => setIsLive(!isLive)} theme={theme} />
          <button onClick={fetchData}
            onMouseEnter={() => setRefreshHovered(true)} onMouseLeave={() => setRefreshHovered(false)}
            aria-label="Refresh data"
            style={{
              width: 32, height: 32, borderRadius: radius.sm,
              background: refreshHovered ? theme.hoverBg : 'transparent',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: `all ${dur.default}ms ${ease.standard}`,
            }}
          >
            <RefreshIcon color={theme.textSecondary} />
          </button>
          <span style={{ ...type.caption, fontSize: 10, fontFamily: font, color: theme.textTertiary }}>
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Content ── */}
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto', padding: `${layout.navHeight + sp[4]}px ${sp[5]}px ${sp[6]}px` }}>

        {/* Title */}
        <div style={{ marginBottom: sp[5] }}>
          <h1 style={{ ...type.h1, fontFamily: font, color: theme.textPrimary, marginBottom: sp.half }}>
            Healing Layer
          </h1>
          <p style={{ ...type.bodySm, fontFamily: font, color: theme.textTertiary }}>
            Real-time monitoring — Observation → Detection → Healing
          </p>
        </div>

        {/* ── Stats — editorial, no boxes ── */}
        <div className="nr-stats" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: sp[6], padding: `${sp[3]}px 0`,
          borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`,
        }}>
          <StatCard label="Requests" value={tot} />
          <StatCard label="Success Rate" value={`${rate}%`} accentColor={theme.success} />
          <StatCard label="Avg Latency" value={`${avg}ms`} />
          <StatCard label="Anomalies" value={anomalyData?.total || 0}
            accentColor={anomalyData && anomalyData.total > 0 ? theme.warning : undefined} />
          <StatCard label="Healed" value={healingActions.length}
            accentColor={healingActions.length > 0 ? theme.success : undefined} />
        </div>

        {/* ── 2×2 Glass Grid ── */}
        <div className="nr-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: sp[3], marginBottom: sp[5],
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
