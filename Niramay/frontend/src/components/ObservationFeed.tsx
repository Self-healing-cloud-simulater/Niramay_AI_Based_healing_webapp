import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, glass, timeAgo, statusColor, methodColor,
  type, font, fontMono, sp, radius, ease, dur, type ObservationLog,
} from '../designSystem';
import EmptyState from './EmptyState';

export default function ObservationFeed({ logs }: { logs: ObservationLog[] }) {
  const { theme, isDark } = useTheme();
  const spark = logs.slice(0, 20).reverse().map((l, i) => ({ i, v: l.response_time_ms }));

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[1]}px ${sp[2]}px`, borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp[1] }}>
          <span style={{ ...type.label, fontFamily: font, color: theme.textSecondary }}>Observation Feed</span>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: theme.interactive, animation: 'pulse-dot 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
        </div>
        <span style={{ ...type.caption, fontFamily: font, color: theme.textTertiary }}>{logs.length} events</span>
      </div>

      {/* Sparkline */}
      {spark.length > 2 && (
        <div style={{ padding: `${sp.half}px ${sp[2]}px 0`, height: 40, opacity: 0.6 }}>
          <ResponsiveContainer width="100%" height={36}>
            <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartArea} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={theme.chartArea} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={theme.chartPrimary} strokeWidth={1.5} fill="url(#sg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, padding: `${sp[1]}px ${sp[1]}px`, maxHeight: 400, overflowY: 'auto' }}>
        {logs.length === 0 ? (
          <EmptyState headline="No observations yet" description="Waiting for traffic data..." />
        ) : (<>
          <div style={{
            display: 'grid', gridTemplateColumns: '52px 1fr 48px 56px 48px',
            gap: sp[1], padding: `${sp.half}px ${sp.half}px`, marginBottom: sp.half,
          }}>
            {['Method', 'Endpoint', 'Status', 'Latency', 'Time'].map(h => (
              <span key={h} style={{ ...type.label, fontSize: 10, fontFamily: font, color: theme.textTertiary }}>{h}</span>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div key={log.request_id || `${log.timestamp}-${i}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                style={{
                  display: 'grid', gridTemplateColumns: '52px 1fr 48px 56px 48px',
                  gap: sp[1], padding: `6px ${sp.half}px`, alignItems: 'center',
                  borderBottom: `1px solid ${theme.border}`, borderRadius: radius.xs,
                  transition: `background ${dur.fast}ms ${ease.standard}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  ...type.caption, fontSize: 10, fontWeight: 500, fontFamily: font,
                  color: methodColor(log.method, theme), background: `${methodColor(log.method, theme)}10`,
                  padding: '2px 6px', borderRadius: radius.pill, textAlign: 'center',
                }}>{log.method}</span>
                <span style={{ ...type.bodySm, fontFamily: font, color: theme.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={log.endpoint}>{log.endpoint.replace('/api/v1/', '/')}</span>
                <span style={{ ...type.mono, fontFamily: fontMono, color: statusColor(log.status_code, theme), fontWeight: 500, fontSize: 12 }}>
                  {log.status_code}
                </span>
                <span style={{ ...type.mono, fontFamily: fontMono, fontSize: 11, color: log.response_time_ms > 300 ? theme.warning : theme.textTertiary }}>
                  {log.response_time_ms.toFixed(0)}ms
                </span>
                <span style={{ ...type.caption, fontSize: 10, fontFamily: font, color: theme.textTertiary }}>
                  {timeAgo(log.timestamp)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </>)}
      </div>
    </div>
  );
}
