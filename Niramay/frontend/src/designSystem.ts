/**
 * Niramay Design System v3 — Liquid Glass
 *
 * A dual-mode color system (light/dark) with glassmorphism surfaces,
 * spring physics, and editorial typography. Every token lives here.
 */

import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode, type CSSProperties, createElement,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════
   THEME COLORS
   ═══════════════════════════════════════════════════════════════════ */

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderHover: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  navyAccent: string;
  navyMid: string;
  navySoft: string;
  interactive: string;
  hoverBg: string;
  rowHover: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  chartArea: string;
  glow: string;
}

export const light: ThemeColors = {
  bg:              '#FAFAFA',
  surface:         '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border:          'rgba(10, 22, 40, 0.06)',
  borderHover:     'rgba(10, 22, 40, 0.12)',
  textPrimary:     '#0A1628',
  textSecondary:   '#4A5568',
  textTertiary:    '#8FA3BF',
  navyAccent:      '#1B3A6B',
  navyMid:         '#2E5090',
  navySoft:        '#8FA3BF',
  interactive:     '#1B3A6B',
  hoverBg:         'rgba(27, 58, 107, 0.05)',
  rowHover:        'rgba(27, 58, 107, 0.03)',
  success:         '#1A5C3A',
  successBg:       '#EAF4EE',
  warning:         '#7A4F1A',
  warningBg:       '#FDF4E7',
  error:           '#8B2020',
  errorBg:         '#FAEAEA',
  chartPrimary:    '#1B3A6B',
  chartSecondary:  '#2E5090',
  chartTertiary:   '#8FA3BF',
  chartArea:       '#1B3A6B',
  glow:            'rgba(27, 58, 107, 0.06)',
};

export const dark: ThemeColors = {
  bg:              '#070D18',
  surface:         '#0D1929',
  surfaceElevated: '#112236',
  border:          'rgba(255, 255, 255, 0.06)',
  borderHover:     'rgba(255, 255, 255, 0.12)',
  textPrimary:     '#EEF2F7',
  textSecondary:   '#8FA3BF',
  textTertiary:    '#4A5568',
  navyAccent:      '#4A80C4',
  navyMid:         '#6B9FD4',
  navySoft:        '#8FA3BF',
  interactive:     '#4A80C4',
  hoverBg:         'rgba(74, 128, 196, 0.08)',
  rowHover:        'rgba(74, 128, 196, 0.05)',
  success:         '#5CB88A',
  successBg:       '#1B2A22',
  warning:         '#D4A843',
  warningBg:       '#2A2519',
  error:           '#DC6B67',
  errorBg:         '#2A1B1F',
  chartPrimary:    '#4A80C4',
  chartSecondary:  '#6B9FD4',
  chartTertiary:   '#8FA3BF',
  chartArea:       '#4A80C4',
  glow:            'rgba(74, 128, 196, 0.15)',
};

/* ═══════════════════════════════════════════════════════════════════
   LIQUID GLASS — the defining aesthetic
   ═══════════════════════════════════════════════════════════════════ */

export function glass(isDark: boolean): CSSProperties {
  if (isDark) return {
    background: 'rgba(13, 25, 41, 0.75)',
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  };
  return {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 4px 24px rgba(10,22,40,0.06), 0 1px 2px rgba(10,22,40,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
  };
}

export function glassSubtle(isDark: boolean): CSSProperties {
  if (isDark) return {
    background: 'rgba(13, 25, 41, 0.5)',
    backdropFilter: 'blur(12px) saturate(140%)',
    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  };
  return {
    background: 'rgba(255, 255, 255, 0.55)',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
  };
}

/* ═══════════════════════════════════════════════════════════════════
   SPACING — 8pt grid, no exceptions
   ═══════════════════════════════════════════════════════════════════ */

export const sp = {
  1: 8, 2: 16, 3: 24, 4: 32, 5: 48, 6: 64, 7: 96, 8: 128,
  half: 4,
} as const;

/* ═══════════════════════════════════════════════════════════════════
   TYPOGRAPHY — Inter only, weights 300/400/500
   ═══════════════════════════════════════════════════════════════════ */

export const font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const fontMono = "'JetBrains Mono', 'Fira Code', monospace";

export const type = {
  hero:    { fontSize: 48, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2 },
  h1:      { fontSize: 32, fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.2 },
  h2:      { fontSize: 24, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.3 },
  h3:      { fontSize: 18, fontWeight: 500, letterSpacing: 0, lineHeight: 1.4 },
  body:    { fontSize: 15, fontWeight: 400, lineHeight: 1.6 },
  bodySm:  { fontSize: 13, fontWeight: 400, lineHeight: 1.6 },
  label:   { fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const, lineHeight: 1.4 },
  caption: { fontSize: 11, fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.4 },
  mono:    { fontSize: 13, fontWeight: 400, fontFamily: fontMono, letterSpacing: 0, lineHeight: 1.6 },
} as const;

/* ═══════════════════════════════════════════════════════════════════
   RADIUS
   ═══════════════════════════════════════════════════════════════════ */

export const radius = { xs: 4, sm: 8, md: 10, lg: 16, xl: 20, pill: 9999 } as const;

/* ═══════════════════════════════════════════════════════════════════
   EASING — physics-based curves
   ═══════════════════════════════════════════════════════════════════ */

export const ease = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out:      'cubic-bezier(0.0, 0, 0.2, 1)',
} as const;

