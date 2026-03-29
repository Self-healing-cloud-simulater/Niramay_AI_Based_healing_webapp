import { useTheme, type, font, sp } from '../designSystem';
export default function EmptyState({ headline, description }: { headline: string; description?: string }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: `${sp[6]}px ${sp[4]}px`, textAlign: 'center' }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none"
        stroke={theme.textTertiary} strokeWidth="0.8" strokeLinecap="round" style={{ opacity: 0.4, marginBottom: sp[3] }}>
        <circle cx="18" cy="18" r="14" /><path d="M18 10v8" /><circle cx="18" cy="24" r="0.5" fill={theme.textTertiary} />
      </svg>
      <div style={{ ...type.bodySm, fontFamily: font, color: theme.textSecondary, fontWeight: 400 }}>{headline}</div>
      {description && <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, maxWidth: 260, marginTop: sp.half }}>{description}</div>}
    </div>
  );
}
