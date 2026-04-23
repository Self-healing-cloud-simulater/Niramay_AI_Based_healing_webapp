/**
 * StatCard — Neumorphic stat tile with animated counter.
 * Light mode: neumorphic raised surface. Dark mode: glow-bordered card.
 * Counter animates from 0 on first render using ease-out cubic.
 */
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../designSystem';

export default function StatCard({ label, value, hasAccent }: {
  label: string;
  value: string | number;
  hasAccent?: 'success' | 'warning' | 'error';
}) {
  const { isDark } = useTheme();
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const isNumeric = !isNaN(numericValue) && typeof value === 'number';
  const [displayValue, setDisplayValue] = useState(isNumeric ? 0 : value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isNumeric || hasAnimated.current) {
      setDisplayValue(value);
      return;
    }
    hasAnimated.current = true;
    const duration = 1200;
    const start = performance.now();
    const target = numericValue;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, isNumeric, numericValue]);

  const accentMap: Record<string, string> = {
    success: 'var(--color-status-success)',
    warning: 'var(--color-status-warning)',
    error: 'var(--color-status-error)',
  };

  const valueColor = hasAccent ? accentMap[hasAccent] : 'var(--color-text-primary)';

  return (
    <div
      id={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
      data-aos="zoom-in"
      data-aos-delay="100"
      className={isDark ? '' : 'neuro'}
      style={{
        flex: '1 1 0',
        textAlign: 'center',
        padding: 'var(--space-6) var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        minWidth: 120,
        ...(isDark ? {
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--color-border-subtle)',
        } : {}),
      }}
    >
      <div style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-weight-medium)' as any,
        letterSpacing: 'var(--tracking-widest)',
        textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-2xl)',
        fontWeight: 'var(--font-weight-regular)' as any,
        fontVariantNumeric: 'tabular-nums',
        color: valueColor,
        lineHeight: 'var(--leading-tight)',
        letterSpacing: 'var(--tracking-tight)',
      }}>
        {displayValue}
      </div>
    </div>
  );
}
