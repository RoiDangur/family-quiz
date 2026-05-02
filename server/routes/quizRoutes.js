const express = require('express');
const router = express.Router();
const xss = require('xss');
const { Quiz, Question, GameSession } = require('../models');
const { upload } = require('./upload');

const clean = s => s ? xss(s.trim()) : '';

// ---- Quizzes ----
router.get('/', (req, res) => {
  try { res.json(Quiz.findAll()); }
  catch (e) { res.status(500).json({ error: 'שגיאה בטעינת החידונים' }); }
});

router.post('/', (req, res) => {
  try {
    const title = clean(req.body.title);
    if (!title) return res.status(400).json({ error: 'נדרש שם לחידון' });
    res.status(201).json(Quiz.create(title, req.body.timerSeconds || 30));
  } catch (e) { res.status(500).json({ error: 'שגיאה ביצירת החידון' }); }
});

router.get('/:id', (req, res) => {
  try {
    const quiz = Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'חידון לא נמצא' });
    res.json(quiz);
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

router.put('/:id', (req, res) => {
  try {
    const data = {};
    if (req.body.title) data.title = clean(req.body.title);
    if (req.body.timerSeconds) data.timerSeconds = parseInt(req.body.timerSeconds);
    Quiz.update(req.params.id, data);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

router.delete('/:id', (req, res) => {
  try {
    if (!Quiz.delete(req.params.id)) return res.status(404).json({ error: 'לא נמצא' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

// ---- Questions ----
router.post('/:quizId/questions', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), (req, res) => {
  try {
    const quiz = Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ error: 'חידון לא נמצא' });

    const questionText = clean(req.body.questionText);
    const answers = [clean(req.body.answerA), clean(req.body.answerB), clean(req.body.answerC), clean(req.body.answerD)];
    const correctAnswer = parseInt(req.body.correctAnswer);

    if (!questionText || answers.some(a => !a)) return res.status(400).json({ error: 'נדרש טקסט לשאלה ולכל 4 התשובות' });
    if (![0, 1, 2, 3].includes(correctAnswer)) return res.status(400).json({ error: 'תשובה נכונה לא תקינה' });

    const imagePath = req.files?.image?.[0] ? 'uploads/images/' + req.files.image[0].filename : null;
    const audioPath = req.files?.audio?.[0] ? 'uploads/audio/' + req.files.audio[0].filename : null;

    res.status(201).json(Question.create({ quizId: req.params.quizId, questionText, answers, correctAnswer, imagePath, audioPath }));
  } catch (e) { console.error(e); res.status(500).json({ error: 'שגיאה' }); }
});

router.put('/:quizId/questions/:qId', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), (req, res) => {
  try {
    const existing = Question.findById(req.params.qId);
    if (!existing || existing.quiz_id !== req.params.quizId) return res.status(404).json({ error: 'לא נמצא' });

    const data = {};
    if (req.body.questionText) data.questionText = clean(req.body.questionText);
    if (req.body.answerA) data.answers = [clean(req.body.answerA), clean(req.body.answerB), clean(req.body.answerC), clean(req.body.answerD)];
    if (req.body.correctAnswer !== undefined) data.correctAnswer = parseInt(req.body.correctAnswer);
    if (req.files?.image?.[0]) data.imagePath = 'uploads/images/' + req.files.image[0].filename;
    if (req.files?.audio?.[0]) data.audioPath = 'uploads/audio/' + req.files.audio[0].filename;
    if (req.body.removeImage === 'true') data.imagePath = null;
    if (req.body.removeAudio === 'true') data.audioPath = null;

    res.json(Question.update(req.params.qId, data));
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

router.delete('/:quizId/questions/:qId', (req, res) => {
  try {
    if (!Question.delete(req.params.qId)) return res.status(404).json({ error: 'לא נמצא' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

router.put('/:quizId/reorder', (req, res) => {
  try {
    res.json(Question.reorder(req.params.quizId, req.body.questionIds));
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

// Bulk import
router.post('/:quizId/questions/bulk', (req, res) => {
  try {
    const quiz = Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ error: 'חידון לא נמצא' });

    const { questions: qs, replace } = req.body;
    if (!Array.isArray(qs)) return res.status(400).json({ error: 'פורמט לא תקין' });

    if (replace) {
      // Delete existing questions
      const existing = quiz.questions || [];
      existing.forEach(q => Question.delete(q.id));
    }

    const ids = Question.bulkCreate(req.params.quizId, qs.map(q => ({
      questionText: clean(q.text),
      answers: q.answers.map(a => clean(a)),
      correctAnswer: q.correctIndex,
      imagePath: null,
    })));

    res.status(201).json({ imported: ids.length });
  } catch (e) { console.error(e); res.status(500).json({ error: 'שגיאה בייבוא' }); }
});

// ---- Game Sessions ----
router.post('/:quizId/start', (req, res) => {
  try {
    const quiz = Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ error: 'חידון לא נמצא' });
    if (!quiz.questions?.length) return res.status(400).json({ error: 'נדרשת לפחות שאלה אחת' });
    res.status(201).json(GameSession.create(req.params.quizId));
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

router.get('/game/:code', (req, res) => {
  try {
    const s = GameSession.findByCode(req.params.code);
    if (!s) return res.status(404).json({ error: 'חדר לא נמצא' });
    res.json({ roomCode: s.room_code, status: s.status, quizId: s.quiz_id });
  } catch (e) { res.status(500).json({ error: 'שגיאה' }); }
});

module.exports = router;
