/**
 * Niramay Design System — Single Source of Truth
 *
 * Silent luxury aesthetic: white, off-white, navy with restrained gold accent.
 * Every token used across the application is defined here.
 * No hardcoded color, spacing, font size, or shadow exists outside this file.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  createElement,
} from 'react';

/* ════════════════════════════════════════════════════════════════════════
   THEME COLORS
   ════════════════════════════════════════════════════════════════════════ */

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  surfaceElevated: string;

  // Borders
  borderSubtle: string;
  borderDefault: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;

  // Accent
  accentNavy: string;
  accentNavyMid: string;
  accentNavyLight: string;
  accentGold: string;

  // Semantic
  error: string;
  errorLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;

  // Shadow base (rgb triplet for rgba)
  shadowColor: string;

  // Chart palette
  chartPrimary: string;
  chartSecondary: string;
  chartTertiary: string;
  chartArea: string;
}

export const lightTheme: ThemeColors = {
  bgPrimary:       '#FFFFFF',
  bgSecondary:     '#F8F9FC',
  bgTertiary:      '#F1F4F9',
  surfaceElevated: '#FFFFFF',

  borderSubtle:    '#E8ECF4',
  borderDefault:   '#D1D9E8',

  textPrimary:     '#0A1628',
  textSecondary:   '#3D5070',
  textTertiary:    '#7A8FAD',
  textDisabled:    '#B8C4D6',

  accentNavy:      '#1B3A6B',
  accentNavyMid:   '#2D5BB5',
  accentNavyLight: '#EEF3FF',
  accentGold:      '#C9A96E',

  error:           '#C0392B',
  errorLight:      '#FDF2F1',
  success:         '#1A6B45',
  successLight:    '#F0F9F4',
  warning:         '#B8860B',
  warningLight:    '#FFF9EE',

  shadowColor:     '10, 22, 40',

  chartPrimary:    '#1B3A6B',
  chartSecondary:  '#2D5BB5',
  chartTertiary:   '#7A8FAD',
  chartArea:       '#1B3A6B',
};

export const darkTheme: ThemeColors = {
  bgPrimary:       '#0C1220',
  bgSecondary:     '#111A2E',
  bgTertiary:      '#182336',
  surfaceElevated: '#1E2B40',

  borderSubtle:    '#1E2B40',
  borderDefault:   '#2A3D58',

  textPrimary:     '#F1F4F9',
  textSecondary:   '#8BA1BE',
  textTertiary:    '#5B7190',
  textDisabled:    '#3D5470',

  accentNavy:      '#6BA3E8',
  accentNavyMid:   '#4E8BD4',
  accentNavyLight: '#162640',
  accentGold:      '#D4B87A',

  error:           '#DC6B67',
  errorLight:      '#2A1B1F',
  success:         '#5CB88A',
  successLight:    '#1B2A22',
  warning:         '#D4A843',
  warningLight:    '#2A2519',

  shadowColor:     '0, 0, 0',

  chartPrimary:    '#6BA3E8',
  chartSecondary:  '#4E8BD4',
  chartTertiary:   '#5B7190',
  chartArea:       '#6BA3E8',
};

/* ════════════════════════════════════════════════════════════════════════
   SPACING — 8pt Grid
   ════════════════════════════════════════════════════════════════════════ */

export const spacing = {
  xxs: 4,
  xs:  8,
  sm:  12,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,
  '7xl': 128,
} as const;

/* ════════════════════════════════════════════════════════════════════════
   TYPOGRAPHY
   ════════════════════════════════════════════════════════════════════════ */

export const fontFamily = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  ui:      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const;

