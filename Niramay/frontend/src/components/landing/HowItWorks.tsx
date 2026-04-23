/**
 * HowItWorks — 3-step Observe → Detect → Heal flow with animated connectors.
 */

import { motion } from 'framer-motion';
import { useTheme } from '../../designSystem';

const steps = [
  {
    num: '01',
    title: 'Observe',
    desc: 'Seamlessly integrate with any API. Stream every request, response, and error as structured logs — like a CCTV for your infrastructure.',
    icon: (color: string) => (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <circle cx="16" cy="16" r="10" />
        <circle cx="16" cy="16" r="4" />
        <path d="M16 2v4M16 26v4M2 16h4M26 16h4" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Detect',
    desc: 'AI-driven anomaly scoring engine analyzes latency, status codes, and failure patterns. Catches overloads before they cascade.',
    icon: (color: string) => (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M16 4L28 12V24L16 28L4 24V12L16 4Z" />
        <path d="M16 12v6l4 2" />
        <circle cx="16" cy="18" r="2" fill={color} />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Heal',
    desc: 'Automated, real-time resolution — restart services, throttle traffic, retry requests. Your system recovers before users notice.',
    icon: (color: string) => (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
        <path d="M16 6C10 6 6 10 6 16s4 10 10 10" />
        <path d="M16 6c6 0 10 4 10 10" />
        <polyline points="22,10 26,16 20,16" />
        <path d="M14 14l2 2 4-4" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  const { isDark } = useTheme();
  const accentColor = isDark ? '#00FF88' : '#10B981';

  return (
    <section
      id="how-it-works"
      style={{
        padding: 'var(--space-32) var(--space-10)',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 'var(--space-20)' }}
      >
        <span
          className="badge"
          style={{
            background: 'var(--color-accent-tertiary)',
            color: 'var(--color-accent-primary)',
            padding: '4px 14px',
            marginBottom: 'var(--space-4)',
            display: 'inline-flex',
          }}
        >
          How it Works
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginTop: 'var(--space-4)',
        }}>
          Three steps to autonomous healing
        </h2>
      </motion.div>

      {/* Steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-2)',
        alignItems: 'start',
        position: 'relative',
      }}>
        {/* Connector line behind cards */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 60,
            left: '16.7%',
            right: '16.7%',
            height: 2,
            zIndex: 0,
          }}
        >
          <svg width="100%" height="2" style={{ overflow: 'visible' }}>
            <line
              x1="0" y1="1" x2="100%" y2="1"
              className="data-stream-line active"
              strokeDasharray="8 6"
            />
          </svg>
        </div>

        {steps.map((step, i) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.2 }}
            className="glow-card"
            style={{
              padding: 'var(--space-8)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* Icon container */}
            <div style={{
              width: 64,
              height: 64,
              margin: '0 auto var(--space-6)',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-accent-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-border-subtle)',
            }}>
              {step.icon(accentColor)}
            </div>

            {/* Step number */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-accent-primary)',
              letterSpacing: 'var(--tracking-widest)',
              marginBottom: 'var(--space-2)',
              opacity: 0.6,
            }}>
              STEP {step.num}
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)',
            }}>
              {step.title}
            </h3>

            {/* Description */}
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--leading-loose)',
            }}>
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Responsive override */}
      <style>{`
        @media (max-width: 768px) {
          #how-it-works > div:last-of-type {
            grid-template-columns: 1fr !important;
            gap: var(--space-4) !important;
          }
          #how-it-works > div:last-of-type > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}
