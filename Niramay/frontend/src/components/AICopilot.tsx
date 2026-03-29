import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useTheme, glass, glassSubtle, AI_RECOMMENDATIONS,
  type, font, sp, radius, ease, dur,
} from '../designSystem';

export default function AICopilot() {
  const { theme, isDark } = useTheme();
  const [features, setFeatures] = useState({ predictive: false, rootCause: false, smartPriority: false });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: "Hello — I'm your AI Copilot. Once the AI backend is integrated, I'll provide real-time fault analysis, predictive insights, and healing recommendations." },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [sendHovered, setSendHovered] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim(); setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: q }]);
    setTimeout(() => {
      const rs = [
        `Interesting question about "${q}". Once the AI backend is connected, I'll analyze patterns across all 3 layers.`,
        `Noted: "${q}". In the next phase, ML models will provide precise insights from your data.`,
        `When the AI engine is live, queries like "${q}" will leverage real-time anomaly analysis.`,
      ];
      setChatMessages(p => [...p, { role: 'ai', text: rs[Math.floor(Math.random() * rs.length)] }]);
    }, 1200);
  };

  const sev = (s: string) => s === 'high' ? theme.error : s === 'medium' ? theme.warning : theme.navyMid;
  const sevBg = (s: string) => s === 'high' ? theme.errorBg : s === 'medium' ? theme.warningBg : theme.hoverBg;

  /* Mini toggle */
  const MiniToggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} role="switch" aria-checked={on} style={{
      width: 32, height: 18, borderRadius: radius.pill, padding: 2, border: 'none',
      background: on ? theme.interactive : theme.border, cursor: 'pointer',
      transition: `background ${dur.default}ms ${ease.standard}`, flexShrink: 0,
    }}>
      <span style={{
        display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transform: `translateX(${on ? 14 : 0}px)`,
        transition: `transform ${dur.slow}ms ${ease.spring}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[1]}px ${sp[2]}px`, borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textSecondary }}>AI Copilot</span>
        <span style={{
          ...type.caption, fontSize: 9, fontWeight: 500, fontFamily: font,
          color: theme.navyMid, background: theme.hoverBg,
          padding: '2px 8px', borderRadius: radius.pill, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Preview</span>
      </div>

      <div style={{ flex: 1, padding: `${sp[1]}px ${sp[2]}px`, maxHeight: 460, overflowY: 'auto' }}>
        {/* Features */}
        <div style={{ marginBottom: sp[2] }}>
          <div style={{ ...type.label, fontSize: 10, fontFamily: font, color: theme.textTertiary, marginBottom: sp[1] }}>Features</div>
          {([
            { key: 'predictive' as const, label: 'Predictive Healing', desc: 'Forecast failures before they happen' },
            { key: 'rootCause' as const, label: 'Root Cause Analysis', desc: 'AI-powered failure diagnosis' },
            { key: 'smartPriority' as const, label: 'Smart Prioritization', desc: 'Intelligent action ranking' },
          ]).map(f => (
            <div key={f.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: `${sp[1]}px`, background: theme.hoverBg, borderRadius: radius.sm, marginBottom: sp.half,
              border: `1px solid ${features[f.key] ? `${theme.interactive}30` : 'transparent'}`,
              transition: `border-color ${dur.default}ms ${ease.standard}`,
            }}>
              <div>
                <div style={{ ...type.bodySm, fontWeight: 500, fontFamily: font, color: theme.textPrimary }}>{f.label}</div>
                <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, marginTop: 1 }}>{f.desc}</div>
              </div>
              <MiniToggle on={features[f.key]} onToggle={() => setFeatures(x => ({ ...x, [f.key]: !x[f.key] }))} />
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: sp[2] }}>
          <div style={{ ...type.label, fontSize: 10, fontFamily: font, color: theme.textTertiary, marginBottom: sp[1] }}>Recommendations</div>
          {AI_RECOMMENDATIONS.map(rec => (
            <motion.div key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
              background: theme.hoverBg, borderLeft: `2px solid ${sev(rec.severity)}`,
              borderRadius: radius.sm, padding: `${sp[1]}px`, marginBottom: sp.half,
            }}>
              <span style={{
                ...type.caption, fontSize: 9, fontWeight: 500, fontFamily: font,
                color: sev(rec.severity), background: sevBg(rec.severity),
                padding: '1px 6px', borderRadius: radius.pill, textTransform: 'uppercase',
              }}>{rec.severity}</span>
              <div style={{ ...type.bodySm, fontWeight: 500, fontFamily: font, color: theme.textPrimary, marginTop: 6, lineHeight: 1.45 }}>{rec.title}</div>
              <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, marginTop: 4, lineHeight: 1.5 }}>{rec.desc}</div>
              <button style={{
                width: '100%', marginTop: sp[1], padding: `6px ${sp[1]}px`,
                background: theme.hoverBg, border: `1px solid ${theme.border}`,
                borderRadius: radius.sm, color: theme.interactive, fontSize: 12, fontWeight: 500, fontFamily: font,
                cursor: 'pointer', transition: `all ${dur.default}ms ${ease.spring}`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = theme.interactive; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = theme.hoverBg; e.currentTarget.style.color = theme.interactive; e.currentTarget.style.transform = 'translateY(0)'; }}
              >{rec.action}</button>
            </motion.div>
          ))}
        </div>

        {/* Chat */}
        <div>
          <div style={{ ...type.label, fontSize: 10, fontFamily: font, color: theme.textTertiary, marginBottom: sp[1] }}>Ask AI</div>
          <div style={{
            background: theme.hoverBg, borderRadius: radius.sm,
            padding: `${sp.half}px ${sp[1]}px`, maxHeight: 140, overflowY: 'auto',
          }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: sp.half }}>
                <div style={{
                  maxWidth: '85%', padding: `${sp.half}px ${sp[1]}px`, borderRadius: radius.sm,
                  background: m.role === 'user' ? theme.interactive + '15' : theme.surface,
                  border: `1px solid ${theme.border}`,
                  ...type.caption, fontSize: 12, fontFamily: font, color: theme.textSecondary, lineHeight: 1.55,
                }}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: sp.half, marginTop: sp.half }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about system health..."
              style={{
                flex: 1, height: 36, background: 'transparent', border: `1px solid ${theme.border}`,
                borderRadius: radius.sm, padding: `0 ${sp[1]}px`, color: theme.textPrimary,
                fontSize: 13, fontFamily: font, outline: 'none',
                transition: `border-color ${dur.fast}ms ${ease.standard}, box-shadow ${dur.fast}ms ${ease.standard}`,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = `${theme.interactive}50`; e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.interactive}12`; }}
              onBlur={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button onClick={handleSend}
              onMouseEnter={() => setSendHovered(true)} onMouseLeave={() => setSendHovered(false)}
              style={{
                height: 36, padding: `0 ${sp[2]}px`,
                background: sendHovered ? theme.navyMid : theme.interactive,
                color: '#fff', borderRadius: radius.sm, fontSize: 13, fontWeight: 500, fontFamily: font,
                border: 'none', cursor: 'pointer',
                transition: `all ${dur.default}ms ${ease.spring}`,
                transform: sendHovered ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: sendHovered ? '0 4px 12px rgba(27,58,107,0.2)' : 'none',
              }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
