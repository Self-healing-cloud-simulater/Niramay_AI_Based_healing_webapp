/**
 * LandingPage — Marketing page for Niramay.
 * Assembles Hero, HowItWorks, IntegrationShowcase, and CopilotTeaser.
 */

import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/landing/HeroSection';
import HowItWorks from '../components/landing/HowItWorks';
import IntegrationShowcase from '../components/landing/IntegrationShowcase';
import CopilotTeaser from '../components/landing/CopilotTeaser';
import { useTheme } from '../designSystem';

export default function LandingPage() {
  const { isDark } = useTheme();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <IntegrationShowcase />
      <CopilotTeaser />

      {/* Footer */}
      <footer style={{
        padding: 'var(--space-12) var(--space-10)',
        borderTop: '1px solid var(--color-border-subtle)',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 6V14H2V6L8 2Z" stroke={isDark ? '#0A0E17' : '#fff'} strokeWidth="1.5" fill="none" />
                <circle cx="8" cy="9" r="2" fill={isDark ? '#0A0E17' : '#fff'} />
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-md)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
            }}>
              Niramay
            </span>
          </div>

          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            maxWidth: 400,
            lineHeight: 'var(--leading-normal)',
          }}>
            Autonomous healing layer for cloud infrastructure.
            Observe. Detect. Heal. Automatically.
          </p>

          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            marginTop: 'var(--space-4)',
          }}>
            Built with FastAPI · React · Redis · AI/ML
          </div>
        </div>
      </footer>
    </div>
  );
}
