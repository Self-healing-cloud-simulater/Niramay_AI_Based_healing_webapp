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
  const pal = [theme.chartPrimary, theme.chartSecondary, theme.chartTertiary, theme.navyMid];

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[2]}px ${sp[4]}px`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textTertiary }}>Detection</span>
        <span style={{
          ...type.caption, fontFamily: font, fontWeight: 400,
          color: data && data.total > 0 ? theme.warning : theme.textTertiary,
          background: data && data.total > 0 ? theme.warningBg : 'transparent',
          padding: '2px 8px', borderRadius: radius.pill,
        }}>{data?.total || 0}</span>
      </div>

      {chartData.length > 0 && (
        <div style={{ padding: `0 ${sp[4]}px`, height: 80 }}>
          <ResponsiveContainer width="100%" height={64}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: theme.textTertiary, fontSize: 8, fontFamily: font }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{
                ...glass(isDark), borderRadius: radius.md, fontSize: 11, fontFamily: font, color: theme.textPrimary, padding: '6px 10px',
              }} cursor={{ fill: theme.hoverBg }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ flex: 1, padding: `${sp[2]}px ${sp[3]}px`, maxHeight: 360, overflowY: 'auto' }}>
        {!data || data.anomalies.length === 0 ? (
          <EmptyState headline="No anomalies detected" description="System operating normally." />
        ) : (
          <AnimatePresence initial={false}>
            {data.anomalies.map((a, i) => (
              <motion.div key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
                className="nr-row"
                style={{
                  borderLeft: `2px solid ${severityColor(a.anomaly_score, theme)}`,
                  borderRadius: radius.sm, padding: `${sp[2]}px ${sp[2]}px`,
                  marginBottom: sp[1],
                  transition: `box-shadow ${dur.base}ms ${ease.out}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.hoverShadow)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sp.half }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{
                      ...type.mono, fontSize: 10, fontFamily: fontMono,
                      color: severityColor(a.anomaly_score, theme),
                    }}>s:{a.anomaly_score}</span>
                    <span style={{
                      ...type.caption, fontSize: 9, fontWeight: 400, fontFamily: font,
                      color: methodColor(a.method, theme),
                    }}>{a.method}</span>
                  </div>
                  <span className="nr-subtle" style={{ ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary }}>
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
                <div style={{ ...type.bodySm, fontSize: 12, fontFamily: font, color: theme.textPrimary }}>{a.endpoint}</div>
                {/* Progressive disclosure — reason tags hidden until hover */}
                <div className="nr-reveal" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: sp.half }}>
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
