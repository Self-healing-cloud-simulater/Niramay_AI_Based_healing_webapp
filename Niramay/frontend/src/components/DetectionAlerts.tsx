/**
 * DetectionAlerts — Panel 2
 * Anomaly cards with severity scoring and bar chart breakdown.
 * Left-border accent by severity, pill badges, clean type hierarchy.
 */

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, timeAgo, methodColor, severityColor,
  typeScale, fontFamily, spacing, radius, transitions,
  type AnomalyData,
} from '../designSystem';
import EmptyState from './EmptyState';

interface Props {
  data: AnomalyData | null;
}

export default function DetectionAlerts({ data }: Props) {
  const { theme, shadow } = useTheme();

  const chartData = data?.stats?.by_type
    ? Object.entries(data.stats.by_type).map(([name, count]) => ({
        name: name.replace(/_/g, ' '),
        count,
      }))
    : [];

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
        <span
          style={{
            ...typeScale.label,
            fontFamily: fontFamily.ui,
            color: theme.textSecondary,
          }}
        >
          Detection Alerts
        </span>
        <span
          style={{
            ...typeScale.caption,
            fontFamily: fontFamily.ui,
            color: data && data.total > 0 ? theme.warning : theme.textTertiary,
            padding: `2px ${spacing.xs}px`,
            background: data && data.total > 0 ? theme.warningLight : theme.bgTertiary,
            borderRadius: radius.pill,
            fontWeight: 500,
          }}
        >
          {data?.total || 0} anomalies
        </span>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div style={{ padding: `${spacing.md}px ${spacing.lg}px ${spacing.xxs}px`, height: 100 }}>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="name"
                tick={{ fill: theme.textTertiary, fontSize: 9, fontFamily: fontFamily.ui }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: theme.surfaceElevated,
                  border: `1px solid ${theme.borderDefault}`,
                  borderRadius: radius.soft,
                  fontSize: 12,
                  fontFamily: fontFamily.ui,
                  color: theme.textPrimary,
                  boxShadow: shadow.md,
                }}
                cursor={{ fill: `${theme.accentNavyLight}` }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => {
                  const palette = [
                    theme.chartPrimary,
                    theme.chartSecondary,
                    theme.chartTertiary,
                    theme.accentNavyMid,
                  ];
                  return <Cell key={i} fill={palette[i % palette.length]} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anomaly list */}
      <div
        className="nr-panel-scroll"
        style={{ flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, maxHeight: 420 }}
      >
        {!data || data.anomalies.length === 0 ? (
          <EmptyState headline="No anomalies detected" description="The system is operating within normal parameters." />
        ) : (
          <AnimatePresence initial={false}>
            {data.anomalies.map((a, i) => (
              <motion.div
                key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                style={{
                  background: theme.bgSecondary,
                  borderLeft: `3px solid ${severityColor(a.anomaly_score, theme)}`,
                  borderRadius: radius.soft,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  marginBottom: spacing.xs,
                  transition: `box-shadow ${transitions.fast}`,
                }}
              >
                {/* Top row: score + method + time */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing.xxs,
                  }}
                >
                  <div style={{ display: 'flex', gap: spacing.xxs, alignItems: 'center' }}>
                    <span
                      style={{
                        ...typeScale.caption,
                        fontWeight: 600,
                        fontFamily: fontFamily.ui,
                        fontVariantNumeric: 'tabular-nums',
                        color: severityColor(a.anomaly_score, theme),
                        background: `${severityColor(a.anomaly_score, theme)}12`,
                        padding: `2px ${spacing.xs}px`,
                        borderRadius: radius.pill,
                      }}
                    >
                      Score {a.anomaly_score}
                    </span>
                    <span
                      style={{
                        ...typeScale.caption,
                        fontSize: 10,
                        fontWeight: 500,
                        fontFamily: fontFamily.ui,
                        color: methodColor(a.method, theme),
                        background: `${methodColor(a.method, theme)}10`,
                        padding: `2px ${spacing.xs - 2}px`,
                        borderRadius: radius.pill,
                      }}
                    >
                      {a.method}
                    </span>
                  </div>
                  <span
                    style={{
                      ...typeScale.caption,
                      fontSize: 10,
                      fontFamily: fontFamily.ui,
                      color: theme.textDisabled,
                    }}
                  >
                    {timeAgo(a.timestamp)}
                  </span>
                </div>

                {/* Endpoint */}
                <div
                  style={{
                    ...typeScale.body,
                    fontSize: 13,
                    fontFamily: fontFamily.ui,
                    color: theme.textPrimary,
                    marginBottom: spacing.xxs,
                  }}
                >
                  {a.endpoint}
                </div>

                {/* Reason tags */}
                <div style={{ display: 'flex', gap: spacing.xxs, flexWrap: 'wrap' }}>
                  {a.anomaly_reasons.map((r, ri) => (
                    <span
                      key={ri}
                      style={{
                        ...typeScale.caption,
                        fontSize: 10,
                        fontFamily: fontFamily.ui,
                        color: theme.textTertiary,
                        background: theme.bgTertiary,
                        padding: `1px ${spacing.xs - 2}px`,
                        borderRadius: radius.pill,
                      }}
                    >
                      {r.replace(/_/g, ' ')}
                    </span>
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
