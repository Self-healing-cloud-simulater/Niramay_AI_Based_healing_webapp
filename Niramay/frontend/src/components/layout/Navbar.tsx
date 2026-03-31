/**
 * Navbar — Shared glassmorphic navigation bar.
 * Used on both Landing and Visualizer pages.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../designSystem';

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const isVisualizer = location.pathname === '/visualizer';

  return (
    <motion.nav
      id="main-nav"
      role="navigation"
      aria-label="Main navigation"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={scrolled ? 'glass-strong' : ''}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-10)',
        borderBottom: scrolled ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
        transition: 'background 300ms, border-color 300ms, box-shadow 300ms',
        ...(scrolled ? {} : { background: 'transparent' }),
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {/* Logo mark */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--radius-md)',
          background: `linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDark ? '0 0 12px var(--glow-primary)' : 'var(--shadow-sm)',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L14 6V14H2V6L8 2Z" stroke={isDark ? '#0A0E17' : '#fff'} strokeWidth="1.5" fill="none" />
            <circle cx="8" cy="9" r="2" fill={isDark ? '#0A0E17' : '#fff'} />
          </svg>
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
        }}>
          Niramay
        </span>
      </button>

      {/* Right controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        {/* Nav links */}
        <button
          onClick={() => navigate('/')}
          className="btn-ghost"
          style={{
            padding: '6px 16px',
            fontSize: 'var(--text-xs)',
            opacity: isVisualizer ? 0.6 : 1,
            border: isVisualizer ? '1px solid transparent' : undefined,
          }}
        >
          Home
        </button>
        <button
          onClick={() => navigate('/visualizer')}
          className={isVisualizer ? 'btn-primary' : 'btn-ghost'}
          style={{
            padding: '6px 16px',
            fontSize: 'var(--text-xs)',
          }}
        >
          Live Dashboard
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ marginLeft: 'var(--space-1)' }}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <circle cx="8" cy="8" r="3.5" />
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M13.5 8.5a5.5 5.5 0 0 1-6-6A5.5 5.5 0 1 0 13.5 8.5Z" />
            </svg>
          )}
        </button>
      </div>
    </motion.nav>
  );
}
