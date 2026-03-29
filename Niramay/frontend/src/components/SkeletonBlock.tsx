/**
 * SkeletonBlock — Shimmer loading placeholder
 * Matches the exact layout of loaded content.
 * Uses a slow 1.5s shimmer gradient, never a spinner.
 */

import { useTheme } from '../designSystem';

interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export default function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${theme.bgTertiary} 25%, ${theme.borderSubtle} 50%, ${theme.bgTertiary} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}
