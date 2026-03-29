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
        padding: `${sp[2]}px ${sp[4]}px`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: sp[1] }}>
          <span style={{ ...type.label, fontFamily: font, color: theme.textTertiary }}>Observation Feed</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.navy, animation: 'pulse-dot 2s ease-in-out infinite' }} />
        </div>
        <span style={{ ...type.caption, fontFamily: font, color: theme.textTertiary }}>{logs.length}</span>
      </div>

      {/* Sparkline */}
      {spark.length > 2 && (
        <div style={{ padding: `0 ${sp[4]}px`, height: 36, opacity: 0.4 }}>
          <ResponsiveContainer width="100%" height={32}>
            <AreaChart data={spark} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartArea} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={theme.chartArea} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={theme.chartPrimary} strokeWidth={1} fill="url(#sg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, padding: `${sp[1]}px ${sp[3]}px ${sp[3]}px`, maxHeight: 380, overflowY: 'auto' }}>
        {logs.length === 0 ? <EmptyState headline="Waiting for traffic data" /> : (<>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '48px 1fr 44px 52px 40px',
            gap: sp[1], padding: `${sp.half}px 0`, marginBottom: sp.half,
          }}>
            {['Method', 'Endpoint', 'Status', 'Latency', ''].map(h => (
              <span key={h} style={{ ...type.label, fontSize: 9, fontFamily: font, color: theme.textTertiary }}>{h}</span>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div key={log.request_id || `${log.timestamp}-${i}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                className="nr-row"
                style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr 44px 52px 40px',
                  gap: sp[1], padding: `5px 0`, alignItems: 'center',
                  borderBottom: `1px solid ${theme.border}`, borderRadius: radius.xs,
                  transition: `box-shadow ${dur.fast}ms ${ease.standard}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.hoverShadow)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <span style={{
                  ...type.caption, fontSize: 9, fontWeight: 500, fontFamily: font,
                  color: methodColor(log.method, theme), background: `${methodColor(log.method, theme)}08`,
                  padding: '2px 6px', borderRadius: radius.pill, textAlign: 'center',
                }}>{log.method}</span>
                <span style={{ ...type.bodySm, fontFamily: font, color: theme.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={log.endpoint}>{log.endpoint.replace('/api/v1/', '/')}</span>
                <span style={{ ...type.mono, fontFamily: fontMono, color: statusColor(log.status_code, theme), fontSize: 12 }}>
                  {log.status_code}
                </span>
                <span className="nr-subtle" style={{ ...type.mono, fontFamily: fontMono, fontSize: 10, color: theme.textTertiary }}>
                  {log.response_time_ms.toFixed(0)}ms
                </span>
                <span className="nr-reveal" style={{ ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary }}>
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
