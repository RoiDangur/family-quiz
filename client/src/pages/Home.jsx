import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { S } from '../components/Shared';

export default function Home() {
  const nav = useNavigate();
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => { api.getQuizzes().then(setQuizzes).catch(() => {}); }, []);

  return (
    <div style={S.page}>
      <div style={{ ...S.container, maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }} className="animate-in">
          <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎯</div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg, #fff, #FFD700, #FF6B35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>חידון משפחתי</h1>
          <p style={{ color: '#c4b5d9', fontSize: '1.1rem' }}>משחק טריוויה מהנה לכל המשפחה!</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          <button onClick={() => nav('/create')} style={{ ...S.btn, background: 'linear-gradient(135deg, #ff6b35, #ff8c5a)', boxShadow: '0 6px 24px rgba(255,107,53,0.4)', padding: '20px 24px', borderRadius: 24, justifyContent: 'flex-start', gap: 16 }}>
            <span style={{ fontSize: '2rem' }}>✨</span>
            <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>צור חידון</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>הכן שאלות ונהל את המשחק</span>
            </span>
          </button>
          <button onClick={() => nav('/join')} style={{ ...S.btn, background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', boxShadow: '0 6px 24px rgba(108,92,231,0.4)', padding: '20px 24px', borderRadius: 24, justifyContent: 'flex-start', gap: 16 }}>
            <span style={{ fontSize: '2rem' }}>🎮</span>
            <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700 }}>הצטרף למשחק</span>
              <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>הכנס קוד חדר מהטלפון</span>
            </span>
          </button>
        </div>

        {quizzes.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 12, color: '#c4b5d9' }}>📋 החידונים שלי</h3>
            {quizzes.map(q => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#3a1a6e', borderRadius: 12, marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{q.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#8b7aa8' }}>{q.question_count} שאלות</div>
                </div>
                <button style={S.smallBtn} onClick={() => nav(`/create/${q.id}`)}>ערוך</button>
                <button style={{ ...S.smallBtn, background: '#e74c3c' }} onClick={async () => { await api.deleteQuiz(q.id); setQuizzes(prev => prev.filter(x => x.id !== q.id)); }}>מחק</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
