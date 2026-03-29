import { useTheme, glass, ease, dur, radius } from '../designSystem';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="nr-btn"
      aria-label={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        width: 48, height: 26, borderRadius: radius.pill, padding: 3,
        ...glass(isDark), cursor: 'pointer',
        display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>
      <span style={{
        display: 'block', width: 20, height: 20, borderRadius: '50%',
        background: isDark ? '#5B8DC9' : '#0F172A',
        boxShadow: isDark ? '0 0 14px rgba(93,141,201,0.5)' : 'none',
        transform: `translateX(${isDark ? 22 : 0}px)`,
        transition: `transform ${dur.slow}ms ${ease.spring}, background ${dur.slow}ms ${ease.standard}, box-shadow ${dur.slow}ms ${ease.standard}`,
      }} />
    </button>
  );
}
