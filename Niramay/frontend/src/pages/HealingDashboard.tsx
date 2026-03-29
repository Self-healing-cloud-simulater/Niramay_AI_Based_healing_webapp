import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ─────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || '';
const POLL_INTERVAL = 3000;

// ─── Color Palette ─────────────────────────────────────────────────────
const C = {
  bg:           '#070d1a',
  bgPanel:      '#0c1527',
  bgCard:       '#101d35',
  bgElevated:   '#142342',
  border:       '#1a2d50',
  borderLight:  '#223a63',
  blue50:       '#eff6ff',
  blue100:      '#dbeafe',
  blue200:      '#bfdbfe',
  blue300:      '#93c5fd',
  blue400:      '#60a5fa',
  blue500:      '#3b82f6',
  blue600:      '#2563eb',
  blue700:      '#1d4ed8',
  blue800:      '#1e40af',
  blue900:      '#1e3a8a',
  white:        '#ffffff',
  textMuted:    '#6b86b8',
  textDim:      '#3d5a8a',
  success:      '#22d3ee',
  warning:      '#f59e0b',
  critical:     '#ef4444',
  aiPurple:     '#8b5cf6',
  aiPurpleGlow: 'rgba(139,92,246,0.25)',
};

// ─── Data Types ────────────────────────────────────────────────────────
interface ObservationLog {
  timestamp: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_id: string;
  failure_type: string;
}

interface AnomalyData {
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

interface HealingAction {
  healing_action: string;
  status: string;
  timestamp: string;
  message: string;
}

// ─── Simulated AI Recommendations ──────────────────────────────────────
const AI_RECOMMENDATIONS = [
  { id: 1, severity: 'high', title: 'Predicted: Database connection pool exhaustion in ~12 min', desc: 'Based on current request patterns, connection pool usage is trending upward at 8.3%/min.', action: 'Pre-scale connection pool to 200' },
  { id: 2, severity: 'medium', title: 'Anomaly cluster detected on /api/v1/orders', desc: 'Latency spikes correlate with payment gateway response degradation over the last 20 minutes.', action: 'Enable circuit breaker for payment gateway' },
  { id: 3, severity: 'low', title: 'Optimization: 34% of retry_request actions are redundant', desc: 'Analysis shows retries on endpoints with >95% eventual success resolve naturally within 200ms.', action: 'Adjust retry threshold to 500ms' },
];

// ─── Utility Helpers ───────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function statusColor(code: number): string {
  if (code >= 500) return C.critical;
  if (code >= 400) return C.warning;
  if (code >= 200 && code < 300) return C.success;
  return C.textMuted;
}

function methodColor(method: string): string {
  const m: Record<string, string> = { GET: C.blue400, POST: C.success, PUT: C.warning, PATCH: C.warning, DELETE: C.critical };
  return m[method] || C.textMuted;
}

function severityColor(score: number): string {
  if (score >= 5) return C.critical;
  if (score >= 3) return C.warning;
  return C.blue400;
}

function actionIcon(action: string): string {
  const icons: Record<string, string> = { restart_service: '🔄', retry_request: '↩️', throttle_requests: '🛑', none: '⏭️' };
  return icons[action] || '⚙️';
}

