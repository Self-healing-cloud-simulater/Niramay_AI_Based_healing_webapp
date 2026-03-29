/**
 * StatCard — Metric display card
 * White surface with shadow-sm at rest, shadow-md + lift on hover.
 * Label → Value → Subtitle hierarchy.
 */

import { useTheme, typeScale, fontFamily, spacing, radius, transitions } from '../designSystem';
import { useState } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export default function StatCard({ label, value, subtitle, accentColor }: StatCardProps) {
  const { theme, shadow } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.surfaceElevated,
        border: `1px solid ${theme.borderSubtle}`,
        borderRadius: radius.soft,
        padding: spacing.lg,
        flex: '1 1 180px',
        minWidth: 160,
        boxShadow: hovered ? shadow.md : shadow.sm,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: `box-shadow ${transitions.default}, transform ${transitions.default}`,
        cursor: 'default',
      }}
    >
      {/* Label */}
      <div
        style={{
          ...typeScale.label,
          fontFamily: fontFamily.ui,
          color: theme.textTertiary,
          marginBottom: spacing.xs,
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          fontFamily: fontFamily.ui,
          color: accentColor || theme.textPrimary,
          lineHeight: 1,
          letterSpacing: '-0.015em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div
          style={{
            ...typeScale.caption,
            fontFamily: fontFamily.ui,
            color: theme.textTertiary,
            marginTop: spacing.xs,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
