/**
 * StatCard — Silent luxury stat display.
 * Ultra-light 56px numbers (weight 200) vs whispered labels.
 * No borders, no boxes, no shadows. Just negative space.
 */
import { useTheme, type, font, sp } from '../designSystem';

export default function StatCard({ label, value, accentColor }: {
  label: string; value: string | number; accentColor?: string;
}) {
  const { theme } = useTheme();
  return (
    <div style={{ flex: '1 1 0', textAlign: 'center', padding: `0 ${sp[2]}px` }}>
      <div style={{
        ...type.display,
        fontFamily: font,
        fontVariantNumeric: 'tabular-nums',
        color: accentColor || theme.textPrimary,
      }}>
        {value}
      </div>
      <div style={{
        ...type.label,
        fontFamily: font,
        color: theme.textTertiary,
        marginTop: sp[1],
      }}>
        {label}
      </div>
    </div>
  );
}