// ─── Inline Styles ─────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(145deg, ${C.bg} 0%, #0a1225 50%, ${C.bg} 100%)`,
    color: C.white,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '24px 24px 40px',
  } as React.CSSProperties,

  header: {
    maxWidth: 1440,
    margin: '0 auto 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: 16,
  } as React.CSSProperties,

  grid: {
    maxWidth: 1440,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'auto auto',
    gap: 20,
  } as React.CSSProperties,

  panel: {
    background: C.bgPanel,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,

  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${C.border}`,
    background: `linear-gradient(180deg, ${C.bgCard} 0%, ${C.bgPanel} 100%)`,
  } as React.CSSProperties,

  panelTitle: {
    fontSize: '0.82rem',
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: C.blue100,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,

  panelBody: {
    flex: 1,
    padding: '12px 16px',
    overflowY: 'auto' as const,
    maxHeight: 420,
  } as React.CSSProperties,

  badge: (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: 0.5,
    borderRadius: 20,
    background: `${color}18`,
    color,
    border: `1px solid ${color}40`,
  }) as React.CSSProperties,

  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: C.success,
    boxShadow: `0 0 8px ${C.success}`,
    animation: 'pulse-live 2s ease-in-out infinite',
  } as React.CSSProperties,

  statCard: {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '16px 20px',
    flex: '1 1 140px',
    minWidth: 140,
  } as React.CSSProperties,

  tableRow: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr 60px 72px 80px',
    gap: 8,
    padding: '8px 0',
    borderBottom: `1px solid ${C.border}22`,
    alignItems: 'center',
    fontSize: '0.72rem',
  } as React.CSSProperties,

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    color: C.textDim,
    fontSize: '0.8rem',
    gap: 8,
  } as React.CSSProperties,
};

// ─── Keyframes (injected once) ─────────────────────────────────────────
const KEYFRAMES = `
@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes float-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.hl-scrollbar::-webkit-scrollbar { width: 5px; }
.hl-scrollbar::-webkit-scrollbar-track { background: transparent; }
.hl-scrollbar::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
.hl-scrollbar::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }

.hl-row-hover { transition: background 0.15s; }
.hl-row-hover:hover { background: ${C.bgCard}; }

.hl-glow-blue { box-shadow: 0 0 30px ${C.blue700}20, 0 4px 20px rgba(0,0,0,0.3); }
.hl-glow-purple { box-shadow: 0 0 30px ${C.aiPurpleGlow}, 0 4px 20px rgba(0,0,0,0.3); }

.hl-toggle-track {
  width: 36px; height: 20px; border-radius: 10px; position: relative; cursor: pointer;
  transition: background 0.25s;
}
.hl-toggle-track.on { background: ${C.blue500}; }
.hl-toggle-track.off { background: ${C.textDim}; }
.hl-toggle-knob {
  width: 16px; height: 16px; border-radius: 50%; background: white;
  position: absolute; top: 2px; transition: left 0.25s;
}
.hl-toggle-track.on .hl-toggle-knob { left: 18px; }
.hl-toggle-track.off .hl-toggle-knob { left: 2px; }

