import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useSocket } from '../hooks/useSocket';
import { S, AvatarDisplay } from '../components/Shared';

export default function HostLobby() {
  const { roomCode } = useParams();
  const nav = useNavigate();
  const { socket, connected, emit, on } = useSocket();
  const [players, setPlayers] = useState([]);
  const [quizInfo, setQuizInfo] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;
    emit('host:join', { roomCode });

    const unsub1 = on('host:joined', ({ players, quiz }) => { setPlayers(players || []); setQuizInfo(quiz); });
    const unsub2 = on('players:update', ({ players }) => setPlayers(players || []));
    const unsub3 = on('game:started', () => nav(`/host/${roomCode}/game`));

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [socket, connected]);

  const joinUrl = `${window.location.origin}/join?code=${roomCode}`;

  return (
    <div style={S.page}><div style={{ ...S.container, maxWidth: 550, textAlign: 'center' }} className="animate-in">
      <h2 style={{ marginBottom: 8 }}>ממתינים לשחקנים...</h2>
      <p style={{ color: '#c4b5d9', marginBottom: 24 }}>שחקנים יכולים להצטרף מהטלפון שלהם</p>

      {/* Room Code + QR */}
      <div style={{ ...S.card, padding: 32, marginBottom: 24, background: 'linear-gradient(135deg, #3a1a6e, #4a2588)' }}>
        <p style={{ color: '#8b7aa8', marginBottom: 8 }}>קוד חדר</p>
        <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: 12, color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>{roomCode}</div>

        <div style={{ margin: '20px auto', background: 'white', borderRadius: 16, padding: 16, width: 'fit-content' }}>
          <QRCodeSVG value={joinUrl} size={160} />
        </div>

        <p style={{ color: '#8b7aa8', fontSize: '0.8rem', wordBreak: 'break-all' }}>🔗 {joinUrl}</p>
        {quizInfo && <p style={{ color: '#c4b5d9', marginTop: 8 }}>🎯 {quizInfo.title} • {quizInfo.questionCount} שאלות • {quizInfo.timerSeconds} שניות</p>}
      </div>

      {/* Players */}
      <div style={S.card}>
        <h3 style={{ marginBottom: 16 }}>👥 שחקנים ({players.length})</h3>
        {players.length === 0 ? (
          <p style={{ color: '#8b7aa8' }}>ממתינים לשחקנים... שתפו את הקוד!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {players.map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                <AvatarDisplay avatarId={p.avatar} size={48} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', marginTop: 24, fontSize: '1.2rem', padding: '16px 32px', opacity: players.length < 1 ? 0.5 : 1 }}
        disabled={players.length < 1} onClick={() => emit('game:start', { roomCode })}>
        🎬 התחל משחק!
      </button>
      <button style={{ ...S.btn, ...S.btnSecondary, width: '100%', marginTop: 8 }} onClick={() => nav('/')}>חזרה</button>
    </div></div>
  );
}
