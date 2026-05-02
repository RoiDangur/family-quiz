import React from 'react';
import { AVATARS } from '../assets/avatars';

export const ANSWER_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#27ae60'];
export const ANSWER_LABELS = ['א', 'ב', 'ג', 'ד'];

// ---- Styles object ----
export const S = {
  page: { minHeight: '100vh', padding: '16px 0', color: 'white', fontFamily: "'Heebo', sans-serif", direction: 'rtl' },
  container: { maxWidth: 700, margin: '0 auto', padding: '0 16px' },
  card: { background: '#3a1a6e', borderRadius: 18, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' },
  input: { width: '100%', padding: '14px 18px', background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontFamily: "'Heebo', sans-serif", fontSize: '1rem', direction: 'rtl', textAlign: 'right', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#c4b5d9', fontSize: '0.95rem' },
  btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 28px', border: 'none', borderRadius: 12, fontFamily: "'Heebo', sans-serif", fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', minHeight: 48 },
  btnPrimary: { background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)', color: 'white', boxShadow: '0 4px 16px rgba(255,107,53,0.3)' },
  btnSecondary: { background: '#3a1a6e', color: 'white', border: '2px solid rgba(255,255,255,0.1)' },
  backBtn: { background: 'none', border: 'none', color: '#c4b5d9', fontSize: '1rem', cursor: 'pointer', marginBottom: 16, fontFamily: "'Heebo', sans-serif", padding: '4px 0' },
  smallBtn: { padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Heebo', sans-serif", fontSize: '0.85rem', fontWeight: 600, color: 'white', background: '#4a2588' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, fontSize: '1rem' },
  errorBox: { background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 12, padding: '12px 16px', color: '#e74c3c' },
};

// ---- Avatar Display ----
export function AvatarDisplay({ avatarId, size = 56 }) {
  const av = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: av.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
    }}>{av.emoji}</div>
  );
}

// ---- Timer Circle ----
export function TimerCircle({ seconds, total }) {
  const pct = seconds / total;
  const r = 36, circ = 2 * Math.PI * r;
  const color = pct > 0.5 ? '#27ae60' : pct > 0.2 ? '#f39c12' : '#e74c3c';
  return (
    <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto' }}>
      <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color }}>{seconds}</div>
    </div>
  );
}

// ---- Confetti ----
export function Confetti() {
  const colors = ['#e74c3c','#3498db','#f39c12','#27ae60','#9b59b6','#ff6b35','#FFD700'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 3,
    dur: 2 + Math.random() * 3, color: colors[i % colors.length], size: 6 + Math.random() * 8,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -20, width: p.size, height: p.size * 1.3,
          borderRadius: Math.random() > 0.5 ? '50%' : 2, background: p.color,
          animation: `confettiFall ${p.dur}s ease-in ${p.delay}s infinite`,
        }} />
      ))}
      <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } }`}</style>
    </div>
  );
}

// ---- CSV Parser ----
export function parseCSVQuestions(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
  const parsed = [], errors = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = smartSplit(lines[i]);
    if (parts.length < 5) { errors.push(`שורה ${i+1}: נדרשים שאלה + 4 תשובות`); continue; }
    let qText = parts[0].trim();
    const answerParts = parts.slice(1, 5).map(a => a.trim());

    let imageFilename = null;
    const imgMatch = qText.match(/\[([^\]]+\.(jpg|jpeg|png|gif|webp))\]\s*$/i);
    if (imgMatch) { imageFilename = imgMatch[1]; qText = qText.replace(/\s*\[[^\]]+\]\s*$/, '').trim(); }

    let correctIndex = -1;
    const cleanAnswers = answerParts.map((a, idx) => { if (a.startsWith('*')) { correctIndex = idx; return a.substring(1).trim(); } return a; });

    if (correctIndex === -1) { errors.push(`שורה ${i+1}: לא נמצאה תשובה נכונה (סמנו *)`); continue; }
    if (!qText) { errors.push(`שורה ${i+1}: חסר טקסט`); continue; }
    if (cleanAnswers.some(a => !a)) { errors.push(`שורה ${i+1}: תשובה ריקה`); continue; }

    parsed.push({ text: qText, answers: cleanAnswers, correctIndex, imageFilename });
  }
  return { parsed, errors };
}

function smartSplit(line) {
  const result = []; let cur = '', inQ = false;
  for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === ',' && !inQ) { result.push(cur); cur = ''; } else cur += ch; }
  result.push(cur); return result;
}
