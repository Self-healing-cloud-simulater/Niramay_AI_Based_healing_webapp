/**
 * HealingDashboard — The Orchestrator
 *
 * Glassmorphism sticky navbar. CSS 3D hero illustration with parallax.
 * Neumorphic stat tiles. 2×2 glass panel grid. Scroll progress bar.
 * Back-to-top button. AOS staggered entrance. All API logic preserved.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTheme, createRipple, formatTimestamp, type ObservationLog, type AnomalyData, type HealingAction } from '../designSystem';
import StatCard from '../components/StatCard';
import ThemeToggle from '../components/Toggle';
import ObservationFeed from '../components/ObservationFeed';
import DetectionAlerts from '../components/DetectionAlerts';
import HealingActionsPanel from '../components/HealingActions';
import AICopilot from '../components/AICopilot';
import { SkeletonStatCard } from '../components/SkeletonBlock';

const API = import.meta.env.VITE_API_URL || '';

export default function HealingDashboard() {
  const { isDark } = useTheme();

  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Scroll tracking
  useEffect(() => {
    let ticking = false;
    const fn = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setShowBackToTop(y > 400);

        // Progress
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(docH > 0 ? (y / docH) * 100 : 0);

        // Parallax on hero
        if (heroRef.current) {
          heroRef.current.style.transform = `translateY(${y * 0.3}px)`;
        }

        ticking = false;
      });
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Data fetching — sacred API contracts
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
    } catch { /* graceful fallback */ setLoading(false); }
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ═══ Scroll Progress Bar ═══ */}
      <div
        className="scroll-progress"
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={scrollProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      {/* ═══ Navigation ═══ */}
      <nav
        id="main-nav"
        role="navigation"
        aria-label="Main navigation"
        className={scrolled ? 'glass-strong' : ''}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-10)',
          borderRadius: scrolled ? 0 : undefined,
          borderBottom: scrolled ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
          transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...(scrolled ? {} : { background: 'transparent' }),
        }}
      >
        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
        }}>
          Niramay
        </span>

        {/* Right controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}>
          {/* Live indicator */}
          <button
            id="live-toggle"
            onClick={() => setIsLive(!isLive)}
            className="ripple-host"
            onMouseDown={(e) => createRipple(e)}
            aria-label={isLive ? 'Pause live updates' : 'Resume live updates'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: isLive ? 'rgba(45, 122, 79, 0.08)' : 'var(--color-accent-tertiary)',
              border: '1px solid ' + (isLive ? 'rgba(45, 122, 79, 0.15)' : 'var(--color-border-default)'),
              cursor: 'pointer',
              transition: 'all 180ms var(--ease-out-expo)',
            }}
          >
            <span
              className={`dot ${isLive ? 'dot-success dot-live' : 'dot-neutral'}`}
              style={{ width: 6, height: 6 }}
            />
            <span style={{
              fontSize: 10,
              color: isLive ? 'var(--color-status-success)' : 'var(--color-text-tertiary)',
              letterSpacing: 'var(--tracking-wider)',
              textTransform: 'uppercase',
              fontWeight: 'var(--font-weight-medium)' as any,
            }}>
              {isLive ? 'Live' : 'Paused'}
            </span>
          </button>

          {/* Refresh */}
          <button
            id="refresh-btn"
            onClick={fetchData}
            className="btn-icon"
            aria-label="Refresh data"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M1.5 8a6.5 6.5 0 0 1 12-3" />
              <path d="M14.5 8a6.5 6.5 0 0 1-12 3" />
              <polyline points="1.5,3 1.5,7 5,6" />
              <polyline points="14.5,13 14.5,9 11,10" />
            </svg>
          </button>

          {/* Last refresh */}
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-mono)',
          }}>
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </nav>

      {/* ═══ Content ═══ */}
      <main
        role="main"
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '104px var(--space-10) var(--space-24)',
        }}
      >

        {/* ── Hero Section ── */}
        <section data-aos="fade-up" style={{
          position: 'relative',
          marginBottom: 'var(--space-16)',
          overflow: 'hidden',
        }}>
          {/* 3D Floating Illustration — parallax */}
          <div
            ref={heroRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: -20,
              top: -30,
              width: 300,
              height: 260,
              perspective: '800px',
              opacity: 0.35,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {/* Main floating card */}
            <div style={{
              position: 'absolute',
              width: 120,
              height: 90,
              right: 30,
              top: 40,
              background: isDark
                ? 'linear-gradient(135deg, rgba(212,132,94,0.08), rgba(212,132,94,0.02))'
                : 'linear-gradient(135deg, rgba(196,101,58,0.06), rgba(196,101,58,0.01))',
              border: `1px solid ${isDark ? 'rgba(212,132,94,0.12)' : 'rgba(196,101,58,0.08)'}`,
              borderRadius: 'var(--radius-lg)',
              transform: 'rotateX(12deg) rotateY(-18deg)',
              transformStyle: 'preserve-3d',
              animation: 'float 7s ease-in-out infinite',
              backdropFilter: 'blur(2px)',
            }} />

            {/* Secondary shape */}
            <div style={{
              position: 'absolute',
              width: 70,
              height: 70,
              right: 100,
              top: 100,
              background: isDark
                ? 'linear-gradient(145deg, rgba(212,132,94,0.06), transparent)'
                : 'linear-gradient(145deg, rgba(196,101,58,0.04), transparent)',
              border: `1px solid ${isDark ? 'rgba(212,132,94,0.08)' : 'rgba(196,101,58,0.06)'}`,
              borderRadius: 'var(--radius-md)',
              transform: 'rotateX(-8deg) rotateY(22deg)',
              animation: 'floatReverse 6s ease-in-out infinite',
              animationDelay: '-2s',
            }} />

            {/* Accent circle */}
            <div style={{
              position: 'absolute',
              width: 40,
              height: 40,
              right: 160,
              top: 50,
              borderRadius: 'var(--radius-full)',
              background: isDark
                ? 'radial-gradient(circle, rgba(212,132,94,0.10) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(196,101,58,0.08) 0%, transparent 70%)',
              border: `1px solid ${isDark ? 'rgba(212,132,94,0.06)' : 'rgba(196,101,58,0.04)'}`,
              animation: 'float 8s ease-in-out infinite',
              animationDelay: '-4s',
            }} />

            {/* Tiny cube */}
            <div style={{
              position: 'absolute',
              width: 24,
              height: 24,
              right: 50,
              top: 160,
              background: isDark
                ? 'rgba(240, 235, 227, 0.03)'
                : 'rgba(28, 24, 18, 0.02)',
              border: `1px solid ${isDark ? 'rgba(240,235,227,0.06)' : 'rgba(28,24,18,0.04)'}`,
              borderRadius: 'var(--radius-sm)',
              transform: 'rotateX(20deg) rotateY(30deg) rotateZ(15deg)',
              animation: 'floatReverse 5s ease-in-out infinite',
              animationDelay: '-1s',
            }} />
          </div>

          {/* Text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-regular)' as any,
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-tight)',
            }}>
              Healing Layer
            </h1>
            <p style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-tertiary)',
              maxWidth: 460,
              lineHeight: 'var(--leading-loose)',
              fontWeight: 'var(--font-weight-regular)' as any,
            }}>
              Real-time observation, detection, and autonomous healing across your infrastructure
            </p>
          </div>
        </section>

        {/* ── Stat Row ── */}
        <section
          data-aos="fade-up"
          data-aos-delay="100"
          aria-label="System statistics"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-16)',
            padding: 'var(--space-2) 0',
            flexWrap: 'wrap',
          }}
        >
          {loading ? (
            <>
              <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
            </>
          ) : (
            <>
              <StatCard label="Requests" value={tot} />
              <StatCard label="Success" value={`${rate}%`} hasAccent="success" />
              <StatCard label="Latency" value={`${avg}ms`} />
              <StatCard label="Anomalies" value={anomalyData?.total || 0}
                hasAccent={anomalyData && anomalyData.total > 0 ? 'warning' : undefined} />
              <StatCard label="Healed" value={healingActions.length}
                hasAccent={healingActions.length > 0 ? 'success' : undefined} />
            </>
          )}
        </section>

        {/* ── 2×2 Panel Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-6)',
        }}>
          <div data-aos="fade-up" data-aos-delay="0">
            <ObservationFeed logs={logs} />
          </div>
          <div data-aos="fade-up" data-aos-delay="100">
            <DetectionAlerts data={anomalyData} />
          </div>
          <div data-aos="fade-up" data-aos-delay="200">
            <HealingActionsPanel actions={healingActions} />
          </div>
          <div data-aos="fade-up" data-aos-delay="300">
            <AICopilot />
          </div>
        </div>
      </main>

      {/* ═══ Back to Top ═══ */}
      <button
        className={`back-to-top glass ${showBackToTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 13V3" />
          <polyline points="3,7 8,3 13,7" />
        </svg>
      </button>

      {/* ═══ Responsive: mobile grid collapse ═══ */}
      <style>{`
        @media (max-width: 960px) {
          main > div:last-child {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          section[aria-label="System statistics"] {
            flex-direction: column !important;
            gap: var(--space-3) !important;
          }
          nav { padding: 0 var(--space-4) !important; }
          main { padding-left: var(--space-4) !important; padding-right: var(--space-4) !important; }
        }
      `}</style>
    </div>
  );
}