@media (max-width: 960px) {
  .hl-grid-responsive { grid-template-columns: 1fr !important; }
}
`;

// ─── Small Components ──────────────────────────────────────────────────
function PulsingDot() {
  return <div style={styles.liveIndicator} />;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div className={`hl-toggle-track ${on ? 'on' : 'off'}`} onClick={onToggle}>
      <div className="hl-toggle-knob" />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={styles.statCard}>
      <div style={{ fontSize: '0.65rem', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || C.white, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.62rem', color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={styles.emptyState}>
      <span style={{ fontSize: '2rem' }}>{icon}</span>
      <span>{text}</span>
      <span style={{ fontSize: '0.68rem', color: C.textDim }}>Waiting for traffic data...</span>
    </div>
  );
}

// ─── Panel 1: Observation Feed ─────────────────────────────────────────
function ObservationFeed({ logs }: { logs: ObservationLog[] }) {
  const sparkData = logs.slice(0, 20).reverse().map((l, i) => ({ i, v: l.response_time_ms }));

  return (
    <div style={styles.panel} className="hl-glow-blue">
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>
          <span style={{ fontSize: '1rem' }}>📡</span>
          Observation Feed
          <PulsingDot />
        </div>
        <span style={{ ...styles.badge(C.blue400) }}>{logs.length} events</span>
      </div>

      {sparkData.length > 2 && (
        <div style={{ padding: '8px 16px 0', height: 52 }}>
          <ResponsiveContainer width="100%" height={44}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.blue400} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={C.blue400} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={C.blue400} strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={styles.panelBody} className="hl-scrollbar">
        {logs.length === 0 ? (
          <EmptyState icon="📡" text="No observation logs yet" />
        ) : (
          <>
            <div style={{ ...styles.tableRow, borderBottom: `1px solid ${C.border}`, color: C.textDim, fontWeight: 600, fontSize: '0.62rem', letterSpacing: 1, textTransform: 'uppercase' }}>
              <span>Method</span><span>Endpoint</span><span>Status</span><span>Latency</span><span>Time</span>
            </div>
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={log.request_id || `${log.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.015 }}
                  className="hl-row-hover"
                  style={{ ...styles.tableRow, borderRadius: 6, padding: '8px 4px' }}
                >
                  <span style={{ ...styles.badge(methodColor(log.method)), fontSize: '0.6rem', textAlign: 'center' }}>{log.method}</span>
                  <span style={{ color: C.blue200, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.endpoint}>
                    {log.endpoint.replace('/api/v1/', '/')}
                  </span>
                  <span style={{ fontWeight: 700, color: statusColor(log.status_code), fontSize: '0.72rem' }}>{log.status_code}</span>
                  <span style={{ color: log.response_time_ms > 300 ? C.warning : C.textMuted, fontSize: '0.7rem' }}>{log.response_time_ms.toFixed(0)}ms</span>
                  <span style={{ color: C.textDim, fontSize: '0.62rem' }}>{timeAgo(log.timestamp)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Panel 2: Detection Alerts ─────────────────────────────────────────
function DetectionAlerts({ data }: { data: AnomalyData | null }) {
  const chartData = data?.stats?.by_type
    ? Object.entries(data.stats.by_type).map(([name, count]) => ({ name: name.replace('_', ' '), count }))
    : [];

  const barColors = [C.blue400, C.blue500, C.blue300, C.warning, C.critical, C.success];

  return (
    <div style={styles.panel} className="hl-glow-blue">
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>
          <span style={{ fontSize: '1rem' }}>🔍</span>
          Detection Alerts
        </div>
        <span style={{ ...styles.badge(data && data.total > 0 ? C.warning : C.textDim) }}>
          {data?.total || 0} anomalies
        </span>
      </div>

      {chartData.length > 0 && (
        <div style={{ padding: '12px 16px 4px', height: 110 }}>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.7rem', color: C.white }}
                cursor={{ fill: `${C.blue700}20` }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={styles.panelBody} className="hl-scrollbar">
        {!data || data.anomalies.length === 0 ? (
          <EmptyState icon="🔍" text="No anomalies detected" />
        ) : (
          <AnimatePresence initial={false}>
            {data.anomalies.map((a, i) => (
              <motion.div
                key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                style={{
                  background: C.bgCard,
                  border: `1px solid ${severityColor(a.anomaly_score)}25`,
                  borderLeft: `3px solid ${severityColor(a.anomaly_score)}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...styles.badge(severityColor(a.anomaly_score)), fontWeight: 800, fontSize: '0.68rem' }}>
                      Score {a.anomaly_score}
                    </span>
                    <span style={{ ...styles.badge(methodColor(a.method)), fontSize: '0.58rem' }}>{a.method}</span>
                  </div>
                  <span style={{ color: C.textDim, fontSize: '0.6rem' }}>{timeAgo(a.timestamp)}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: C.blue200, marginBottom: 4 }}>{a.endpoint}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {a.anomaly_reasons.map((r, ri) => (
                    <span key={ri} style={{ ...styles.badge(C.blue400), fontSize: '0.58rem' }}>{r.replace('_', ' ')}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Panel 3: Healing Actions ──────────────────────────────────────────
function HealingActions({ actions }: { actions: HealingAction[] }) {
  const byType = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.healing_action] = (acc[a.healing_action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={styles.panel} className="hl-glow-blue">
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>
          <span style={{ fontSize: '1rem' }}>⚕️</span>
          Healing Actions
        </div>
        <span style={{ ...styles.badge(actions.length > 0 ? C.success : C.textDim) }}>
          {actions.length} actions
        </span>
      </div>

      {Object.keys(byType).length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px 4px', flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([type, count]) => (
            <div key={type} style={{ ...styles.badge(C.blue300), display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>{actionIcon(type)}</span>
              <span>{type.replace('_', ' ')}</span>
              <span style={{ fontWeight: 800 }}>×{count}</span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.panelBody} className="hl-scrollbar">
        {actions.length === 0 ? (
          <EmptyState icon="⚕️" text="No healing actions executed" />
        ) : (
          <AnimatePresence initial={false}>
            {actions.map((a, i) => (
              <motion.div
                key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="hl-row-hover"
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '12px 8px',
                  borderBottom: `1px solid ${C.border}22`,
                  borderRadius: 8,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${C.blue500}18`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', flexShrink: 0,
                }}>
                  {actionIcon(a.healing_action)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.76rem', color: C.blue100, textTransform: 'capitalize' }}>
                      {a.healing_action.replace(/_/g, ' ')}
                    </span>
                    <span style={{ ...styles.badge(a.status === 'success' ? C.success : C.warning), fontSize: '0.58rem' }}>
                      {a.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: C.textMuted, lineHeight: 1.4 }}>{a.message}</div>
                  <div style={{ fontSize: '0.58rem', color: C.textDim, marginTop: 4 }}>{timeAgo(a.timestamp)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Panel 4: AI Copilot ───────────────────────────────────────────────
function AICopilot() {
  const [features, setFeatures] = useState({
    predictive: false,
    rootCause: false,
    smartPriority: false,
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: '👋 Hello! I\'m your AI Copilot. Once the AI backend is integrated, I\'ll provide real-time fault analysis, predictive insights, and automated healing recommendations. Try toggling the features below!' },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);

    setTimeout(() => {
      const responses = [
        `Interesting question about "${q}". Once connected to the AI backend, I'll analyze patterns across all 3 layers to provide a comprehensive answer.`,
        `I've noted your query: "${q}". In the next phase, I'll use ML models trained on your observation and detection data to give precise insights.`,
        `Great question! When the AI engine is live, queries like "${q}" will be answered using real-time analysis of anomaly patterns and healing outcomes.`,
      ];
      setChatMessages(prev => [...prev, { role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] }]);
    }, 1200);
  };

  return (
    <div style={{ ...styles.panel, border: `1px solid ${C.aiPurple}30` }} className="hl-glow-purple">
      <div style={{ ...styles.panelHeader, background: `linear-gradient(135deg, ${C.bgCard} 0%, #1a1235 100%)` }}>
        <div style={{ ...styles.panelTitle, color: '#c4b5fd' }}>
          <span style={{ fontSize: '1rem' }}>🤖</span>
          AI Copilot
          <span style={{
            fontSize: '0.55rem', padding: '2px 8px', borderRadius: 20,
            background: `${C.aiPurple}25`, color: C.aiPurple, border: `1px solid ${C.aiPurple}50`,
            fontWeight: 700, letterSpacing: 1,
          }}>PREVIEW</span>
        </div>
      </div>

      <div style={{ ...styles.panelBody, maxHeight: 460, padding: '12px 16px' }} className="hl-scrollbar">

        {/* Feature Toggles */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.65rem', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 600 }}>
            AI Features
          </div>
          {[
            { key: 'predictive' as const, label: 'Predictive Healing', desc: 'Forecast failures before they happen' },
            { key: 'rootCause' as const, label: 'Auto Root Cause Analysis', desc: 'AI-powered failure diagnosis' },
            { key: 'smartPriority' as const, label: 'Smart Prioritization', desc: 'Intelligent action ranking' },
          ].map(feat => (
            <div key={feat.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', background: C.bgCard, borderRadius: 10, marginBottom: 6,
              border: `1px solid ${features[feat.key] ? C.aiPurple + '40' : C.border}`,
              transition: 'border-color 0.25s',
            }}>
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: features[feat.key] ? '#c4b5fd' : C.blue200 }}>{feat.label}</div>
                <div style={{ fontSize: '0.6rem', color: C.textDim, marginTop: 2 }}>{feat.desc}</div>
              </div>
              <Toggle on={features[feat.key]} onToggle={() => setFeatures(f => ({ ...f, [feat.key]: !f[feat.key] }))} />
            </div>
          ))}
        </div>

        {/* AI Recommendations */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.65rem', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 600 }}>
            AI Recommendations
          </div>
          {AI_RECOMMENDATIONS.map(rec => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: C.bgCard,
                border: `1px solid ${rec.severity === 'high' ? C.critical + '30' : rec.severity === 'medium' ? C.warning + '30' : C.blue500 + '30'}`,
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  ...styles.badge(rec.severity === 'high' ? C.critical : rec.severity === 'medium' ? C.warning : C.blue400),
                  fontSize: '0.58rem'
                }}>
                  {rec.severity.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.blue100, marginBottom: 4, lineHeight: 1.4 }}>{rec.title}</div>
              <div style={{ fontSize: '0.64rem', color: C.textMuted, marginBottom: 8, lineHeight: 1.4 }}>{rec.desc}</div>
              <button style={{
                width: '100%', padding: '7px 12px',
                background: `${C.aiPurple}15`, border: `1px solid ${C.aiPurple}40`,
                borderRadius: 8, color: '#c4b5fd', fontSize: '0.65rem', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.aiPurple}30`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${C.aiPurple}15`)}
              >
                ⚡ {rec.action}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Chat Interface */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.65rem', color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, fontWeight: 600 }}>
            Ask AI
          </div>
          <div style={{
            background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`,
            padding: '8px 10px', maxHeight: 180, overflowY: 'auto',
          }} className="hl-scrollbar">
            {chatMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 6,
              }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
                  background: msg.role === 'user' ? `${C.blue600}40` : `${C.aiPurple}15`,
                  border: `1px solid ${msg.role === 'user' ? C.blue600 + '30' : C.aiPurple + '25'}`,
                  fontSize: '0.68rem', color: C.blue100, lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about system health..."
              style={{
                flex: 1, background: C.bgElevated, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '10px 14px', color: C.white,
                fontSize: '0.72rem', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              style={{
                padding: '10px 16px', background: C.aiPurple, color: C.white,
                borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#7c3aed')}
              onMouseLeave={e => (e.currentTarget.style.background = C.aiPurple)}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── ROOT COMPONENT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

export default function HealingDashboard() {
  const [logs, setLogs] = useState<ObservationLog[]>([]);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval>>();

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

  // Inject keyframes
  useEffect(() => {
    const id = 'hl-dashboard-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = KEYFRAMES;
      document.head.appendChild(el);
    }
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);

  // Derived stats
  const totalRequests = logs.length;
  const failureCount = logs.filter(l => l.status_code >= 400).length;
  const avgLatency = totalRequests > 0 ? (logs.reduce((s, l) => s + l.response_time_ms, 0) / totalRequests).toFixed(0) : '—';
  const successRate = totalRequests > 0 ? ((1 - failureCount / totalRequests) * 100).toFixed(1) : '—';

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: -0.5 }}>
              <span style={{ color: C.blue400 }}>Healing</span> Layer Dashboard
            </h1>
            {isLive && <PulsingDot />}
          </div>
          <p style={{ fontSize: '0.72rem', color: C.textMuted }}>
            Real-time monitoring across Observation → Detection → Healing pipeline
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', background: C.bgCard, borderRadius: 10,
            border: `1px solid ${C.border}`, fontSize: '0.7rem',
          }}>
            <span style={{ color: C.textMuted }}>Live</span>
            <Toggle on={isLive} onToggle={() => setIsLive(!isLive)} />
          </div>
          <button
            onClick={fetchData}
            style={{
              padding: '8px 16px', background: C.blue600, border: 'none',
              borderRadius: 10, color: C.white, fontSize: '0.72rem',
              fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.blue700)}
            onMouseLeave={e => (e.currentTarget.style.background = C.blue600)}
          >
            ⟳ Refresh
          </button>
          <span style={{ fontSize: '0.6rem', color: C.textDim }}>
            Last: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ maxWidth: 1440, margin: '0 auto 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard label="Total Requests" value={totalRequests} sub="in current window" color={C.blue400} />
        <StatCard label="Success Rate" value={`${successRate}%`} sub="2xx responses" color={C.success} />
        <StatCard label="Avg Latency" value={`${avgLatency}ms`} sub="response time" color={C.blue300} />
        <StatCard label="Anomalies" value={anomalyData?.total || 0} sub="detected" color={anomalyData && anomalyData.total > 0 ? C.warning : C.textDim} />
        <StatCard label="Healing Actions" value={healingActions.length} sub="executed" color={healingActions.length > 0 ? C.success : C.textDim} />
      </div>

      {/* 2×2 Grid */}
      <div style={styles.grid} className="hl-grid-responsive">
        <ObservationFeed logs={logs} />
        <DetectionAlerts data={anomalyData} />
        <HealingActions actions={healingActions} />
        <AICopilot />
      </div>
    </div>
  );
}
