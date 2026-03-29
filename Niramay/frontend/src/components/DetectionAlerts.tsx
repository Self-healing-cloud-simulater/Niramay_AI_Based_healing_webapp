import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, glass, timeAgo, methodColor, severityColor,
  type, font, fontMono, sp, radius, ease, dur, type AnomalyData,
} from '../designSystem';
import EmptyState from './EmptyState';

export default function DetectionAlerts({ data }: { data: AnomalyData | null }) {
  const { theme, isDark } = useTheme();
  const chartData = data?.stats?.by_type
    ? Object.entries(data.stats.by_type).map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
    : [];
  const palette = [theme.chartPrimary, theme.chartSecondary, theme.chartTertiary, theme.navyMid];

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[1]}px ${sp[2]}px`, borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textSecondary }}>Detection Alerts</span>
        <span style={{
          ...type.caption, fontFamily: font, fontWeight: 500,
          color: data && data.total > 0 ? theme.warning : theme.textTertiary,
          background: data && data.total > 0 ? theme.warningBg : 'transparent',
          padding: '2px 8px', borderRadius: radius.pill,
        }}>{data?.total || 0} anomalies</span>
      </div>

      {chartData.length > 0 && (
        <div style={{ padding: `${sp[1]}px ${sp[2]}px 0`, height: 88 }}>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={chartData} barCategoryGap="25%">
              <XAxis dataKey="name" tick={{ fill: theme.textTertiary, fontSize: 9, fontFamily: font }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{
                ...glass(isDark), borderRadius: radius.md, fontSize: 12, fontFamily: font, color: theme.textPrimary, padding: '8px 12px',
              }} cursor={{ fill: theme.hoverBg }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ flex: 1, padding: `${sp[1]}px`, maxHeight: 400, overflowY: 'auto' }}>
        {!data || data.anomalies.length === 0 ? (
          <EmptyState headline="No anomalies detected" description="System operating within normal parameters." />
        ) : (
          <AnimatePresence initial={false}>
            {data.anomalies.map((a, i) => (
              <motion.div key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
                style={{
                  background: theme.hoverBg, borderLeft: `2px solid ${severityColor(a.anomaly_score, theme)}`,
                  borderRadius: radius.sm, padding: `${sp[1]}px ${sp[1]}px`, marginBottom: sp.half,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{
                      ...type.caption, fontSize: 10, fontWeight: 500, fontFamily: fontMono,
                      color: severityColor(a.anomaly_score, theme),
                      background: `${severityColor(a.anomaly_score, theme)}12`,
                      padding: '1px 6px', borderRadius: radius.pill,
                    }}>Score {a.anomaly_score}</span>
                    <span style={{
                      ...type.caption, fontSize: 9, fontWeight: 500, fontFamily: font,
                      color: methodColor(a.method, theme), padding: '1px 5px',
                      background: `${methodColor(a.method, theme)}10`, borderRadius: radius.pill,
                    }}>{a.method}</span>
                  </div>
                  <span style={{ ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary }}>{timeAgo(a.timestamp)}</span>
                </div>
                <div style={{ ...type.bodySm, fontSize: 12, fontFamily: font, color: theme.textPrimary, marginBottom: 4 }}>{a.endpoint}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {a.anomaly_reasons.map((r, ri) => (
                    <span key={ri} style={{
                      ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary,
                      background: theme.hoverBg, padding: '1px 6px', borderRadius: radius.pill,
                    }}>{r.replace(/_/g, ' ')}</span>
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
