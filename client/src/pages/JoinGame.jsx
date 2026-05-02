import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AVATARS } from '../assets/avatars';
import { S, AvatarDisplay } from '../components/Shared';

export default function JoinGame() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [roomCode, setRoomCode] = useState(params.get('code') || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('cat');
  const [error, setError] = useState('');

  function handleJoin(e) {
    e.preventDefault();
    if (!roomCode.trim()) return setError('נדרש קוד חדר');
    if (!name.trim()) return setError('נדרש שם שחקן');
    nav(`/play/${roomCode.trim()}`, { state: { playerName: name.trim(), avatar } });
  }

  return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.container, maxWidth: 460 }} className="animate-in">
        <button style={S.backBtn} onClick={() => nav('/')}>→ חזרה</button>
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>🎮 הצטרפות למשחק</h1>
        <form onSubmit={handleJoin}>
          <div style={{ ...S.card, marginBottom: 16 }}>
            <label style={S.label}>קוד חדר</label>
            <input style={{ ...S.input, fontSize: '1.8rem', textAlign: 'center', letterSpacing: 10, fontWeight: 700 }}
              placeholder="1234" value={roomCode} onChange={e => setRoomCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" maxLength={6} autoFocus />

            <label style={{ ...S.label, marginTop: 16 }}>השם שלך</label>
            <input style={S.input} placeholder="הכנס את השם שלך" value={name} onChange={e => setName(e.target.value)} maxLength={20} />
          </div>

          <div style={{ ...S.card, marginBottom: 16 }}>
            <label style={S.label}>בחר דמות</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {AVATARS.map(av => (
                <button key={av.id} type="button" onClick={() => setAvatar(av.id)} style={{
                  padding: 8, borderRadius: 12, cursor: 'pointer', border: 'none',
                  background: avatar === av.id ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.04)',
                  outline: avatar === av.id ? '2px solid #ff6b35' : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontSize: '1.8rem' }}>{av.emoji}</span>
                  <span style={{ fontSize: '0.65rem', color: '#c4b5d9' }}>{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: '#e74c3c', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          <button type="submit" style={{ ...S.btn, ...S.btnPrimary, width: '100%', fontSize: '1.15rem', padding: '16px 32px' }}>הצטרף למשחק! 🚀</button>
        </form>
      </div>
    </div>
  );
}
