/**
 * EmptyState — Designed no-data placeholder
 * Centered, generous padding, calm messaging.
 * Never just "No data found" — always intentional.
 */

import { useTheme, typeScale, fontFamily, spacing } from '../designSystem';

interface EmptyStateProps {
  headline: string;
  description?: string;
}

export default function EmptyState({ headline, description }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${spacing['5xl']}px ${spacing.lg}px`,
        textAlign: 'center',
      }}
    >
      {/* Minimal geometric icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: theme.bgTertiary,
          border: `1px solid ${theme.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke={theme.textDisabled}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="8" />
          <line x1="10" y1="6" x2="10" y2="10" />
          <line x1="10" y1="13" x2="10" y2="13.5" />
        </svg>
      </div>

      <div
        style={{
          ...typeScale.h3,
          fontFamily: fontFamily.ui,
          color: theme.textSecondary,
          marginBottom: spacing.xs,
        }}
      >
        {headline}
      </div>

      {description && (
        <div
          style={{
            ...typeScale.body,
            color: theme.textTertiary,
            maxWidth: 320,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
