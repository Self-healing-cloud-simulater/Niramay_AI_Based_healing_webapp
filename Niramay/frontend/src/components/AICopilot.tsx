/**
 * AICopilot — Panel 4
 * Feature toggles, AI recommendations, and chat interface.
 * The ONE place where accent gold appears — in the panel header accent line.
 * "PREVIEW" badge in gold to signal premium future capability.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useTheme, AI_RECOMMENDATIONS,
  typeScale, fontFamily, spacing, radius, transitions,
} from '../designSystem';
import Toggle from './Toggle';

export default function AICopilot() {
  const { theme, shadow } = useTheme();
  const [features, setFeatures] = useState({
    predictive: false,
    rootCause: false,
    smartPriority: false,
  });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text: "Hello — I'm your AI Copilot. Once the AI backend is integrated, I'll provide real-time fault analysis, predictive insights, and automated healing recommendations. Try toggling the features below.",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sendHovered, setSendHovered] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: q }]);

    setTimeout(() => {
      const responses = [
        `Interesting question about "${q}". Once connected to the AI backend, I'll analyze patterns across all 3 layers to provide a comprehensive answer.`,
        `I've noted your query: "${q}". In the next phase, I'll use ML models trained on your observation and detection data to give precise insights.`,
        `Great question. When the AI engine is live, queries like "${q}" will be answered using real-time analysis of anomaly patterns and healing outcomes.`,
      ];
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] },
      ]);
    }, 1200);
  };

  const sevColor = (sev: string) =>
    sev === 'high' ? theme.error : sev === 'medium' ? theme.warning : theme.accentNavyMid;

  const sevBg = (sev: string) =>
    sev === 'high' ? theme.errorLight : sev === 'medium' ? theme.warningLight : theme.accentNavyLight;

  return (
    <div
      style={{
        background: theme.surfaceElevated,
        border: `1px solid ${theme.borderSubtle}`,
        borderTop: `2px solid ${theme.accentGold}`,
        borderRadius: radius.soft,
        boxShadow: shadow.sm,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.lg}px`,
          borderBottom: `1px solid ${theme.borderSubtle}`,
          background: theme.bgSecondary,
        }}
      >
        <span
          style={{
            ...typeScale.label,
            fontFamily: fontFamily.ui,
            color: theme.textSecondary,
          }}
        >
          AI Copilot
        </span>
        <span
          style={{
            ...typeScale.caption,
            fontSize: 9,
            fontWeight: 600,
            fontFamily: fontFamily.ui,
            color: theme.accentGold,
            background: `${theme.accentGold}15`,
            border: `1px solid ${theme.accentGold}30`,
            padding: `2px ${spacing.xs}px`,
            borderRadius: radius.pill,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Preview
        </span>
      </div>

      <div
        className="nr-panel-scroll"
        style={{ flex: 1, padding: `${spacing.md}px ${spacing.lg}px`, maxHeight: 460 }}
      >
        {/* Feature Toggles */}
        <div style={{ marginBottom: spacing.lg }}>
          <div
            style={{
              ...typeScale.label,
              fontSize: 10,
              fontFamily: fontFamily.ui,
              color: theme.textTertiary,
              marginBottom: spacing.sm,
            }}
          >
            AI Features
          </div>
          {([
            { key: 'predictive' as const, label: 'Predictive Healing', desc: 'Forecast failures before they happen' },
            { key: 'rootCause' as const, label: 'Auto Root Cause Analysis', desc: 'AI-powered failure diagnosis' },
            { key: 'smartPriority' as const, label: 'Smart Prioritization', desc: 'Intelligent action ranking' },
          ]).map(feat => (
            <div
              key={feat.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${spacing.sm}px ${spacing.md}px`,
                background: theme.bgTertiary,
                borderRadius: radius.soft,
                marginBottom: spacing.xs,
                border: `1px solid ${features[feat.key] ? theme.accentNavyMid + '40' : theme.borderSubtle}`,
                transition: `border-color ${transitions.default}`,
              }}
            >
              <div>
                <div
                  style={{
                    ...typeScale.body,
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: fontFamily.ui,
                    color: features[feat.key] ? theme.accentNavy : theme.textPrimary,
                    transition: `color ${transitions.default}`,
                  }}
                >
                  {feat.label}
                </div>
                <div
                  style={{
                    ...typeScale.caption,
                    fontFamily: fontFamily.ui,
                    color: theme.textTertiary,
                    marginTop: 2,
                  }}
                >
                  {feat.desc}
                </div>
              </div>
              <Toggle
                on={features[feat.key]}
                onToggle={() => setFeatures(f => ({ ...f, [feat.key]: !f[feat.key] }))}
                label={feat.label}
              />
            </div>
          ))}
        </div>

        {/* AI Recommendations */}
        <div style={{ marginBottom: spacing.lg }}>
          <div
            style={{
              ...typeScale.label,
              fontSize: 10,
              fontFamily: fontFamily.ui,
              color: theme.textTertiary,
              marginBottom: spacing.sm,
            }}
          >
            Recommendations
          </div>
          {AI_RECOMMENDATIONS.map(rec => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: theme.bgTertiary,
                borderLeft: `3px solid ${sevColor(rec.severity)}`,
                borderRadius: radius.soft,
                padding: `${spacing.sm}px ${spacing.md}px`,
                marginBottom: spacing.xs,
              }}
            >
              <div style={{ marginBottom: spacing.xxs }}>
                <span
                  style={{
                    ...typeScale.caption,
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: fontFamily.ui,
                    color: sevColor(rec.severity),
                    background: sevBg(rec.severity),
                    padding: `1px ${spacing.xs - 2}px`,
                    borderRadius: radius.pill,
                    textTransform: 'uppercase',
                  }}
                >
                  {rec.severity}
                </span>
              </div>
              <div
                style={{
                  ...typeScale.body,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: fontFamily.ui,
                  color: theme.textPrimary,
                  marginBottom: spacing.xxs,
                  lineHeight: 1.45,
                }}
              >
                {rec.title}
              </div>
              <div
                style={{
                  ...typeScale.caption,
                  fontFamily: fontFamily.ui,
                  color: theme.textTertiary,
                  marginBottom: spacing.sm,
                  lineHeight: 1.5,
                }}
              >
                {rec.desc}
              </div>
              <button
                style={{
                  width: '100%',
                  padding: `${spacing.xs}px ${spacing.md}px`,
                  background: theme.accentNavyLight,
                  border: `1px solid ${theme.accentNavyMid}25`,
                  borderRadius: radius.soft,
                  color: theme.accentNavy,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: fontFamily.ui,
                  cursor: 'pointer',
                  transition: `all ${transitions.default}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.accentNavyMid;
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.accentNavyLight;
                  e.currentTarget.style.color = theme.accentNavy;
                }}
              >
                {rec.action}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Chat Interface */}
        <div>
          <div
            style={{
              ...typeScale.label,
              fontSize: 10,
              fontFamily: fontFamily.ui,
              color: theme.textTertiary,
              marginBottom: spacing.sm,
            }}
          >
            Ask AI
          </div>
          <div
            className="nr-panel-scroll"
            style={{
              background: theme.bgTertiary,
              borderRadius: radius.soft,
              border: `1px solid ${theme.borderSubtle}`,
              padding: `${spacing.xs}px ${spacing.sm}px`,
              maxHeight: 160,
              overflowY: 'auto',
            }}
          >
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: spacing.xs,
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: `${spacing.xs}px ${spacing.sm}px`,
                    borderRadius: radius.soft,
                    background: msg.role === 'user' ? theme.accentNavyLight : theme.bgSecondary,
                    border: `1px solid ${msg.role === 'user' ? theme.accentNavyMid + '20' : theme.borderSubtle}`,
                    ...typeScale.caption,
                    fontSize: 12,
                    fontFamily: fontFamily.ui,
                    color: theme.textSecondary,
                    lineHeight: 1.55,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: spacing.xs, marginTop: spacing.xs }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about system health..."
              style={{
                flex: 1,
                height: 40,
                background: theme.bgTertiary,
                border: `1px solid ${theme.borderDefault}`,
                borderRadius: radius.soft,
                padding: `0 ${spacing.md}px`,
                color: theme.textPrimary,
                fontSize: 13,
                fontFamily: fontFamily.ui,
                outline: 'none',
                transition: `border-color ${transitions.default}, box-shadow ${transitions.default}`,
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = theme.accentNavyMid;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accentNavyMid}18`;
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = theme.borderDefault;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSend}
              onMouseEnter={() => setSendHovered(true)}
              onMouseLeave={() => setSendHovered(false)}
              style={{
                height: 40,
                padding: `0 ${spacing.md}px`,
                background: sendHovered ? theme.accentNavyMid : theme.accentNavy,
                color: '#FFFFFF',
                borderRadius: radius.soft,
                fontSize: 13,
                fontWeight: 500,
                fontFamily: fontFamily.ui,
                border: 'none',
                cursor: 'pointer',
                transition: `all ${transitions.default}`,
                transform: sendHovered ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: sendHovered ? shadow.sm : 'none',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
