/**
 * HealingDashboard — Root Page Orchestrator
 *
 * Manages all state, API polling, and layout composition.
 * All sub-components are imported and assembled here.
 * Functionality is 100% preserved from the original.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  useTheme,
  layout, spacing, radius, transitions, fontFamily, typeScale,
  type ObservationLog, type AnomalyData, type HealingAction,
} from '../designSystem';
import StatCard from '../components/StatCard';
import Toggle from '../components/Toggle';
import ObservationFeed from '../components/ObservationFeed';
import DetectionAlerts from '../components/DetectionAlerts';
import HealingActionsPanel from '../components/HealingActions';
import AICopilot from '../components/AICopilot';

/* ─── Constants ──────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 3000;

/* ─── SVG Icons ──────────────────────────────────────────── */
function SunIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="4" />
      <line x1="9" y1="1" x2="9" y2="3" />
      <line x1="9" y1="15" x2="9" y2="17" />
      <line x1="1" y1="9" x2="3" y2="9" />
      <line x1="15" y1="9" x2="17" y2="9" />
      <line x1="3.34" y1="3.34" x2="4.75" y2="4.75" />
      <line x1="13.25" y1="13.25" x2="14.66" y2="14.66" />
      <line x1="3.34" y1="14.66" x2="4.75" y2="13.25" />
      <line x1="13.25" y1="4.75" x2="14.66" y2="3.34" />
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M15.5 9.37A7 7 0 1 1 8.63 2.5 5.5 5.5 0 0 0 15.5 9.37Z" />
    </svg>
  );
}

function RefreshIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 7a6 6 0 0 1 11.2-2.8" />
      <path d="M13 7a6 6 0 0 1-11.2 2.8" />
      <polyline points="1,2.5 1,6.5 4.5,5.5" />
      <polyline points="13,11.5 13,7.5 9.5,8.5" />
    </svg>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function HealingDashboard() {
  const { theme, isDark, toggleTheme, shadow } = useTheme();

  /* State */
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const [refreshHovered, setRefreshHovered] = useState(false);
  const [themeHovered, setThemeHovered] = useState(false);

  /* Data fetching — identical to original */
  const fetchData = useCallback(async () => {
    try {
      const [logsRes, anomalyRes, healingRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/api/v1/observation/logs?limit=50`),
        axios.get(`${API_BASE}/api/v1/detection/anomalies?limit=30`),
        axios.get(`${API_BASE}/api/v1/healing/actions?limit=30`),
      ]);

      if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data);
      if (anomalyRes.status === 'fulfilled') setAnomalyData(anomalyRes.value.data);
      if (healingRes.status === 'fulfilled') setHealingActions(healingRes.value.data);
      setLastRefresh(new Date());
    } catch {
      // silently ignore — panels show empty state
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(fetchData, POLL_INTERVAL);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive, fetchData]);

  /* Derived stats — identical to original */
  const totalRequests = logs.length;
  const failureCount = logs.filter(l => l.status_code >= 400).length;
  const avgLatency = totalRequests > 0
    ? (logs.reduce((s, l) => s + l.response_time_ms, 0) / totalRequests).toFixed(0)
    : '—';
  const successRate = totalRequests > 0
    ? ((1 - failureCount / totalRequests) * 100).toFixed(1)
    : '—';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.bgSecondary,
        color: theme.textPrimary,
        fontFamily: fontFamily.ui,
        transition: `background ${transitions.slow}, color ${transitions.slow}`,
      }}
    >
      {/* ─── Header ──────────────────────────────────────── */}
      <div
        style={{
          maxWidth: layout.maxWidth,
          margin: '0 auto',
          padding: `${spacing.xl}px ${spacing['2xl']}px ${spacing.lg}px`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        {/* Title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxs }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 300,
                fontFamily: fontFamily.display,
                letterSpacing: '-0.015em',
                color: theme.textPrimary,
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontWeight: 400 }}>Healing</span> Layer Dashboard
            </h1>
            {isLive && (
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: theme.accentGold,
                  boxShadow: `0 0 8px ${theme.accentGold}`,
                  animation: 'pulse-live 2s ease-in-out infinite',
                }}
              />
            )}
          </div>
          <p
            style={{
              ...typeScale.body,
              color: theme.textTertiary,
              fontFamily: fontFamily.ui,
            }}
          >
            Real-time monitoring across Observation → Detection → Healing pipeline
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            onMouseEnter={() => setThemeHovered(true)}
            onMouseLeave={() => setThemeHovered(false)}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.soft,
              border: `1px solid ${theme.borderDefault}`,
              background: themeHovered ? theme.bgTertiary : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: `all ${transitions.default}`,
            }}
          >
            {isDark ? <SunIcon color={theme.textSecondary} /> : <MoonIcon color={theme.textSecondary} />}
          </button>

          {/* Live toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
              padding: `${spacing.xs}px ${spacing.sm}px`,
              background: theme.surfaceElevated,
              borderRadius: radius.soft,
              border: `1px solid ${theme.borderSubtle}`,
            }}
          >
            <span
              style={{
                ...typeScale.caption,
                fontFamily: fontFamily.ui,
                color: theme.textTertiary,
              }}
            >
              Live
            </span>
            <Toggle on={isLive} onToggle={() => setIsLive(!isLive)} label="Live polling" />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchData}
            onMouseEnter={() => setRefreshHovered(true)}
            onMouseLeave={() => setRefreshHovered(false)}
            style={{
              height: 36,
              padding: `0 ${spacing.md}px`,
              background: refreshHovered ? theme.accentNavyMid : theme.accentNavy,
              border: 'none',
              borderRadius: radius.soft,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: fontFamily.ui,
              cursor: 'pointer',
              transition: `all ${transitions.default}`,
              transform: refreshHovered ? 'translateY(-1px)' : 'translateY(0)',
              boxShadow: refreshHovered ? shadow.sm : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <RefreshIcon color="#FFFFFF" />
            Refresh
          </button>

          {/* Last updated */}
          <span
            style={{
              ...typeScale.caption,
              fontSize: 10,
              fontFamily: fontFamily.ui,
              color: theme.textDisabled,
            }}
          >
            {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* ─── Stat Cards ──────────────────────────────────── */}
      <div
        className="nr-stat-row"
        style={{
          maxWidth: layout.maxWidth,
          margin: `0 auto ${spacing.lg}px`,
          padding: `0 ${spacing['2xl']}px`,
          display: 'flex',
          gap: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <StatCard label="Total Requests" value={totalRequests} subtitle="in current window" />
        <StatCard label="Success Rate" value={`${successRate}%`} subtitle="2xx responses" accentColor={theme.success} />
        <StatCard label="Avg Latency" value={`${avgLatency}ms`} subtitle="response time" />
        <StatCard
          label="Anomalies"
          value={anomalyData?.total || 0}
          subtitle="detected"
          accentColor={anomalyData && anomalyData.total > 0 ? theme.warning : undefined}
        />
        <StatCard
          label="Healing Actions"
          value={healingActions.length}
          subtitle="executed"
          accentColor={healingActions.length > 0 ? theme.success : undefined}
        />
      </div>

      {/* ─── 2×2 Grid ────────────────────────────────────── */}
      <div
        className="nr-grid-responsive"
        style={{
          maxWidth: layout.maxWidth,
          margin: `0 auto ${spacing['3xl']}px`,
          padding: `0 ${spacing['2xl']}px`,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing.lg,
        }}
      >
        <ObservationFeed logs={logs} />
        <DetectionAlerts data={anomalyData} />
        <HealingActionsPanel actions={healingActions} />
        <AICopilot />
      </div>
    </div>
  );
}
