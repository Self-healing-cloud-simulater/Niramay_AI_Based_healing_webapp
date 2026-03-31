/**
 * CopilotTeaser — AI Copilot preview section with animated chat mock.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../designSystem';

const chatSequence = [
  { role: 'user' as const, text: 'What\'s the health of the orders service?' },
  { role: 'ai' as const, text: 'Analyzing /api/v1/orders... 3 anomalies detected in the last 5 minutes. Latency is 340ms (↑62% above baseline). Root cause: payment gateway degradation. Auto-healing in progress.' },
  { role: 'user' as const, text: 'Should I scale the service?' },
  { role: 'ai' as const, text: 'Not recommended yet. Current healing action (circuit breaker) is resolving 89% of failures. I\'ll alert you if manual scaling becomes necessary.' },
];

export default function CopilotTeaser() {
  const { isDark } = useTheme();
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages >= chatSequence.length) return;

    const msg = chatSequence[visibleMessages];
    if (msg.role === 'ai') {
      setIsTyping(true);
      let idx = 0;
      const timer = setInterval(() => {
        idx++;
        setDisplayText(msg.text.slice(0, idx));
        if (idx >= msg.text.length) {
          clearInterval(timer);
          setIsTyping(false);
          setTimeout(() => setVisibleMessages(v => v + 1), 1500);
        }
      }, 20);
      return () => clearInterval(timer);
    } else {
      setDisplayText('');
      const timer = setTimeout(() => {
        setVisibleMessages(v => v + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  // Restart cycle
  useEffect(() => {
    if (visibleMessages >= chatSequence.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(0);
        setDisplayText('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visibleMessages]);

  return (
    <section
      id="copilot-teaser"
      style={{
        padding: 'var(--space-32) var(--space-10)',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-16)',
        alignItems: 'center',
      }}>
        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="badge" style={{
            background: 'var(--color-accent-tertiary)',
            color: 'var(--color-accent-primary)',
            padding: '4px 14px',
            marginBottom: 'var(--space-6)',
            display: 'inline-flex',
          }}>
            AI Copilot
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-3xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: 'var(--tracking-tight)',
            marginTop: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
            lineHeight: 'var(--leading-snug)',
          }}>
            Converse with your infrastructure
          </h2>
          <p style={{
            fontSize: 'var(--text-md)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--leading-loose)',
            marginBottom: 'var(--space-8)',
          }}>
            Ask questions in plain English. Get real-time insights, threat analysis, and healing recommendations powered by our LLM/RAG engine.
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[
              { label: 'MEDIUM: Anomaly cluster', color: 'warning' },
              { label: 'LOW: Latency trending', color: 'info' },
              { label: 'HIGH: Service overload', color: 'error' },
            ].map((chip) => (
              <span
                key={chip.label}
                className={`badge badge-${chip.color}`}
                style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Chat mockup */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="gradient-border"
          style={{
            padding: 'var(--space-6)',
            minHeight: 360,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Chat header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
            paddingBottom: 'var(--space-3)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}>
            <span className="dot dot-success dot-live" />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
            }}>
              Niramay Copilot
            </span>
            <span style={{ flex: 1 }} />
            <span className="badge badge-neutral" style={{ fontSize: 10 }}>Preview</span>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            overflowY: 'auto',
          }}>
            {chatSequence.slice(0, visibleMessages).map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: msg.role === 'user'
                    ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
                    : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
                  background: msg.role === 'user'
                    ? 'var(--color-accent-tertiary)'
                    : 'var(--color-bg-sunken)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 'var(--leading-normal)',
                  color: msg.role === 'user' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                }}>
                  {/* For the current AI message being typed */}
                  {i === visibleMessages - 1 && msg.role === 'ai' && isTyping
                    ? displayText
                    : msg.text
                  }
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {visibleMessages < chatSequence.length && chatSequence[visibleMessages]?.role === 'ai' && isTyping && visibleMessages > 0 && (
              <div style={{
                display: 'flex',
                gap: 4,
                padding: 'var(--space-2) var(--space-3)',
              }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-text-tertiary)',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input mockup */}
          <div style={{
            marginTop: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-sunken)',
            border: '1px solid var(--color-border-subtle)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>Ask about system health...</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 14l12-6L2 2v4.5L10 8 2 9.5V14z" />
            </svg>
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #copilot-teaser > div {
            grid-template-columns: 1fr !important;
            gap: var(--space-8) !important;
          }
        }
      `}</style>
    </section>
  );
}