export const typeScale = {
  display:   { fontSize: 48, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.1 },
  h1:        { fontSize: 32, fontWeight: 400, letterSpacing: '-0.015em', lineHeight: 1.2 },
  h2:        { fontSize: 24, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.3 },
  h3:        { fontSize: 18, fontWeight: 500, letterSpacing: '-0.005em', lineHeight: 1.4 },
  bodyLarge: { fontSize: 16, fontWeight: 400, lineHeight: 1.7 },
  body:      { fontSize: 14, fontWeight: 400, lineHeight: 1.65 },
  label:     { fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' as const },
  caption:   { fontSize: 11, fontWeight: 400, letterSpacing: '0.02em' },
} as const;

/* ════════════════════════════════════════════════════════════════════════
   BORDER RADIUS
   ════════════════════════════════════════════════════════════════════════ */

export const radius = {
  sharp: 2,
  soft:  8,
  pill:  9999,
} as const;

/* ════════════════════════════════════════════════════════════════════════
   SHADOWS — elevation through shadow, not color
   ════════════════════════════════════════════════════════════════════════ */

export function makeShadows(c: string) {
  return {
    xs: `0 1px 2px rgba(${c}, 0.04)`,
    sm: `0 2px 8px rgba(${c}, 0.06), 0 1px 2px rgba(${c}, 0.04)`,
    md: `0 4px 16px rgba(${c}, 0.08), 0 2px 4px rgba(${c}, 0.04)`,
    lg: `0 8px 32px rgba(${c}, 0.10), 0 4px 8px rgba(${c}, 0.06)`,
    xl: `0 16px 48px rgba(${c}, 0.12), 0 8px 16px rgba(${c}, 0.06)`,
  };
}

export type Shadows = ReturnType<typeof makeShadows>;

/* ════════════════════════════════════════════════════════════════════════
   TRANSITIONS — every interactive element has one
   ════════════════════════════════════════════════════════════════════════ */

export const transitions = {
  fast:    '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  default: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow:    '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  spring:  '600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/* ════════════════════════════════════════════════════════════════════════
   Z-INDEX SCALE — never above 1000
   ════════════════════════════════════════════════════════════════════════ */

export const zIndex = {
  base:          1,
  dropdown:      100,
  sticky:        200,
  modalBackdrop: 300,
  modal:         400,
  toast:         500,
} as const;

/* ════════════════════════════════════════════════════════════════════════
   LAYOUT
   ════════════════════════════════════════════════════════════════════════ */

export const layout = {
  maxWidth:       1280,
  paddingDesktop: 40,
  paddingMobile:  20,
  sectionGap:     64,
} as const;

/* ════════════════════════════════════════════════════════════════════════
   DATA TYPES (moved from HealingDashboard for shared use)
   ════════════════════════════════════════════════════════════════════════ */

export interface ObservationLog {
  timestamp: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_id: string;
  failure_type: string;
}

export interface AnomalyData {
  total: number;
  filtered: number;
  anomalies: Array<{
    timestamp: string;
    endpoint: string;
    method: string;
    status_code: number;
    response_time_ms: number;
    anomaly_score: number;
    anomaly_reasons: string[];
    failure_type: string;
    healing?: {
      healing_action: string;
      status: string;
      message: string;
      timestamp: string;
    };
  }>;
  stats: {
    by_endpoint: Record<string, number>;
    by_type: Record<string, number>;
  };
}

export interface HealingAction {
  healing_action: string;
  status: string;
  timestamp: string;
  message: string;
}

/* ════════════════════════════════════════════════════════════════════════
   THEME CONTEXT
   ════════════════════════════════════════════════════════════════════════ */

interface ThemeContextValue {
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  shadow: Shadows;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  shadow: makeShadows(lightTheme.shadowColor),
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('niramay-theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('niramay-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const theme = isDark ? darkTheme : lightTheme;
  const shadow = makeShadows(theme.shadowColor);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.bgPrimary);
  }, [isDark, theme]);

  return createElement(
    ThemeContext.Provider,
    { value: { theme, isDark, toggleTheme, shadow } },
    children
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/* ════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ════════════════════════════════════════════════════════════════════════ */

export function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000)    return 'just now';
  if (diff < 60000)   return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export function statusColor(code: number, t: ThemeColors): string {
  if (code >= 500) return t.error;
  if (code >= 400) return t.warning;
  if (code >= 200 && code < 300) return t.success;
  return t.textTertiary;
}

export function methodColor(method: string, t: ThemeColors): string {
  const map: Record<string, string> = {
    GET:    t.accentNavyMid,
    POST:   t.success,
    PUT:    t.warning,
    PATCH:  t.warning,
    DELETE: t.error,
  };
  return map[method] || t.textTertiary;
}

export function severityColor(score: number, t: ThemeColors): string {
  if (score >= 5) return t.error;
  if (score >= 3) return t.warning;
  return t.accentNavyMid;
}

/* ════════════════════════════════════════════════════════════════════════
   STATIC DATA (AI recommendations — unchanged from original)
   ════════════════════════════════════════════════════════════════════════ */

export const AI_RECOMMENDATIONS = [
  {
    id: 1,
    severity: 'high' as const,
    title: 'Predicted: Database connection pool exhaustion in ~12 min',
    desc: 'Based on current request patterns, connection pool usage is trending upward at 8.3%/min.',
    action: 'Pre-scale connection pool to 200',
  },
  {
    id: 2,
    severity: 'medium' as const,
    title: 'Anomaly cluster detected on /api/v1/orders',
    desc: 'Latency spikes correlate with payment gateway response degradation over the last 20 minutes.',
    action: 'Enable circuit breaker for payment gateway',
  },
  {
    id: 3,
    severity: 'low' as const,
    title: 'Optimization: 34% of retry_request actions are redundant',
    desc: 'Analysis shows retries on endpoints with >95% eventual success resolve naturally within 200ms.',
    action: 'Adjust retry threshold to 500ms',
  },
];
