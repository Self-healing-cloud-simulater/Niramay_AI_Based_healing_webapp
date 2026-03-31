/**
 * EmptyState — 3D CSS illustration with floating geometric shapes.
 * Theme-adaptive colors. Breathing animation. Optional CTA.
 */
import { useTheme } from '../designSystem';

export default function EmptyState({ headline, cta, onAction }: {
  headline: string;
  cta?: string;
  onAction?: () => void;
}) {
  const { isDark } = useTheme();

  const accent = isDark ? 'var(--color-accent-primary)' : 'var(--color-accent-primary)';
  const muted = isDark ? 'rgba(240, 235, 227, 0.06)' : 'rgba(28, 24, 18, 0.04)';
  const border = isDark ? 'rgba(240, 235, 227, 0.08)' : 'rgba(28, 24, 18, 0.06)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-16) var(--space-8)',
      textAlign: 'center',
      gap: 'var(--space-6)',
    }}>
      {/* 3D Illustration — floating shapes */}
      <div style={{
        position: 'relative',
        width: 120,
        height: 100,
        perspective: '600px',
      }}>
        {/* Main cube face */}
        <div style={{
          position: 'absolute',
          width: 48,
          height: 48,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%) rotateX(15deg) rotateY(-20deg)',
          transformStyle: 'preserve-3d',
          background: muted,
          border: `1px solid ${border}`,
          borderRadius: 'var(--radius-md)',
          animation: 'float 6s ease-in-out infinite',
        }} />

        {/* Secondary shape — smaller, offset */}
        <div style={{
          position: 'absolute',
          width: 28,
          height: 28,
          right: 8,
          top: 8,
          transform: 'rotateX(10deg) rotateY(25deg)',
          background: `${accent}15`,
          border: `1px solid ${accent}25`,
          borderRadius: 'var(--radius-sm)',
          animation: 'floatReverse 5s ease-in-out infinite',
          animationDelay: '-1s',
        }} />

        {/* Circle accent */}
        <div style={{
          position: 'absolute',
          width: 16,
          height: 16,
          left: 12,
          bottom: 12,
          borderRadius: 'var(--radius-full)',
          background: `${accent}20`,
          border: `1px solid ${accent}30`,
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '-2s',
        }} />
      </div>

      <span style={{
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text-tertiary)',
        fontWeight: 'var(--font-weight-regular)' as any,
        letterSpacing: 'var(--tracking-normal)',
      }}>
        {headline}
      </span>

      {cta && onAction && (
        <button className="btn-ghost" onClick={onAction} style={{
          padding: '6px 18px',
          fontSize: 'var(--text-xs)',
        }}>
          {cta}
        </button>
      )}
    </div>
  );
}
