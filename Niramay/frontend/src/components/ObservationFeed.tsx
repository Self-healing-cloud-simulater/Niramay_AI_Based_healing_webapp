/**
 * ObservationFeed — Panel 1
 * API traffic log table with latency sparkline.
 * Clean table with no vertical borders, row hover states, staggered entrance.
 */

import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, timeAgo, statusColor, methodColor,
  typeScale, fontFamily, spacing, radius, transitions,
  type ObservationLog,
} from '../designSystem';
import EmptyState from './EmptyState';

interface Props {
  logs: ObservationLog[];
}

export default function ObservationFeed({ logs }: Props) {
  const { theme, shadow } = useTheme();

  const sparkData = logs
    .slice(0, 20)
    .reverse()
    .map((l, i) => ({ i, v: l.response_time_ms }));

  return (
    <div
      style={{
        background: theme.surfaceElevated,
        border: `1px solid ${theme.borderSubtle}`,
        borderRadius: radius.soft,
        boxShadow: shadow.sm,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${theme.borderSubtle}`,
          background: theme.bgSecondary,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <span
            style={{
              ...typeScale.label,
              fontFamily: fontFamily.ui,
              color: theme.textSecondary,
            }}
          >
            Observation Feed
          </span>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: theme.accentGold,
              boxShadow: `0 0 8px ${theme.accentGold}`,
              animation: 'pulse-live 2s ease-in-out infinite',
            }}
          />
        </div>
        <span
          style={{
            ...typeScale.caption,
            fontFamily: fontFamily.ui,
            color: theme.textTertiary,
            padding: `2px ${spacing.xs}px`,
            background: theme.bgTertiary,
            borderRadius: radius.pill,
          }}
        >
          {logs.length} events
        </span>
      </div>

      {/* Sparkline */}
      {sparkData.length > 2 && (
        <div style={{ padding: `${spacing.xs}px ${spacing.lg}px 0`, height: 48 }}>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.chartArea} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={theme.chartArea} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={theme.chartPrimary}
                strokeWidth={1.5}
                fill="url(#sparkGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div
        className="nr-panel-scroll"
        style={{ flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, maxHeight: 420 }}
      >
        {logs.length === 0 ? (
          <EmptyState headline="No observations yet" description="Waiting for API traffic data to appear..." />
        ) : (
          <>
            {/* Table header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '56px 1fr 56px 64px 72px',
                gap: spacing.xs,
                padding: `${spacing.xs}px 0`,
                borderBottom: `1px solid ${theme.borderSubtle}`,
              }}
            >
              {['Method', 'Endpoint', 'Status', 'Latency', 'Time'].map(h => (
                <span
                  key={h}
                  style={{
                    ...typeScale.label,
                    fontSize: 10,
                    fontFamily: fontFamily.ui,
                    color: theme.textTertiary,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <AnimatePresence initial={false}>
              {logs.map((log, i) => (
                <motion.div
                  key={log.request_id || `${log.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.015 }}
                  className="nr-row-hover"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '56px 1fr 56px 64px 72px',
                    gap: spacing.xs,
                    padding: `${spacing.xs}px ${spacing.xxs}px`,
                    borderBottom: `1px solid ${theme.borderSubtle}22`,
                    alignItems: 'center',
                    borderRadius: radius.sharp,
                  }}
                >
                  {/* Method badge */}
                  <span
                    style={{
                      ...typeScale.caption,
                      fontSize: 10,
                      fontWeight: 500,
                      fontFamily: fontFamily.ui,
                      color: methodColor(log.method, theme),
                      background: `${methodColor(log.method, theme)}10`,
                      padding: `2px ${spacing.xs}px`,
                      borderRadius: radius.pill,
                      textAlign: 'center',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {log.method}
                  </span>

                  {/* Endpoint */}
                  <span
                    style={{
                      ...typeScale.body,
                      fontSize: 13,
                      fontFamily: fontFamily.ui,
                      color: theme.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={log.endpoint}
                  >
                    {log.endpoint.replace('/api/v1/', '/')}
                  </span>

                  {/* Status */}
                  <span
                    style={{
                      ...typeScale.body,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: fontFamily.ui,
                      fontVariantNumeric: 'tabular-nums',
                      color: statusColor(log.status_code, theme),
                    }}
                  >
                    {log.status_code}
                  </span>

                  {/* Latency */}
                  <span
                    style={{
                      ...typeScale.caption,
                      fontFamily: fontFamily.ui,
                      fontVariantNumeric: 'tabular-nums',
                      color: log.response_time_ms > 300 ? theme.warning : theme.textTertiary,
                    }}
                  >
                    {log.response_time_ms.toFixed(0)}ms
                  </span>

                  {/* Time */}
                  <span
                    style={{
                      ...typeScale.caption,
                      fontFamily: fontFamily.ui,
                      color: theme.textDisabled,
                      fontSize: 10,
                    }}
                  >
                    {timeAgo(log.timestamp)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
