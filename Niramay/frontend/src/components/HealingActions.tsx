import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, glass, timeAgo,
  type, font, sp, radius, ease, dur, type HealingAction,
} from '../designSystem';
import EmptyState from './EmptyState';

function ActionIcon({ action, color }: { action: string; color: string }) {
  const s = 14;
  if (action === 'restart_service') return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 8a7 7 0 0 1 13.2-3.2" /><path d="M15 8a7 7 0 0 1-13.2 3.2" />
      <polyline points="1,3 1,8 5,7" /><polyline points="15,13 15,8 11,9" />
    </svg>
  );
  if (action === 'retry_request') return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <polyline points="1,1 1,6 6,6" /><path d="M1 6 C3 3, 6 1, 8 1 a7 7 0 1 1-5 12" />
    </svg>
  );
  if (action === 'throttle_requests') return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="4" width="12" height="8" rx="2" /><line x1="5" y1="8" x2="11" y2="8" />
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><line x1="8" y1="8" x2="10" y2="10" />
    </svg>
  );
}

export default function HealingActionsPanel({ actions }: { actions: HealingAction[] }) {
  const { theme, isDark } = useTheme();

  const byType = actions.reduce<Record<string, number>>((a, x) => {
    a[x.healing_action] = (a[x.healing_action] || 0) + 1; return a;
  }, {});

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[1]}px ${sp[2]}px`, borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textSecondary }}>Healing Actions</span>
        <span style={{
          ...type.caption, fontFamily: font, fontWeight: 500,
          color: actions.length > 0 ? theme.success : theme.textTertiary,
          background: actions.length > 0 ? theme.successBg : 'transparent',
          padding: '2px 8px', borderRadius: radius.pill,
        }}>{actions.length} actions</span>
      </div>

      {Object.keys(byType).length > 0 && (
        <div style={{ display: 'flex', gap: sp.half, padding: `${sp[1]}px ${sp[2]}px 0`, flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([t, c]) => (
            <div key={t} style={{
              display: 'flex', gap: 4, alignItems: 'center',
              ...type.caption, fontSize: 10, fontFamily: font, color: theme.textSecondary,
              background: theme.hoverBg, padding: '3px 8px', borderRadius: radius.pill,
            }}>
              <ActionIcon action={t} color={theme.interactive} />
              <span>{t.replace(/_/g, ' ')}</span>
              <span style={{ fontWeight: 500 }}>×{c}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: `${sp[1]}px`, maxHeight: 400, overflowY: 'auto' }}>
        {actions.length === 0 ? (
          <EmptyState headline="No healing actions yet" description="Actions appear when anomalies are detected and resolved." />
        ) : (
          <AnimatePresence initial={false}>
            {actions.map((a, i) => (
              <motion.div key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
                style={{
                  display: 'flex', gap: sp[1], alignItems: 'flex-start',
                  padding: `${sp[1]}px ${sp.half}px`,
                  borderBottom: `1px solid ${theme.border}`,
                  transition: `background ${dur.fast}ms ${ease.standard}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.rowHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: radius.sm,
                  background: theme.hoverBg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ActionIcon action={a.healing_action} color={theme.interactive} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ ...type.bodySm, fontSize: 13, fontWeight: 500, fontFamily: font, color: theme.textPrimary, textTransform: 'capitalize' }}>
                      {a.healing_action.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      ...type.caption, fontSize: 9, fontWeight: 500, fontFamily: font,
                      color: a.status === 'success' ? theme.success : theme.warning,
                      background: a.status === 'success' ? theme.successBg : theme.warningBg,
                      padding: '1px 6px', borderRadius: radius.pill,
                    }}>{a.status}</span>
                  </div>
                  <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, lineHeight: 1.5 }}>{a.message}</div>
                  <div style={{ ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary, marginTop: 2, opacity: 0.6 }}>{timeAgo(a.timestamp)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
