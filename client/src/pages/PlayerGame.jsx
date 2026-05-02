import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { S, ANSWER_COLORS, ANSWER_LABELS, TimerCircle, AvatarDisplay, Confetti } from '../components/Shared';

export default function PlayerGame() {
  const { roomCode } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { playerName, avatar } = location.state || {};
  const { socket, connected, emit, on } = useSocket();

  const [phase, setPhase] = useState('joining'); // joining, waiting, question, results, finished
  const [error, setError] = useState('');
  const [question, setQuestion] = useState(null);
  const [timer, setTimer] = useState(30);
  const [timerTotal, setTimerTotal] = useState(30);
  const [answerCount, setAnswerCount] = useState({ answered: 0, total: 0 });
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [results, setResults] = useState(null);
  const [myResult, setMyResult] = useState(null); // personal result per question
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    if (!playerName) { nav('/join'); return; }
    if (!socket || !connected) return;

    emit('player:join', { roomCode, playerName, avatar });

    const unsubs = [
      on('join:success', () => setPhase('waiting')),
      on('error', ({ message }) => setError(message)),
      on('game:started', () => {}),
      on('question:show', (q) => {
        setQuestion(q);
        setTimer(q.timerSeconds);
        setTimerTotal(q.timerSeconds);
        setSelectedAnswer(null);
        setResults(null);
        setMyResult(null);
        setAnswerCount({ answered: 0, total: 0 });
        setPhase('question');
      }),
      on('timer:tick', ({ remaining }) => setTimer(remaining)),
      on('answer:received', ({ answerIndex }) => {
        setSelectedAnswer(answerIndex);
      }),
      on('answer:count', (data) => setAnswerCount(data)),
      on('question:results', (data) => {
        setResults(data);
        // Extract personal result by player name
        if (data.playerResults && data.playerResults[playerName]) {
          setMyResult(data.playerResults[playerName]);
        } else {
          setMyResult(null);
        }
        setPhase('results');
      }),
      on('game:end', ({ leaderboard }) => {
        setFinalLeaderboard(leaderboard);
        setPhase('finished');
      }),
      on('host:disconnected', () => setError('המארח התנתק')),
    ];

    return () => unsubs.forEach(u => u());
  }, [socket, connected]);

  function submitAnswer(index) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    emit('answer:submit', { roomCode, answerIndex: index });
  }

  // ---- JOINING ----
  if (phase === 'joining') {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#c4b5d9', fontSize: '1.2rem' }}>מתחבר...</p>
          {error && <p style={{ color: '#e74c3c', marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ---- WAITING ----
  if (phase === 'waiting') {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }} className="animate-in">
          <AvatarDisplay avatarId={avatar} size={100} />
          <h2 style={{ marginTop: 16 }}>{playerName}</h2>
          <p style={{ color: '#c4b5d9', marginTop: 8 }}>ממתינים למארח להתחיל...</p>
          <div style={{ marginTop: 24, animation: 'pulse 2s infinite' }}><span style={{ fontSize: '2rem' }}>⏳</span></div>
        </div>
      </div>
    );
  }

  // ---- FINISHED ----
  if (phase === 'finished' && finalLeaderboard) {
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
          <button style={{ ...S.btn, ...S.btnSecondary, width: '100%', marginTop: 24 }} onClick={() => nav('/')}>🏠 חזרה</button>
        </div>
      </div>
    );
  }

  // ---- QUESTION & RESULTS ----
  if (!question) {
    return <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#c4b5d9', fontSize: '1.2rem', animation: 'pulse 2s infinite' }}>⏳ מתחיל...</p></div>;
  }

  return (
    <div style={S.page}><div style={S.container} className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: '#8b7aa8' }}>שאלה {question.index + 1} מתוך {question.total}</span>
        <span style={{ color: '#8b7aa8' }}>ענו: {answerCount.answered}/{answerCount.total}</span>
      </div>

      {/* Timer */}
      {phase === 'question' && <TimerCircle seconds={timer} total={timerTotal} />}

      {/* Question */}
      <div style={{ ...S.card, marginTop: 16, textAlign: 'center' }}>
        {question.imagePath && <img src={`/${question.imagePath}`} alt="" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 12, marginBottom: 16, objectFit: 'contain' }} />}
        <h2 style={{ fontSize: '1.4rem', lineHeight: 1.5 }}>{question.text}</h2>
      </div>

      {/* Answers — tappable during question phase */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        {question.answers.map((ans, i) => {
          const showCorrect = phase === 'results' && results;
          const isCorrect = showCorrect && i === results.correctAnswer;
          const isSelected = selectedAnswer === i;
          return (
            <button key={i}
              onClick={() => phase === 'question' && submitAnswer(i)}
              disabled={phase !== 'question' || selectedAnswer !== null}
              style={{
                background: showCorrect
                  ? (isCorrect ? '#27ae60' : 'rgba(255,255,255,0.05)')
                  : isSelected ? '#fff' : ANSWER_COLORS[i],
                color: isSelected && !showCorrect ? ANSWER_COLORS[i] : 'white',
                borderRadius: 14, padding: '16px 14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: 600,
                opacity: showCorrect && !isCorrect ? 0.4 : (phase === 'question' && selectedAnswer !== null && !isSelected ? 0.4 : 1),
                transition: 'all 0.3s',
                border: isCorrect ? '3px solid #2ecc71' : isSelected && !showCorrect ? `3px solid ${ANSWER_COLORS[i]}` : '3px solid transparent',
                position: 'relative', cursor: phase === 'question' && selectedAnswer === null ? 'pointer' : 'default',
                fontFamily: "'Heebo', sans-serif", minHeight: 60,
              }}>
              <span style={{ position: 'absolute', top: 6, right: 10, fontSize: '0.75rem', opacity: 0.7 }}>{ANSWER_LABELS[i]}</span>
              {ans}
              {showCorrect && <div style={{ fontSize: '0.75rem', marginTop: 4, opacity: 0.8 }}>{results.distribution[i]} בחרו</div>}
            </button>
          );
        })}
      </div>

      {/* Waiting after answering */}
      {phase === 'question' && selectedAnswer !== null && (
        <div style={{ textAlign: 'center', marginTop: 20, color: '#c4b5d9' }}>
          <p style={{ animation: 'pulse 2s infinite' }}>⏳ ממתינים לשאר השחקנים...</p>
        </div>
      )}

      {/* Results: Personal result + Leaderboard */}
      {phase === 'results' && results && (
        <div style={{ marginTop: 24 }}>
          {/* Personal result banner */}
          {myResult && (
            <div style={{
              ...S.card, padding: '16px 20px', marginBottom: 16, textAlign: 'center',
              background: myResult.isCorrect ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)',
              border: `2px solid ${myResult.isCorrect ? '#27ae60' : '#e74c3c'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span style={{ fontSize: '2rem' }}>{myResult.isCorrect ? '🎉' : '😔'}</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: myResult.isCorrect ? '#27ae60' : '#e74c3c' }}>
                    {myResult.isCorrect ? 'תשובה נכונה!' : 'תשובה שגויה'}
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4 }}>
                    <span style={{ color: '#FFD700', fontWeight: 700 }}>+{myResult.pointsEarned} נקודות</span>
                    <span style={{ color: '#c4b5d9' }}>סה"כ: {myResult.totalScore}</span>
                    <span style={{ color: '#c4b5d9' }}>מקום {myResult.rank}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div style={S.card}>
            <h3 style={{ marginBottom: 12, textAlign: 'center' }}>🏆 טבלת ניקוד</h3>
            {results.leaderboard.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px',
                borderBottom: i < results.leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: p.name === playerName ? 'rgba(255,107,53,0.1)' : 'transparent',
                borderRadius: 8,
              }}>
                <span style={{ fontWeight: 700, width: 24, textAlign: 'center', color: i === 0 ? '#FFD700' : '#8b7aa8' }}>{i + 1}</span>
                <AvatarDisplay avatarId={p.avatar} size={32} />
                <span style={{ flex: 1, fontWeight: p.name === playerName ? 700 : 500 }}>{p.name}</span>
                <span style={{ fontWeight: 700, color: '#FFD700' }}>{p.score}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, color: '#c4b5d9' }}>
            <p style={{ animation: 'pulse 2s infinite' }}>⏳ ממתינים למארח להמשיך...</p>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: 16 }}>{error}</p>}
    </div></div>
  );
}
