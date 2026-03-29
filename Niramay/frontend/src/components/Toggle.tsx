/**
 * Toggle — Premium on/off switch
 * Navy accent when on, muted border when off.
 * Spring transition for the knob, visible focus ring.
 */

import { useTheme, radius, transitions, spacing } from '../designSystem';

interface ToggleProps {
  on: boolean;
  onToggle: () => void;
  label?: string;
}

export default function Toggle({ on, onToggle, label }: ToggleProps) {
  const { theme, shadow } = useTheme();

  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label || 'Toggle'}
      onClick={onToggle}
      style={{
        position: 'relative',
        width: 36,
        height: 20,
        borderRadius: radius.pill,
        border: 'none',
        background: on ? theme.accentNavyMid : theme.borderDefault,
        cursor: 'pointer',
        transition: `background ${transitions.default}`,
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: spacing.xxs / 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: shadow.xs,
          transition: `left ${transitions.spring}`,
        }}
      />
    </button>
  );
}
