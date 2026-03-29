import { useTheme, type, font, sp } from '../designSystem';

export default function EmptyState({ headline, description }: { headline: string; description?: string }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `${sp[5]}px ${sp[3]}px`, textAlign: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none"
        stroke={theme.textTertiary} strokeWidth="1" strokeLinecap="round" style={{ opacity: 0.5, marginBottom: sp[2] }}>
        <circle cx="20" cy="20" r="16" /><path d="M20 12v8" /><circle cx="20" cy="26" r="0.5" fill={theme.textTertiary} />
      </svg>
      <div style={{ ...type.bodySm, fontFamily: font, color: theme.textSecondary, fontWeight: 500 }}>{headline}</div>
      {description && <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, maxWidth: 280, marginTop: sp.half }}>{description}</div>}
    </div>
  );
}
