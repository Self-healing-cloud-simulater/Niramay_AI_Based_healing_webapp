import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, glass, timeAgo,
  type, font, sp, radius, ease, dur, type HealingAction,
} from '../designSystem';
import EmptyState from './EmptyState';

function Icon({ action, color }: { action: string; color: string }) {
  const s = 13;
  if (action === 'restart_service') return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
      <path d="M1 8a7 7 0 0 1 13.2-3.2"/><path d="M15 8a7 7 0 0 1-13.2 3.2"/>
      <polyline points="1,3 1,8 5,7"/><polyline points="15,13 15,8 11,9"/>
    </svg>
  );
  if (action === 'retry_request') return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
      <polyline points="1,1 1,6 6,6"/><path d="M1 6 C3 3, 6 1, 8 1 a7 7 0 1 1-5 12"/>
    </svg>
  );
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round">
      <circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><line x1="8" y1="8" x2="10" y2="10"/>
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
        padding: `${sp[2]}px ${sp[4]}px`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textTertiary }}>Healing</span>
        <span style={{
          ...type.caption, fontFamily: font, fontWeight: 400,
          color: actions.length > 0 ? theme.success : theme.textTertiary,
          background: actions.length > 0 ? theme.successBg : 'transparent',
          padding: '2px 8px', borderRadius: radius.pill,
        }}>{actions.length}</span>
      </div>

      {Object.keys(byType).length > 0 && (
        <div style={{ display: 'flex', gap: sp.half, padding: `0 ${sp[4]}px ${sp[1]}px`, flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([t, c]) => (
            <div key={t} style={{
              display: 'flex', gap: 4, alignItems: 'center',
              ...type.caption, fontSize: 9, fontFamily: font, color: theme.textSecondary,
              padding: '2px 8px', borderRadius: radius.pill, background: theme.hoverBg,
            }}>
              <Icon action={t} color={theme.navy} />
              <span>{t.replace(/_/g, ' ')}</span>
              <span style={{ fontWeight: 500 }}>×{c}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, padding: `${sp[1]}px ${sp[3]}px ${sp[3]}px`, maxHeight: 360, overflowY: 'auto' }}>
        {actions.length === 0 ? (
          <EmptyState headline="No healing actions yet" />
        ) : (
          <AnimatePresence initial={false}>
            {actions.map((a, i) => (
              <motion.div key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
                className="nr-row"
                style={{
                  display: 'flex', gap: sp[2], alignItems: 'flex-start',
                  padding: `${sp[2]}px 0`,
                  borderBottom: `1px solid ${theme.border}`,
                  transition: `box-shadow ${dur.base}ms ${ease.out}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.hoverShadow)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: radius.sm,
                  background: theme.hoverBg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                }}>
                  <Icon action={a.healing_action} color={theme.navy} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...type.bodySm, fontWeight: 500, fontFamily: font, color: theme.textPrimary, textTransform: 'capitalize' }}>
                      {a.healing_action.replace(/_/g, ' ')}
                    </span>
                    <span style={{
                      ...type.caption, fontSize: 9, fontWeight: 400, fontFamily: font,
                      color: a.status === 'success' ? theme.success : theme.warning,
                      background: a.status === 'success' ? theme.successBg : theme.warningBg,
                      padding: '1px 6px', borderRadius: radius.pill,
                    }}>{a.status}</span>
                  </div>
                  {/* Progressive disclosure — message revealed on hover */}
                  <div className="nr-reveal" style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, lineHeight: 1.5, marginTop: 2 }}>
                    {a.message}
                  </div>
                  <div className="nr-subtle" style={{ ...type.caption, fontSize: 9, fontFamily: font, color: theme.textTertiary, marginTop: 2 }}>
                    {timeAgo(a.timestamp)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
