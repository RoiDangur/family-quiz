import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { S, ANSWER_COLORS, ANSWER_LABELS, parseCSVQuestions } from '../components/Shared';

export default function QuizEditor() {
  const nav = useNavigate();
  const { quizId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [title, setTitle] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Question form
  const [qText, setQText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importMode, setImportMode] = useState('replace');
  const [imageMap, setImageMap] = useState({}); // filename -> File object

  useEffect(() => {
    if (quizId) {
      api.getQuiz(quizId).then(q => {
        setQuiz(q);
        setTitle(q.title);
        setTimerSeconds(q.timer_seconds || 30);
        setQuestions(q.questions || []);
      }).catch(e => setError(e.message));
    }
  }, [quizId]);

  function resetForm() { setQText(''); setAnswers(['','','','']); setCorrect(0); setEditingId(null); setImageFile(null); setAudioFile(null); }

  async function handleCreateQuiz() {
    if (!title.trim()) return setError('נדרש שם לחידון');
    try {
      const q = await api.createQuiz(title.trim(), timerSeconds);
      nav(`/create/${q.id}`, { replace: true });
    } catch (e) { setError(e.message); }
  }

  async function handleAddQuestion() {
    if (!qText.trim()) return setError('נדרש טקסט לשאלה');
    if (answers.some(a => !a.trim())) return setError('נדרש למלא את כל 4 התשובות');

    const formData = new FormData();
    formData.append('questionText', qText.trim());
    formData.append('answerA', answers[0].trim());
    formData.append('answerB', answers[1].trim());
    formData.append('answerC', answers[2].trim());
    formData.append('answerD', answers[3].trim());
    formData.append('correctAnswer', correct.toString());

    if (imageFile) formData.append('image', imageFile);
    if (audioFile) formData.append('audio', audioFile);

    try {
      setSaving(true);
      if (editingId) {
        const updated = await api.updateQuestion(quizId, editingId, formData);
        setQuestions(prev => prev.map(q => q.id === editingId ? updated : q));
      } else {
        const newQ = await api.addQuestion(quizId, formData);
        setQuestions(prev => [...prev, newQ]);
      }
      resetForm();
      setError('');
    } catch (e) { setError(e.message || 'שגיאה'); }
    finally { setSaving(false); }
  }

  function handleEdit(q) {
    setEditingId(q.id);
    setQText(q.question_text);
    setAnswers([q.answer_a, q.answer_b, q.answer_c, q.answer_d]);
    setCorrect(q.correct_answer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    await api.deleteQuestion(quizId, id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (editingId === id) resetForm();
  }

  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setCsvText(ev.target.result); const { parsed, errors } = parseCSVQuestions(ev.target.result); setImportPreview(parsed); setImportErrors(errors); };
    reader.readAsText(file, 'UTF-8');
  }

  function handleImageFolder(e) {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    const newMap = {};
    files.forEach(f => { newMap[f.name] = f; });
    setImageMap(prev => ({ ...prev, ...newMap }));
  }

  async function executeImport() {
    if (!importPreview?.length) return;
    try {
      setSaving(true);

      if (importMode === 'replace') {
        // Delete existing questions first
        for (const q of questions) {
          await api.deleteQuestion(quizId, q.id).catch(() => {});
        }
      }

      // Import each question with its image if available
      for (const q of importPreview) {
        const formData = new FormData();
        formData.append('questionText', q.text);
        formData.append('answerA', q.answers[0]);
        formData.append('answerB', q.answers[1]);
        formData.append('answerC', q.answers[2]);
        formData.append('answerD', q.answers[3]);
        formData.append('correctAnswer', q.correctIndex.toString());

        if (q.imageFilename && imageMap[q.imageFilename]) {
          formData.append('image', imageMap[q.imageFilename]);
        }

        await api.addQuestion(quizId, formData);
      }

      const updated = await api.getQuiz(quizId);
      setQuestions(updated.questions || []);
      setShowImport(false); setCsvText(''); setImportPreview(null); setImportErrors([]); setImageMap({});
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleStartGame() {
    if (!questions.length) return setError('נדרשת לפחות שאלה אחת');
    try {
      const session = await api.startGame(quizId);
      nav(`/host/${session.roomCode}`);
    } catch (e) { setError(e.message); }
  }

  // --- No quiz yet: show title form ---
  if (!quizId && !quiz) {
    return (
      <div style={S.page}><div style={{ ...S.container, maxWidth: 500 }} className="animate-in">
        <button style={S.backBtn} onClick={() => nav('/')}>→ חזרה</button>
        <h2 style={{ marginBottom: 24, textAlign: 'center' }}>✨ חידון חדש</h2>
        <div style={S.card}>
          <label style={S.label}>שם החידון</label>
          <input style={S.input} placeholder="למשל: חידון משפחתי" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateQuiz()} autoFocus />
          {error && <p style={{ color: '#e74c3c', marginTop: 8 }}>{error}</p>}
          <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', marginTop: 16 }} onClick={handleCreateQuiz}>המשך ✨</button>
        </div>
      </div></div>
    );
  }

  return (
    <div style={S.page}><div style={S.container} className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button style={S.backBtn} onClick={() => nav('/')}>→</button>
        <input style={{ ...S.input, fontSize: '1.3rem', fontWeight: 700, flex: 1 }} value={title}
          onChange={e => setTitle(e.target.value)} onBlur={() => api.updateQuiz(quizId, { title: title.trim() })} />
      </div>

      {/* Timer Setting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: 14 }}>
        <span style={{ fontSize: '1.2rem' }}>⏱️</span>
        <span style={{ color: '#c4b5d9', fontWeight: 500 }}>זמן לתשובה:</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[10, 15, 20, 30, 45, 60].map(s => (
            <button key={s} onClick={() => { setTimerSeconds(s); api.updateQuiz(quizId, { timerSeconds: s }); }} style={{
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Heebo',sans-serif", fontSize: '0.9rem', fontWeight: 600,
              background: timerSeconds === s ? '#ff6b35' : 'rgba(255,255,255,0.08)', color: timerSeconds === s ? 'white' : '#c4b5d9',
            }}>{s}</button>
          ))}
          <span style={{ color: '#8b7aa8', fontSize: '0.85rem', alignSelf: 'center' }}>שניות</span>
        </div>
      </div>

      {error && <div style={{ ...S.errorBox, marginBottom: 16 }}>{error}</div>}

      {/* CSV Import */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setShowImport(!showImport)} style={{ ...S.btn, ...S.btnSecondary, width: '100%', justifyContent: 'space-between', padding: '12px 20px' }}>
          <span>📄 ייבוא שאלות מקובץ CSV</span><span style={{ opacity: 0.7 }}>{showImport ? '▲' : '▼'}</span>
        </button>
        {showImport && (
          <div style={{ ...S.card, marginTop: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <h4 style={{ color: '#FFD700', marginBottom: 8, fontSize: '0.95rem' }}>📝 פורמט הקובץ</h4>
              <p style={{ color: '#c4b5d9', fontSize: '0.85rem', lineHeight: 1.7 }}>
                כל שורה = שאלה. פסיקים בין חלקים. <span style={{ color: '#27ae60', fontWeight: 700 }}>*</span> לפני הנכונה.
                &nbsp;<span style={{ color: '#74B9FF' }}>[image.jpg]</span> בסוף לתמונה.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#c4b5d9', direction: 'ltr', textAlign: 'left', whiteSpace: 'pre', marginTop: 8 }}>
{`מה הבירה?,תל אביב,*ירושלים,חיפה,באר שבע`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label style={{ ...S.btn, ...S.btnSecondary, flex: 1, cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="file" accept=".csv,.txt,.tsv" onChange={handleCSVFile} style={{ display: 'none' }} />📁 בחר קובץ
              </label>
            </div>
            <textarea style={{ ...S.input, minHeight: 80, fontFamily: 'monospace', fontSize: '0.85rem' }} placeholder="או הדביקו כאן..." value={csvText}
              onChange={e => setCsvText(e.target.value)} />
            <button style={{ ...S.smallBtn, marginTop: 8, background: '#6C5CE7' }}
              onClick={() => { const { parsed, errors } = parseCSVQuestions(csvText); setImportPreview(parsed); setImportErrors(errors); }}
              disabled={!csvText.trim()}>👁️ תצוגה מקדימה</button>

            {/* Image folder upload */}
            <div style={{ marginTop: 16 }}>
              <label style={S.label}>🖼️ תיקיית תמונות (אופציונלי)</label>
              <label style={{
                display: 'block', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
                padding: 14, textAlign: 'center', cursor: 'pointer',
                background: Object.keys(imageMap).length > 0 ? 'rgba(39,174,96,0.08)' : 'rgba(255,255,255,0.03)',
              }}>
                <input type="file" accept="image/*" multiple onChange={handleImageFolder} style={{ display: 'none' }}
                  {...({ webkitdirectory: '', directory: '' })} />
                {Object.keys(imageMap).length > 0 ? (
                  <span style={{ color: '#27ae60' }}>✅ נטענו {Object.keys(imageMap).length} תמונות</span>
                ) : (
                  <>
                    <span style={{ color: '#ff6b35', fontWeight: 600 }}>בחר תיקייה עם תמונות</span>
                    <br /><small style={{ color: '#8b7aa8' }}>או סמנו מספר תמונות בודדות</small>
                  </>
                )}
              </label>
              {Object.keys(imageMap).length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#8b7aa8', marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.keys(imageMap).map(name => (
                    <span key={name} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }}>📎 {name}</span>
                  ))}
                </div>
              )}
            </div>

            {importErrors.length > 0 && <div style={{ ...S.errorBox, marginTop: 12 }}>{importErrors.map((e,i) => <div key={i} style={{ fontSize: '0.85rem' }}>• {e}</div>)}</div>}
            {importPreview?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ color: '#c4b5d9', marginBottom: 8 }}>✅ {importPreview.length} שאלות מוכנות</h4>
                <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {importPreview.map((q, i) => (
                    <div key={i} style={{ padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                      <div style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text}</div>
                      <span style={{ color: '#27ae60', fontSize: '0.75rem' }}>✓ {q.answers[q.correctIndex]}</span>
                      {q.imageFilename && (
                        <span style={{ fontSize: '0.75rem', color: imageMap[q.imageFilename] ? '#27ae60' : '#f39c12' }}>
                          {imageMap[q.imageFilename] ? '🖼️' : `⚠️ ${q.imageFilename}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  {['replace', 'append'].map(m => (
                    <label key={m} style={{ display: 'flex', gap: 6, cursor: 'pointer', color: '#c4b5d9', fontSize: '0.9rem' }}>
                      <input type="radio" name="mode" checked={importMode === m} onChange={() => setImportMode(m)} style={{ accentColor: '#ff6b35' }} />
                      {m === 'replace' ? 'החלף קיימות' : 'הוסף לקיימות'}
                    </label>
                  ))}
                </div>
                <button style={{ ...S.btn, ...S.btnPrimary, width: '100%', marginTop: 12 }} onClick={executeImport}>📥 ייבא {importPreview.length} שאלות</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question Form */}
      <div style={S.card}>
        <h3 style={{ marginBottom: 16, color: '#FFD700' }}>{editingId ? '✏️ עריכת שאלה' : '➕ הוספת שאלה'}</h3>
        <label style={S.label}>טקסט השאלה</label>
        <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }} placeholder="הקלד את השאלה..." value={qText} onChange={e => setQText(e.target.value)} />
        <label style={{ ...S.label, marginTop: 16 }}>תשובות</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10, background: correct === i ? 'rgba(39,174,96,0.15)' : 'rgba(255,255,255,0.04)', border: correct === i ? '2px solid #27ae60' : '2px solid transparent' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: ANSWER_COLORS[i], flexShrink: 0 }} />
              <input style={{ ...S.input, border: 'none', background: 'transparent', padding: '10px 4px' }} placeholder={`תשובה ${ANSWER_LABELS[i]}`} value={answers[i]} onChange={e => { const a = [...answers]; a[i] = e.target.value; setAnswers(a); }} />
              <button type="button" onClick={() => setCorrect(i)} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: correct === i ? '3px solid #27ae60' : '2px solid rgba(255,255,255,0.3)', background: correct === i ? '#27ae60' : 'transparent', color: 'white', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {correct === i ? '✓' : ''}
              </button>
            </div>
          ))}
        </div>

        {/* File uploads */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          <div>
            <label style={{
              display: 'block', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
              padding: 14, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)',
            }}>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => setImageFile(e.target.files[0] || null)} style={{ display: 'none' }} />
              🖼️ <span style={{ color: '#ff6b35', fontWeight: 600 }}>העלאת תמונה</span>
              <br /><small style={{ color: '#8b7aa8' }}>JPG, PNG, GIF, WebP (עד 5MB)</small>
            </label>
            {imageFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.85rem', color: '#c4b5d9' }}>
                <span>📎 {imageFile.name}</span>
                <button type="button" onClick={() => setImageFile(null)} style={{ ...S.smallBtn, background: '#e74c3c', padding: '2px 8px', fontSize: '0.8rem' }}>✕</button>
              </div>
            )}
          </div>
          <div>
            <label style={{
              display: 'block', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12,
              padding: 14, textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.03)',
            }}>
              <input type="file" accept="audio/mpeg,audio/wav,audio/ogg" onChange={e => setAudioFile(e.target.files[0] || null)} style={{ display: 'none' }} />
              🔊 <span style={{ color: '#ff6b35', fontWeight: 600 }}>העלאת אודיו</span>
              <br /><small style={{ color: '#8b7aa8' }}>MP3, WAV, OGG (עד 10MB)</small>
            </label>
            {audioFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.85rem', color: '#c4b5d9' }}>
                <span>🎵 {audioFile.name}</span>
                <button type="button" onClick={() => setAudioFile(null)} style={{ ...S.smallBtn, background: '#e74c3c', padding: '2px 8px', fontSize: '0.8rem' }}>✕</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={handleAddQuestion} disabled={saving} style={{ ...S.btn, ...S.btnPrimary, flex: 1 }}>{saving ? 'שומר...' : editingId ? 'עדכן שאלה ✓' : 'הוסף שאלה ➕'}</button>
          {editingId && <button type="button" style={{ ...S.btn, ...S.btnSecondary }} onClick={resetForm}>ביטול</button>}
        </div>
      </div>

      {/* Questions List */}
      {questions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📋 שאלות ({questions.length})</h3>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ ...S.card, padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ff6b35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</div>
                <div style={{ fontSize: '0.8rem', color: '#8b7aa8' }}>
                  ✓ <span style={{ color: ANSWER_COLORS[q.correct_answer] }}>{[q.answer_a, q.answer_b, q.answer_c, q.answer_d][q.correct_answer]}</span>
                  {q.image_path && <span style={{ marginRight: 8 }}>🖼️</span>}
                  {q.audio_path && <span style={{ marginRight: 8 }}>🔊</span>}
                </div>
              </div>
              <button style={S.iconBtn} onClick={() => handleEdit(q)}>✏️</button>
              <button style={S.iconBtn} onClick={() => handleDelete(q.id)}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {/* Start Game */}
      <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 24 }}>
        <div style={{ display: 'inline-block', padding: '8px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 16, color: '#c4b5d9' }}>
          {questions.length === 0 ? 'עדיין לא נוספו שאלות' : `${questions.length} שאלות בחידון`}
        </div><br />
        <button style={{ ...S.btn, ...S.btnPrimary, fontSize: '1.3rem', padding: '18px 48px', opacity: questions.length ? 1 : 0.5 }} disabled={!questions.length} onClick={handleStartGame}>🎮 התחל משחק</button>
      </div>
    </div></div>
  );
}
