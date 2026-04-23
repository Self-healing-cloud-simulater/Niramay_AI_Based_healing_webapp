/**
 * IntegrationShowcase — Tech stack compatibility grid with hover glow.
 */

import { motion } from 'framer-motion';
import { useTheme } from '../../designSystem';

const integrations = [
  { name: 'REST APIs', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><rect x="4" y="4" width="20" height="20" rx="3"/><path d="M4 10h20M10 10v14"/></svg> },
  { name: 'AWS', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><path d="M4 18c4-2 8 2 12 0s8-2 8-2"/><path d="M6 14l8-8 8 8"/><path d="M14 6v14"/></svg> },
  { name: 'Docker', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><rect x="3" y="12" width="22" height="12" rx="2"/><rect x="7" y="8" width="4" height="4"/><rect x="12" y="8" width="4" height="4"/><rect x="12" y="3" width="4" height="5"/></svg> },
  { name: 'Kubernetes', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><circle cx="14" cy="14" r="10"/><path d="M14 4v20M4 14h20"/><path d="M7 7l14 14M21 7L7 21"/></svg> },
  { name: 'PostgreSQL', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><ellipse cx="14" cy="8" rx="9" ry="4"/><path d="M5 8v12c0 2.2 4 4 9 4s9-1.8 9-4V8"/><path d="M5 14c0 2.2 4 4 9 4s9-1.8 9-4"/></svg> },
  { name: 'Redis', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><path d="M14 4L24 9v10L14 24 4 19V9L14 4z"/><path d="M4 9l10 5 10-5"/><path d="M14 14v10"/></svg> },
  { name: 'FastAPI', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><path d="M5 4h18v20H5z" strokeLinejoin="round"/><path d="M9 12h10M9 16h6"/><circle cx="20" cy="8" r="2" fill={c}/></svg> },
  { name: 'GraphQL', icon: (c: string) => <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={c} strokeWidth="1.3"><polygon points="14,3 24,9 24,19 14,25 4,19 4,9"/><circle cx="14" cy="3" r="1.5" fill={c}/><circle cx="24" cy="9" r="1.5" fill={c}/><circle cx="24" cy="19" r="1.5" fill={c}/><circle cx="14" cy="25" r="1.5" fill={c}/><circle cx="4" cy="19" r="1.5" fill={c}/><circle cx="4" cy="9" r="1.5" fill={c}/></svg> },
];

export default function IntegrationShowcase() {
  const { isDark } = useTheme();
  const accentColor = isDark ? '#00FF88' : '#10B981';

  return (
    <section
      id="integrations"
      style={{
        padding: 'var(--space-32) var(--space-10)',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center', marginBottom: 'var(--space-16)' }}
      >
        <span className="badge" style={{
          background: 'var(--color-accent-tertiary)',
          color: 'var(--color-accent-primary)',
          padding: '4px 14px',
          marginBottom: 'var(--space-4)',
          display: 'inline-flex',
        }}>
          Universal
        </span>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          letterSpacing: 'var(--tracking-tight)',
          marginTop: 'var(--space-4)',
          marginBottom: 'var(--space-3)',
        }}>
          Works with your stack
        </h2>
        <p style={{
          fontSize: 'var(--text-md)',
          color: 'var(--color-text-secondary)',
          maxWidth: 500,
          margin: '0 auto',
          lineHeight: 'var(--leading-loose)',
        }}>
          Drop Niramay into any architecture. Zero config changes. Instant observability.
        </p>
      </motion.div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-4)',
      }}>
        {integrations.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            whileHover={{ scale: 1.04, y: -4 }}
            className="glow-card"
            style={{
              padding: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-3)',
              cursor: 'default',
            }}
          >
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-border-subtle)',
            }}>
              {item.icon(accentColor)}
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}>
              {item.name}
            </span>
          </motion.div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          #integrations > div:last-of-type {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          #integrations > div:last-of-type {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: var(--space-3) !important;
          }
        }
      `}</style>
    </section>
  );
}
