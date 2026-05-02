const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const Quiz = {
  create(title, timerSeconds = 30) {
    const id = uuidv4();
    db.prepare('INSERT INTO quizzes (id, title, timer_seconds) VALUES (?, ?, ?)').run(id, title, timerSeconds);
    return { id, title, timer_seconds: timerSeconds, questions: [] };
  },

  findAll() {
    return db.prepare(`
      SELECT q.*, COUNT(qu.id) as question_count
      FROM quizzes q LEFT JOIN questions qu ON q.id = qu.quiz_id
      GROUP BY q.id ORDER BY q.created_at DESC
    `).all();
  },

  findById(id) {
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
    if (!quiz) return null;
    quiz.questions = db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(id);
    return quiz;
  },

  update(id, { title, timerSeconds }) {
    const sets = [];
    const vals = [];
    if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
    if (timerSeconds !== undefined) { sets.push('timer_seconds = ?'); vals.push(timerSeconds); }
    if (sets.length === 0) return false;
    sets.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(id);
    return db.prepare(`UPDATE quizzes SET ${sets.join(', ')} WHERE id = ?`).run(...vals).changes > 0;
  },

  delete(id) {
    return db.prepare('DELETE FROM quizzes WHERE id = ?').run(id).changes > 0;
  }
};

const Question = {
  create({ quizId, questionText, answers, correctAnswer, imagePath, audioPath }) {
    const id = uuidv4();
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),-1) as m FROM questions WHERE quiz_id = ?').get(quizId);
    const order = (maxOrder?.m ?? -1) + 1;
    db.prepare(`INSERT INTO questions (id, quiz_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, image_path, audio_path, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, quizId, questionText, answers[0], answers[1], answers[2], answers[3], correctAnswer, imagePath || null, audioPath || null, order);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  },

  update(id, data) {
    const existing = this.findById(id);
    if (!existing) return null;
    db.prepare(`UPDATE questions SET question_text=?, answer_a=?, answer_b=?, answer_c=?, answer_d=?, correct_answer=?, image_path=?, audio_path=? WHERE id=?`)
      .run(
        data.questionText ?? existing.question_text,
        data.answers?.[0] ?? existing.answer_a,
        data.answers?.[1] ?? existing.answer_b,
        data.answers?.[2] ?? existing.answer_c,
        data.answers?.[3] ?? existing.answer_d,
        data.correctAnswer ?? existing.correct_answer,
        data.imagePath !== undefined ? data.imagePath : existing.image_path,
        data.audioPath !== undefined ? data.audioPath : existing.audio_path,
        id
      );
    return this.findById(id);
  },

  delete(id) {
    const q = this.findById(id);
    if (!q) return false;
    [q.image_path, q.audio_path].forEach(p => {
      if (p) { const full = path.join(__dirname, '..', p); if (fs.existsSync(full)) fs.unlinkSync(full); }
    });
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    this._reorder(q.quiz_id);
    return true;
  },

  reorder(quizId, ids) {
    const stmt = db.prepare('UPDATE questions SET sort_order = ? WHERE id = ? AND quiz_id = ?');
    db.transaction(() => ids.forEach((id, i) => stmt.run(i, id, quizId)))();
    return db.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quizId);
  },

  _reorder(quizId) {
    const qs = db.prepare('SELECT id FROM questions WHERE quiz_id = ? ORDER BY sort_order').all(quizId);
    const stmt = db.prepare('UPDATE questions SET sort_order = ? WHERE id = ?');
    db.transaction(() => qs.forEach((q, i) => stmt.run(i, q.id)))();
  },

  // Bulk import from CSV data
  bulkCreate(quizId, questionsData) {
    const stmt = db.prepare(`INSERT INTO questions (id, quiz_id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, image_path, audio_path, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const startOrder = (db.prepare('SELECT COALESCE(MAX(sort_order),-1) as m FROM questions WHERE quiz_id = ?').get(quizId)?.m ?? -1) + 1;
    const created = [];
    db.transaction(() => {
      questionsData.forEach((q, i) => {
        const id = uuidv4();
        stmt.run(id, quizId, q.questionText, q.answers[0], q.answers[1], q.answers[2], q.answers[3], q.correctAnswer, q.imagePath || null, null, startOrder + i);
        created.push(id);
      });
    })();
    return created;
  }
};

const GameSession = {
  create(quizId) {
    const id = uuidv4();
    let code;
    do { code = Math.floor(1000 + Math.random() * 9000).toString(); }
    while (this.findByCode(code));
    db.prepare('INSERT INTO game_sessions (id, quiz_id, room_code) VALUES (?,?,?)').run(id, quizId, code);
    return { id, quizId, roomCode: code, status: 'lobby' };
  },

  findByCode(code) {
    return db.prepare("SELECT * FROM game_sessions WHERE room_code = ? AND status != 'finished'").get(code);
  },

  findById(id) {
    return db.prepare('SELECT * FROM game_sessions WHERE id = ?').get(id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE game_sessions SET status = ? WHERE id = ?').run(status, id);
  },

  cleanup() {
    return db.prepare("DELETE FROM game_sessions WHERE created_at < datetime('now','-24 hours')").run().changes;
  }
};

module.exports = { Quiz, Question, GameSession };