export const dur = { micro: 80, fast: 150, default: 220, slow: 400 } as const;

/* ═══════════════════════════════════════════════════════════════════
   SHADOWS
   ═══════════════════════════════════════════════════════════════════ */

export const shadow = {
  xs:  '0 1px 3px rgba(10,22,40,0.04)',
  sm:  '0 2px 8px rgba(10,22,40,0.06)',
  md:  '0 4px 16px rgba(10,22,40,0.08)',
  lg:  '0 8px 32px rgba(10,22,40,0.10)',
} as const;

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

export const layout = { maxWidth: 1200, padding: 48, paddingMobile: 24, navHeight: 64 } as const;

/* ═══════════════════════════════════════════════════════════════════
   DATA TYPES
   ═══════════════════════════════════════════════════════════════════ */

export interface ObservationLog {
  timestamp: string; endpoint: string; method: string;
  status_code: number; response_time_ms: number; request_id: string; failure_type: string;
}

export interface AnomalyData {
  total: number; filtered: number;
  anomalies: Array<{
    timestamp: string; endpoint: string; method: string; status_code: number;
    response_time_ms: number; anomaly_score: number; anomaly_reasons: string[];
    failure_type: string;
    healing?: { healing_action: string; status: string; message: string; timestamp: string; };
  }>;
  stats: { by_endpoint: Record<string, number>; by_type: Record<string, number>; };
}

export interface HealingAction {
  healing_action: string; status: string; timestamp: string; message: string;
}

/* ═══════════════════════════════════════════════════════════════════
   THEME CONTEXT
   ═══════════════════════════════════════════════════════════════════ */

interface Ctx { theme: ThemeColors; isDark: boolean; toggleTheme: () => void; }

const ThemeContext = createContext<Ctx>({ theme: light, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const s = localStorage.getItem('niramay-theme');
    if (s) return s === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(p => { const n = !p; localStorage.setItem('niramay-theme', n ? 'dark' : 'light'); return n; });
  }, []);

  const theme = isDark ? dark : light;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', theme.bg);
  }, [isDark, theme]);

  return createElement(ThemeContext.Provider, { value: { theme, isDark, toggleTheme } }, children);
}

export function useTheme() { return useContext(ThemeContext); }

/* ═══════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════ */

export function timeAgo(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 1000) return 'now'; if (d < 60000) return `${Math.floor(d/1000)}s`;
  if (d < 3600000) return `${Math.floor(d/60000)}m`; return `${Math.floor(d/3600000)}h`;
}

export function statusColor(code: number, t: ThemeColors) {
  if (code >= 500) return t.error; if (code >= 400) return t.warning;
  if (code >= 200 && code < 300) return t.success; return t.textTertiary;
}

export function methodColor(m: string, t: ThemeColors) {
  return ({ GET: t.navyMid, POST: t.success, PUT: t.warning, PATCH: t.warning, DELETE: t.error }[m]) || t.textTertiary;
}

export function severityColor(s: number, t: ThemeColors) {
  if (s >= 5) return t.error; if (s >= 3) return t.warning; return t.navyMid;
}

export const AI_RECOMMENDATIONS = [
  { id: 1, severity: 'high' as const, title: 'Predicted: Database connection pool exhaustion in ~12 min',
    desc: 'Connection pool usage trending upward at 8.3%/min based on current request patterns.',
    action: 'Pre-scale connection pool to 200' },
  { id: 2, severity: 'medium' as const, title: 'Anomaly cluster detected on /api/v1/orders',
    desc: 'Latency spikes correlate with payment gateway response degradation over the last 20 minutes.',
    action: 'Enable circuit breaker for payment gateway' },
  { id: 3, severity: 'low' as const, title: 'Optimization: 34% of retry_request actions are redundant',
    desc: 'Retries on endpoints with >95% eventual success resolve naturally within 200ms.',
    action: 'Adjust retry threshold to 500ms' },
];
