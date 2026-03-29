import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useTheme, glass, AI_RECOMMENDATIONS,
  type, font, sp, radius, ease, dur,
} from '../designSystem';

export default function AICopilot() {
  const { theme, isDark } = useTheme();
  const [features, setFeatures] = useState({ predictive: false, rootCause: false, smartPriority: false });
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: "I'm your AI Copilot. Once integrated, I'll provide real-time fault analysis and healing recommendations." },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.trim(); setChatInput('');
    setChatMessages(p => [...p, { role: 'user', text: q }]);
    setTimeout(() => {
      setChatMessages(p => [...p, { role: 'ai', text: `Noted: "${q}". ML models will provide precise insights in the next phase.` }]);
    }, 1200);
  };

  const sev = (s: string) => s === 'high' ? theme.error : s === 'medium' ? theme.warning : theme.navyMid;
  const sevBg = (s: string) => s === 'high' ? theme.errorBg : s === 'medium' ? theme.warningBg : theme.hoverBg;

  const Mini = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} role="switch" aria-checked={on} style={{
      width: 30, height: 16, borderRadius: radius.pill, padding: 2,
      background: on ? theme.navy : theme.border, cursor: 'pointer', border: 'none',
      transition: `background ${dur.base}ms ${ease.standard}`, flexShrink: 0,
    }}>
      <span style={{
        display: 'block', width: 12, height: 12, borderRadius: '50%', background: '#fff',
        transform: `translateX(${on ? 14 : 0}px)`,
        transition: `transform ${dur.slow}ms ${ease.spring}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
      }} />
    </button>
  );

  return (
    <div style={{ ...glass(isDark), borderRadius: radius.lg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${sp[2]}px ${sp[4]}px`,
      }}>
        <span style={{ ...type.label, fontFamily: font, color: theme.textTertiary }}>AI Copilot</span>
        <span style={{
          ...type.caption, fontSize: 9, fontWeight: 400, fontFamily: font,
          color: theme.navyMid, background: theme.hoverBg,
          padding: '2px 8px', borderRadius: radius.pill, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Preview</span>
      </div>

      <div style={{ flex: 1, padding: `${sp[1]}px ${sp[4]}px ${sp[3]}px`, maxHeight: 420, overflowY: 'auto' }}>
        {/* Features */}
        <div style={{ marginBottom: sp[4] }}>
          <div style={{ ...type.label, fontSize: 9, fontFamily: font, color: theme.textTertiary, marginBottom: sp[2] }}>Features</div>
          {([
            { key: 'predictive' as const, label: 'Predictive Healing' },
            { key: 'rootCause' as const, label: 'Root Cause Analysis' },
            { key: 'smartPriority' as const, label: 'Smart Prioritization' },
          ]).map(f => (
            <div key={f.key} className="nr-row" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: `${sp[1]+4}px 0`, borderBottom: `1px solid ${theme.border}`,
            }}>
              <span style={{ ...type.bodySm, fontWeight: 400, fontFamily: font, color: theme.textPrimary }}>{f.label}</span>
              <Mini on={features[f.key]} onToggle={() => setFeatures(x => ({ ...x, [f.key]: !x[f.key] }))} />
            </div>
          ))}
        </div>

        {/* Recommendations */}
        <div style={{ marginBottom: sp[4] }}>
          <div style={{ ...type.label, fontSize: 9, fontFamily: font, color: theme.textTertiary, marginBottom: sp[2] }}>Recommendations</div>
          {AI_RECOMMENDATIONS.map(rec => (
            <motion.div key={rec.id} className="nr-row"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                borderLeft: `2px solid ${sev(rec.severity)}`,
                borderRadius: radius.sm, padding: `${sp[2]}px ${sp[2]}px`, marginBottom: sp[1],
                transition: `box-shadow ${dur.base}ms ${ease.out}`,
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.hoverShadow)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <span style={{
                ...type.caption, fontSize: 9, fontWeight: 400, fontFamily: font,
                color: sev(rec.severity), textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{rec.severity}</span>
              <div style={{ ...type.bodySm, fontWeight: 500, fontFamily: font, color: theme.textPrimary, marginTop: sp.half, lineHeight: 1.4 }}>{rec.title}</div>
              {/* Progressive disclosure — description + action hidden until hover */}
              <div className="nr-reveal" style={{ marginTop: sp[1] }}>
                <div style={{ ...type.caption, fontFamily: font, color: theme.textTertiary, lineHeight: 1.5 }}>{rec.desc}</div>
                <button className="nr-btn" style={{
                  width: '100%', marginTop: sp[1], padding: `6px ${sp[2]}px`,
                  background: 'transparent', border: `1px solid ${theme.border}`,
                  borderRadius: radius.sm, color: theme.navy, fontSize: 11, fontWeight: 400, fontFamily: font,
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = theme.navy; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = theme.navy; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.navy; e.currentTarget.style.borderColor = theme.border; }}
                >{rec.action}</button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chat */}
        <div>
          <div style={{ ...type.label, fontSize: 9, fontFamily: font, color: theme.textTertiary, marginBottom: sp[2] }}>Converse</div>
          <div style={{
            borderRadius: radius.sm, padding: `${sp[1]}px`, maxHeight: 120, overflowY: 'auto',
            background: theme.hoverBg,
          }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: sp.half }}>
                <div style={{
                  maxWidth: '82%', padding: `${sp.half}px ${sp[1]}px`, borderRadius: radius.sm,
                  background: m.role === 'user' ? `${theme.navy}10` : theme.surface,
                  border: `1px solid ${theme.border}`,
                  ...type.caption, fontSize: 11, fontFamily: font, color: theme.textSecondary, lineHeight: 1.55,
                }}>{m.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: sp.half, marginTop: sp[1] }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about system health..."
              style={{
                flex: 1, height: 36, background: 'transparent', border: `1px solid transparent`,
                borderRadius: radius.sm, padding: `0 ${sp[2]}px`, color: theme.textPrimary,
                fontSize: 13, fontWeight: 300, fontFamily: font, outline: 'none',
                transition: `border-color ${dur.fast}ms ${ease.standard}, box-shadow ${dur.fast}ms ${ease.standard}`,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = `${theme.navy}30`; e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.navy}08`; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <button onClick={handleSend} className="nr-btn"
              style={{
                height: 36, padding: `0 ${sp[3]}px`,
                background: theme.navy, color: '#fff',
                borderRadius: radius.sm, fontSize: 13, fontWeight: 400, fontFamily: font,
                border: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = theme.hoverShadow; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
