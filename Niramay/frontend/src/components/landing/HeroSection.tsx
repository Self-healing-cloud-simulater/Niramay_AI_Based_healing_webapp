/**
 * HeroSection — Full-viewport hero with particle field, headline, and CTA.
 */

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticleField from './ParticleField';
import { useTheme } from '../../designSystem';

export default function HeroSection() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--hero-gradient)',
      }}
    >
      <ParticleField />

      {/* Radial glow behind text */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(0, 255, 136, 0.06) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          maxWidth: 800,
          padding: '0 var(--space-6)',
        }}
      >
        {/* Status chip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <span
            className="badge"
            style={{
              background: 'var(--color-accent-tertiary)',
              color: 'var(--color-accent-primary)',
              padding: '6px 18px',
              fontSize: 'var(--text-xs)',
              letterSpacing: 'var(--tracking-widest)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <span className="dot dot-success dot-live" style={{ marginRight: 6 }} />
            AUTONOMOUS HEALING ACTIVE
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-5xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tighter)',
            lineHeight: 'var(--leading-tight)',
            marginBottom: 'var(--space-6)',
          }}
        >
          Universal Autonomous{' '}
          <span className="neon-text">Healing</span>
          {' '}for Cloud Infrastructure
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-loose)',
            maxWidth: 580,
            margin: '0 auto var(--space-10)',
          }}
        >
          Niramay integrates into any stack. It watches every request, detects anomalies with AI, and heals your systems —{' '}
          <strong style={{ color: 'var(--color-text-primary)' }}>before your users notice.</strong>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          style={{
            display: 'flex',
            gap: 'var(--space-4)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            className="btn-primary ripple-host"
            onClick={() => navigate('/visualizer')}
            style={{
              padding: '14px 36px',
              fontSize: 'var(--text-base)',
            }}
          >
            See it in Action
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 4 }}>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              padding: '14px 36px',
              fontSize: 'var(--text-base)',
            }}
          >
            Learn How
          </button>
        </motion.div>

        {/* Metrics preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          style={{
            display: 'flex',
            gap: 'var(--space-8)',
            justifyContent: 'center',
            marginTop: 'var(--space-16)',
          }}
        >
          {[
            { label: 'Uptime', value: '99.97%' },
            { label: 'Avg Heal Time', value: '<2s' },
            { label: 'Anomalies Caught', value: '100%' },
          ].map((m) => (
            <div key={m.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-accent-primary)',
                marginBottom: 'var(--space-1)',
              }}>
                {m.value}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase',
              }}>
                {m.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
