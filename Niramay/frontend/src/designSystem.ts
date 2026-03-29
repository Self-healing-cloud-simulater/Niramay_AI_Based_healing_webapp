/**
 * Niramay Design System v4 — Silent Luxury + Liquid Glass
 *
 * Pristine white surfaces, deep navy ink, frosted glass panels.
 * Weight contrast: 700 headers vs 300 body. Spring physics. Progressive disclosure.
 */

import {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode, type CSSProperties, createElement,
} from 'react';

/* ═══════════════════════════════════════════════════════════════════
   THEME
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
  navy: string;
  navyMid: string;
  navySoft: string;
  hoverShadow: string;
  hoverBg: string;
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
  border:          'rgba(10, 20, 40, 0.06)',
  borderHover:     'rgba(10, 20, 40, 0.10)',
  textPrimary:     '#0A1428',
  textSecondary:   '#3D4F68',
  textTertiary:    '#8899B0',
  navy:            '#0F172A',
  navyMid:         '#1E3A5F',
  navySoft:        '#6B8AAE',
  hoverShadow:     '0 4px 20px rgba(10, 20, 40, 0.10)',
  hoverBg:         'rgba(15, 23, 42, 0.03)',
  success:         '#166534',
  successBg:       'rgba(22, 101, 52, 0.06)',
  warning:         '#854D0E',
  warningBg:       'rgba(133, 77, 14, 0.06)',
  error:           '#991B1B',
  errorBg:         'rgba(153, 27, 27, 0.06)',
  chartPrimary:    '#0F172A',
  chartSecondary:  '#1E3A5F',
  chartTertiary:   '#8899B0',
  chartArea:       '#0F172A',
  glow:            'rgba(15, 23, 42, 0.04)',
};

export const dark: ThemeColors = {
  bg:              '#060C18',
  surface:         '#0C1628',
  surfaceElevated: '#101E34',
  border:          'rgba(255, 255, 255, 0.05)',
  borderHover:     'rgba(255, 255, 255, 0.10)',
  textPrimary:     '#EDF2F7',
  textSecondary:   '#8899B0',
  textTertiary:    '#475569',
  navy:            '#93B4E0',
  navyMid:         '#5B8DC9',
  navySoft:        '#3D6BA3',
  hoverShadow:     '0 4px 20px rgba(0, 0, 0, 0.35)',
  hoverBg:         'rgba(93, 141, 201, 0.06)',
  success:         '#4ADE80',
  successBg:       'rgba(74, 222, 128, 0.08)',
  warning:         '#FBBF24',
  warningBg:       'rgba(251, 191, 36, 0.08)',
  error:           '#F87171',
  errorBg:         'rgba(248, 113, 113, 0.08)',
  chartPrimary:    '#5B8DC9',
  chartSecondary:  '#93B4E0',
  chartTertiary:   '#475569',
  chartArea:       '#5B8DC9',
  glow:            'rgba(93, 141, 201, 0.10)',
};

/* ═══════════════════════════════════════════════════════════════════
   LIQUID GLASS
   ═══════════════════════════════════════════════════════════════════ */

export function glass(isDark: boolean): CSSProperties {
  if (isDark) return {
    background: 'rgba(12, 22, 40, 0.82)',
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  };
  return {
    background: 'rgba(255, 255, 255, 0.82)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 4px 32px rgba(10,20,40,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
  };
}

export function glassNav(isDark: boolean): CSSProperties {
  if (isDark) return {
    background: 'rgba(6, 12, 24, 0.75)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  };
  return {
    background: 'rgba(250, 250, 250, 0.75)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderBottom: '1px solid rgba(10,20,40,0.04)',
  };
}

/* ═══════════════════════════════════════════════════════════════════
   SPACING — generous, luxurious
   ═══════════════════════════════════════════════════════════════════ */

export const sp = {
  1: 8, 2: 16, 3: 24, 4: 32, 5: 48, 6: 64, 7: 96, 8: 128,
  half: 4,
} as const;

/* ═══════════════════════════════════════════════════════════════════
   TYPOGRAPHY — SF Pro / Inter stack, weight contrast
   ═══════════════════════════════════════════════════════════════════ */

export const font = "'SF Pro Display', -apple-system, 'Helvetica Neue', 'Inter', sans-serif";
export const fontMono = "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace";

export const type = {
  display: { fontSize: 56, fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.1 },
  h1:      { fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 },
  h2:      { fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.25 },
  h3:      { fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.35 },
  body:    { fontSize: 15, fontWeight: 300, lineHeight: 1.65 },
  bodySm:  { fontSize: 13, fontWeight: 300, lineHeight: 1.6 },
  label:   { fontSize: 11, fontWeight: 400, letterSpacing: '0.08em', textTransform: 'uppercase' as const, lineHeight: 1.4 },
  caption: { fontSize: 11, fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1.4 },
  mono:    { fontSize: 13, fontWeight: 400, fontFamily: fontMono, letterSpacing: 0, lineHeight: 1.6 },
} as const;

/* ═══════════════════════════════════════════════════════════════════
   RADIUS / EASING / LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

export const radius = { xs: 4, sm: 8, md: 12, lg: 20, pill: 9999 } as const;

export const ease = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  out:      'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const dur = { micro: 80, fast: 150, base: 220, slow: 400, reveal: 600 } as const;

export const layout = { maxWidth: 1120, padding: 64, paddingMobile: 24, navHeight: 72 } as const;

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
  { id: 1, severity: 'high' as const, title: 'Database connection pool exhaustion predicted in ~12 min',
    desc: 'Connection pool usage trending upward at 8.3%/min.',
    action: 'Pre-scale connection pool' },
  { id: 2, severity: 'medium' as const, title: 'Anomaly cluster detected on /api/v1/orders',
    desc: 'Latency correlates with payment gateway degradation.',
    action: 'Enable circuit breaker' },
  { id: 3, severity: 'low' as const, title: '34% of retry_request actions are redundant',
    desc: 'Endpoints with >95% eventual success resolve naturally.',
    action: 'Adjust retry threshold' },
];
