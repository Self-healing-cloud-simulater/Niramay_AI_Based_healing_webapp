/**
 * ThemeToggle — Skeuomorphic sun/moon toggle.
 * Physical-feel knob with shadow. Sun ↔ moon icons morph with rotate + scale.
 * Copper accent when active. Persists via localStorage 'niramay-theme'.
 */
import { useTheme } from '../designSystem';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDark}
      style={{
        width: 52,
        height: 28,
        borderRadius: 'var(--radius-full)',
        padding: 3,
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        background: isDark
          ? 'linear-gradient(135deg, #2A2520, #1E1B17)'
          : 'linear-gradient(135deg, #EDEAE4, #E0DCD4)',
        border: isDark
          ? '1px solid rgba(255, 248, 235, 0.10)'
          : '1px solid rgba(28, 24, 18, 0.08)',
        boxShadow: isDark
          ? 'inset 0 2px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04)'
          : 'inset 2px 2px 4px rgba(174, 168, 157, 0.35), inset -2px -2px 4px rgba(255,255,255,0.7)',
        transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Sun icon */}
      <svg
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        style={{
          position: 'absolute', left: 6, top: 7,
          opacity: isDark ? 0.25 : 0.85,
          transform: isDark ? 'rotate(-90deg) scale(0.7)' : 'rotate(0deg) scale(1)',
          transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <circle cx="8" cy="8" r="2.5" stroke="var(--color-text-primary)" strokeWidth="1.3" />
        <g stroke="var(--color-text-primary)" strokeWidth="1" strokeLinecap="round">
          <line x1="8" y1="1.5" x2="8" y2="3" />
          <line x1="8" y1="13" x2="8" y2="14.5" />
          <line x1="1.5" y1="8" x2="3" y2="8" />
          <line x1="13" y1="8" x2="14.5" y2="8" />
          <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
          <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
          <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
          <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
        </g>
      </svg>

      {/* Moon icon */}
      <svg
        width="14" height="14" viewBox="0 0 16 16" fill="none"
        style={{
          position: 'absolute', right: 6, top: 7,
          opacity: isDark ? 0.85 : 0.25,
          transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.7)',
          transition: 'opacity 400ms ease, transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          d="M12.5 9.5A5 5 0 0 1 6.5 3.5 5 5 0 1 0 12.5 9.5Z"
          stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinejoin="round"
        />
      </svg>

      {/* Thumb — skeuomorphic knob */}
      <span
        style={{
          display: 'block',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: isDark
            ? 'linear-gradient(145deg, var(--color-accent-primary), #A85530)'
            : 'linear-gradient(145deg, #FAF8F5, #E8E4DD)',
          boxShadow: isDark
            ? '0 2px 8px rgba(212, 132, 94, 0.40), 0 0 12px rgba(212, 132, 94, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '2px 2px 6px rgba(174, 168, 157, 0.45), -1px -1px 3px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.6)',
          transform: `translateX(${isDark ? 24 : 0}px) rotate(${isDark ? 360 : 0}deg)`,
          transition: 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), background 400ms ease, box-shadow 400ms ease',
          position: 'relative',
          zIndex: 2,
        }}
      />
    </button>
  );
}
