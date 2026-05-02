import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { S, ANSWER_COLORS, ANSWER_LABELS, TimerCircle, AvatarDisplay, Confetti } from '../components/Shared';

export default function HostGame() {
  const { roomCode } = useParams();
  const nav = useNavigate();
  const { socket, connected, emit, on } = useSocket();

  const [question, setQuestion] = useState(null);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [timer, setTimer] = useState(30);
  const [timerTotal, setTimerTotal] = useState(30);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [results, setResults] = useState(null); // { correctAnswer, distribution, leaderboard, isLastQuestion }
  const [phase, setPhase] = useState('waiting'); // waiting, question, results
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    if (!socket || !connected) return;
    emit('host:join', { roomCode });

    const unsubs = [
      on('question:show', (q) => {
        setQuestion(q);
        setTimer(q.timerSeconds);
        setTimerTotal(q.timerSeconds);
        setCorrectAnswer(null);
        setResults(null);
        setAnswerCount({ answered: 0, total: 0 });
        setPhase('question');
      }),
      on('question:correct', ({ correctAnswer }) => setCorrectAnswer(correctAnswer)),
      on('timer:tick', ({ remaining }) => setTimer(remaining)),
      on('answer:count', (data) => setAnswerCount(data)),
      on('question:results', (data) => { setResults(data); setPhase('results'); }),
      on('game:end', ({ leaderboard }) => setFinalLeaderboard(leaderboard)),
    ];
    return () => unsubs.forEach(u => u());
  }, [socket, connected]);

  // Final leaderboard
  if (finalLeaderboard) {
    const winner = finalLeaderboard[0];
    return (
      <div style={S.page}><Confetti />
        <div style={{ ...S.container, maxWidth: 500, textAlign: 'center' }} className="animate-in">
          <h1 style={{ fontSize: '2.2rem', marginBottom: 32 }}>🏆 תוצאות סופיות</h1>
          {winner && (
            <div style={{ ...S.card, padding: 32, marginBottom: 24, background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,107,53,0.15))', border: '2px solid rgba(255,215,0,0.3)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>👑</div>
              <AvatarDisplay avatarId={winner.avatar} size={80} />
              <h2 style={{ marginTop: 12, color: '#FFD700' }}>{winner.name}</h2>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFD700', marginTop: 8 }}>{winner.score} נקודות</div>
            </div>
          )}
          <div style={S.card}>
            {finalLeaderboard.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < finalLeaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontWeight: 800, width: 30, textAlign: 'center', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#8b7aa8' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <AvatarDisplay avatarId={p.avatar} size={40} />
                <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: '#FFD700', fontSize: '1.1rem' }}>{p.score}</span>
              </div>
            ))}
          </div>
          <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', marginTop: 24 }} onClick={() => nav('/')}>🏠 חזרה לדף הבית</button>
        </div>
      </div>
    );
  }

  if (phase === 'waiting') {
    return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#c4b5d9', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>⏳ מתחיל...</p></div>;
  }

  return (
    <div style={S.page}><div style={S.container} className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#8b7aa8' }}>שאלה {question.index + 1} מתוך {question.total}</span>
        <span style={{ color: '#8b7aa8' }}>ענו: {answerCount.answered}/{answerCount.total}</span>
      </div>

      {phase === 'question' && <TimerCircle seconds={timer} total={timerTotal} />}

      {/* Question */}
      <div style={{ ...S.card, marginTop: 16, textAlign: 'center' }}>
        {question.imagePath && <img src={`/${question.imagePath}`} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, marginBottom: 16, objectFit: 'contain' }} />}
        <h2 style={{ fontSize: '1.4rem', lineHeight: 1.5 }}>{question.text}</h2>
      </div>

      {/* Answers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {question.answers.map((ans, i) => {
          const showCorrect = phase === 'results' && results;
          const isCorrect = showCorrect && i === results.correctAnswer;
          return (
            <div key={i} style={{
              background: showCorrect ? (isCorrect ? '#27ae60' : 'rgba(255,255,255,0.05)') : ANSWER_COLORS[i],
              borderRadius: 14, padding: '16px 14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: 600,
              opacity: showCorrect && !isCorrect ? 0.4 : 1, transition: 'all 0.3s',
              border: isCorrect ? '3px solid #2ecc71' : '3px solid transparent', position: 'relative',
            }}>
              <span style={{ position: 'absolute', top: 6, right: 10, fontSize: '0.75rem', opacity: 0.7 }}>{ANSWER_LABELS[i]}</span>
              {ans}
              {showCorrect && <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8 }}>{results.distribution[i]} בחרו</div>}
            </div>
          );
        })}
      </div>

      {phase === 'question' && (
        <button style={{ ...S.btn, ...S.btnSecondary, width: '100%', marginTop: 16 }} onClick={() => emit('timer:skip', { roomCode })}>⏭️ סיים טיימר</button>
      )}

      {/* Results Phase: Leaderboard */}
      {phase === 'results' && results && (
        <div style={{ marginTop: 24 }}>
          <div style={S.card}>
            <h3 style={{ marginBottom: 12, textAlign: 'center' }}>🏆 טבלת ניקוד</h3>
            {results.leaderboard.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < results.leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontWeight: 700, width: 24, textAlign: 'center', color: i === 0 ? '#FFD700' : '#8b7aa8' }}>{i + 1}</span>
                <AvatarDisplay avatarId={p.avatar} size={32} />
                <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: '#FFD700' }}>{p.score}</span>
              </div>
            ))}
          </div>
          <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', marginTop: 16, fontSize: '1.1rem' }} onClick={() => { setPhase('waiting'); emit('question:next', { roomCode }); }}>
            {results.isLastQuestion ? '🏆 תוצאות סופיות' : '➡️ שאלה הבאה'}
          </button>
        </div>
      )}
    </div></div>
  );
}
