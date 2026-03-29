/**
 * StatCard — Editorial stat display.
 * Large, light-weight number (48px/300) with whispered label.
 * "Never wrap numbers in boxes" — no visible card container.
 */
import { useTheme, type, font, fontMono, sp } from '../designSystem';

export default function StatCard({ label, value, accentColor }: {
  label: string; value: string | number; accentColor?: string;
}) {
  const { theme } = useTheme();
  return (
    <div style={{ flex: '1 1 0', textAlign: 'center', padding: `0 ${sp[1]}px` }}>
      <div style={{
        ...type.hero,
        fontFamily: font,
        fontVariantNumeric: 'tabular-nums',
        color: accentColor || theme.textPrimary,
        marginBottom: sp.half,
      }}>
        {value}
      </div>
      <div style={{
        ...type.label,
        fontFamily: font,
        color: theme.textTertiary,
      }}>
        {label}
      </div>
    </div>
  );
}
