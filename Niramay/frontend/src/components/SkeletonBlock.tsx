import { useTheme } from '../designSystem';
export default function SkeletonBlock({ width = '100%', height = 14, borderRadius = 6, style }: {
  width?: string | number; height?: number; borderRadius?: number; style?: React.CSSProperties;
}) {
  const { theme } = useTheme();
  return <div style={{
    width, height, borderRadius,
    background: `linear-gradient(90deg, ${theme.surface} 25%, ${theme.surfaceElevated} 50%, ${theme.surface} 75%)`,
    backgroundSize: '200% 100%', animation: 'shimmer 2s infinite', ...style,
  }} />;
}
