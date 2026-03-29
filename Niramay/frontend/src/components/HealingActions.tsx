/**
 * HealingActions — Panel 3
 * History of automated healing actions with type summary chips.
 * Icon + description + status badge layout, staggered entrance.
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  useTheme, timeAgo,
  typeScale, fontFamily, spacing, radius, transitions,
  type HealingAction,
} from '../designSystem';
import EmptyState from './EmptyState';

interface Props {
  actions: HealingAction[];
}

/* Action → SVG icon mapping (clean geometric icons, no emoji) */
function ActionIcon({ action, theme }: { action: string; theme: ReturnType<typeof useTheme>['theme'] }) {
  const color = theme.accentNavyMid;
  const size = 16;

  if (action === 'restart_service') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M1 8a7 7 0 0 1 13.2-3.2" /><path d="M15 8a7 7 0 0 1-13.2 3.2" />
        <polyline points="1,3 1,8 5,7" /><polyline points="15,13 15,8 11,9" />
      </svg>
    );
  }
  if (action === 'retry_request') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <polyline points="1,1 1,6 6,6" /><path d="M1 6 C3 3, 6 1, 8 1 a7 7 0 1 1-5 12" />
      </svg>
    );
  }
  if (action === 'throttle_requests') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="4" width="12" height="8" rx="2" /><line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" /><line x1="5" y1="8" x2="11" y2="8" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" /><line x1="8" y1="5" x2="8" y2="8" /><line x1="8" y1="8" x2="10.5" y2="10.5" />
    </svg>
  );
}

export default function HealingActionsPanel({ actions }: Props) {
  const { theme, shadow } = useTheme();

  /* Action type summary */
  const byType = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.healing_action] = (acc[a.healing_action] || 0) + 1;
    return acc;
  }, {});

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
          Healing Actions
        </span>
        <span
          style={{
            ...typeScale.caption,
            fontFamily: fontFamily.ui,
            color: actions.length > 0 ? theme.success : theme.textTertiary,
            padding: `2px ${spacing.xs}px`,
            background: actions.length > 0 ? theme.successLight : theme.bgTertiary,
            borderRadius: radius.pill,
            fontWeight: 500,
          }}
        >
          {actions.length} actions
        </span>
      </div>

      {/* Type summary chips */}
      {Object.keys(byType).length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: spacing.xs,
            padding: `${spacing.sm}px ${spacing.lg}px ${spacing.xxs}px`,
            flexWrap: 'wrap',
          }}
        >
          {Object.entries(byType).map(([type, count]) => (
            <div
              key={type}
              style={{
                display: 'flex',
                gap: spacing.xxs,
                alignItems: 'center',
                ...typeScale.caption,
                fontFamily: fontFamily.ui,
                color: theme.textSecondary,
                background: theme.accentNavyLight,
                padding: `${spacing.xxs}px ${spacing.xs}px`,
                borderRadius: radius.pill,
              }}
            >
              <ActionIcon action={type} theme={theme} />
              <span>{type.replace(/_/g, ' ')}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>×{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action list */}
      <div
        className="nr-panel-scroll"
        style={{ flex: 1, padding: `${spacing.sm}px ${spacing.md}px`, maxHeight: 420 }}
      >
        {actions.length === 0 ? (
          <EmptyState headline="No healing actions yet" description="Actions will appear when anomalies are detected and resolved." />
        ) : (
          <AnimatePresence initial={false}>
            {actions.map((a, i) => (
              <motion.div
                key={`${a.timestamp}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="nr-row-hover"
                style={{
                  display: 'flex',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                  padding: `${spacing.sm}px ${spacing.xs}px`,
                  borderBottom: `1px solid ${theme.borderSubtle}22`,
                  borderRadius: radius.sharp,
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: radius.soft,
                    background: theme.accentNavyLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ActionIcon action={a.healing_action} theme={theme} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: spacing.xxs,
                    }}
                  >
                    <span
                      style={{
                        ...typeScale.body,
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: fontFamily.ui,
                        color: theme.textPrimary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {a.healing_action.replace(/_/g, ' ')}
                    </span>
                    <span
                      style={{
                        ...typeScale.caption,
                        fontSize: 10,
                        fontWeight: 500,
                        fontFamily: fontFamily.ui,
                        color: a.status === 'success' ? theme.success : theme.warning,
                        background: a.status === 'success' ? theme.successLight : theme.warningLight,
                        padding: `1px ${spacing.xs - 2}px`,
                        borderRadius: radius.pill,
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                  <div
                    style={{
                      ...typeScale.caption,
                      fontFamily: fontFamily.ui,
                      color: theme.textTertiary,
                      lineHeight: 1.5,
                    }}
                  >
                    {a.message}
                  </div>
                  <div
                    style={{
                      ...typeScale.caption,
                      fontSize: 10,
                      fontFamily: fontFamily.ui,
                      color: theme.textDisabled,
                      marginTop: spacing.xxs,
                    }}
                  >
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
