/**
 * ThemeToggle — 48×26 glass pill with spring-physics orb.
 * Light: off-white bg, navy orb. Dark: deep navy bg, glowing blue orb.
 */
import { useTheme, glass, ease, dur, radius } from '../designSystem';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 48,
        height: 26,
        borderRadius: radius.pill,
        padding: 3,
        position: 'relative',
        cursor: 'pointer',
        ...glass(isDark),
        display: 'flex',
        alignItems: 'center',
        transition: `background ${dur.slow}ms ${ease.standard}`,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: isDark ? '#4A80C4' : '#0A1628',
          boxShadow: isDark ? '0 0 12px rgba(74,128,196,0.5), 0 0 4px rgba(74,128,196,0.3)' : 'none',
          transform: `translateX(${isDark ? 22 : 0}px)`,
          transition: `transform ${dur.slow}ms ${ease.spring}, background ${dur.slow}ms ${ease.standard}, box-shadow ${dur.slow}ms ${ease.standard}`,
        }}
      />
    </button>
  );
}
