const { Quiz, GameSession } = require('../models');
const xss = require('xss');

// In-memory game state per room
const games = new Map();

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);

    // ---- HOST joins room ----
    socket.on('host:join', ({ roomCode }) => {
      const session = GameSession.findByCode(roomCode);
      if (!session) return socket.emit('error', { message: 'חדר לא נמצא' });

      const quiz = Quiz.findById(session.quiz_id);
      if (!quiz) return socket.emit('error', { message: 'חידון לא נמצא' });

      if (!games.has(roomCode)) {
        games.set(roomCode, {
          sessionId: session.id,
          quiz,
          players: new Map(),
          hostSocketId: socket.id,
          status: 'lobby',
          currentQuestionIndex: -1,
          answers: new Map(), // playerId -> { answerIndex, timestamp }
          questionStartTime: null,
          timerInterval: null,
        });
      }

      const game = games.get(roomCode);
      game.hostSocketId = socket.id;

      socket.join(roomCode);
      socket.data = { roomCode, role: 'host' };

      socket.emit('host:joined', {
        players: getPlayersArray(game),
        quiz: { title: quiz.title, questionCount: quiz.questions.length, timerSeconds: quiz.timer_seconds },
        status: game.status,
        currentQuestionIndex: game.currentQuestionIndex,
      });

      console.log(`Host joined ${roomCode} (socket: ${socket.id}, status: ${game.status})`);
    });

    // ---- PLAYER joins room ----
    socket.on('player:join', ({ roomCode, playerName, avatar }) => {
      const session = GameSession.findByCode(roomCode);
      if (!session) return socket.emit('error', { message: 'חדר לא נמצא' });

      const game = games.get(roomCode);
      if (!game) return socket.emit('error', { message: 'המשחק לא פעיל' });
      if (game.status !== 'lobby') return socket.emit('error', { message: 'המשחק כבר התחיל' });

      const name = xss((playerName || '').trim());
      if (!name) return socket.emit('error', { message: 'נדרש שם שחקן' });

      game.players.set(socket.id, {
        id: socket.id,
        name,
        avatar: avatar || 'cat',
        score: 0,
        totalResponseTime: 0,
        answeredCount: 0,
        connected: true,
      });

      socket.join(roomCode);
      socket.data = { roomCode, role: 'player' };

      socket.emit('join:success', { name, avatar: avatar || 'cat' });

      // Notify everyone
      io.to(roomCode).emit('players:update', { players: getPlayersArray(game) });
    });

    // ---- HOST starts game ----
    socket.on('game:start', ({ roomCode }) => {
      const game = games.get(roomCode);
      if (!game) return;
      if (socket.data?.role !== 'host') return;
      game.hostSocketId = socket.id; // Update in case it changed
      if (game.players.size < 1) return socket.emit('error', { message: 'צריך לפחות שחקן אחד' });

      game.status = 'playing';
      game.currentQuestionIndex = 0;
      GameSession.updateStatus(game.sessionId, 'playing');

      io.to(roomCode).emit('game:started');
      sendQuestion(io, roomCode, game);
    });

    // ---- PLAYER submits answer ----
    socket.on('answer:submit', ({ roomCode, answerIndex }) => {
      const game = games.get(roomCode);
      if (!game || game.status !== 'playing') return;
      if (game.answers.has(socket.id)) return; // Already answered

      const timeElapsed = (Date.now() - game.questionStartTime) / 1000;
      const timerSeconds = game.quiz.timer_seconds || 30;
      const timeRemaining = Math.max(0, timerSeconds - timeElapsed);

      const question = game.quiz.questions[game.currentQuestionIndex];
      const isCorrect = answerIndex === question.correct_answer;
      const points = isCorrect ? Math.round(1000 * (timeRemaining / timerSeconds)) : 0;

      game.answers.set(socket.id, { answerIndex, timeElapsed, points, isCorrect });

      // Update player score
      const player = game.players.get(socket.id);
      if (player) {
        player.score += points;
        player.totalResponseTime += timeElapsed;
        player.answeredCount += 1;
      }

      // Tell the player their result immediately
      socket.emit('answer:received', { answerIndex });

      // Tell everyone how many answered
      io.to(roomCode).emit('answer:count', {
        answered: game.answers.size,
        total: getConnectedCount(game),
      });

      // If everyone answered, end the question early
      if (game.answers.size >= getConnectedCount(game)) {
        clearInterval(game.timerInterval);
        endQuestion(io, roomCode, game);
      }
    });

    // ---- HOST advances to next question ----
    socket.on('question:next', ({ roomCode }) => {
      const game = games.get(roomCode);
      if (!game || socket.data?.role !== 'host') return;
      game.hostSocketId = socket.id;

      game.currentQuestionIndex += 1;

      if (game.currentQuestionIndex >= game.quiz.questions.length) {
        endGame(io, roomCode, game);
      } else {
        sendQuestion(io, roomCode, game);
      }
    });

    // ---- HOST skips timer ----
    socket.on('timer:skip', ({ roomCode }) => {
      const game = games.get(roomCode);
      if (!game || socket.data?.role !== 'host') return;
      game.hostSocketId = socket.id;
      clearInterval(game.timerInterval);
      endQuestion(io, roomCode, game);
    });

    // ---- Disconnect ----
    socket.on('disconnect', () => {
      const { roomCode, role } = socket.data || {};
      if (!roomCode || !games.has(roomCode)) return;
      const game = games.get(roomCode);

      if (role === 'host') {
        // Delay notification — host might be reconnecting (page navigation)
        setTimeout(() => {
          if (games.has(roomCode) && games.get(roomCode).hostSocketId === socket.id) {
            // Host didn't reconnect with a new socket — notify players
            io.to(roomCode).emit('host:disconnected');
            // Keep game alive for another 60s
            setTimeout(() => {
              if (games.has(roomCode) && games.get(roomCode).hostSocketId === socket.id) {
                cleanupGame(roomCode);
              }
            }, 60000);
          }
        }, 3000);
      } else if (role === 'player') {
        const player = game.players.get(socket.id);
        if (player) {
          player.connected = false;
          io.to(roomCode).emit('players:update', { players: getPlayersArray(game) });
        }
      }
    });
  });
}

function sendQuestion(io, roomCode, game) {
  const qi = game.currentQuestionIndex;
  const question = game.quiz.questions[qi];
  const timerSeconds = game.quiz.timer_seconds || 30;

  game.answers = new Map();
  game.questionStartTime = Date.now();

  // Send question to all (without correct answer to players)
  const questionData = {
    index: qi,
    total: game.quiz.questions.length,
    text: question.question_text,
    answers: [question.answer_a, question.answer_b, question.answer_c, question.answer_d],
    imagePath: question.image_path,
    audioPath: question.audio_path,
    timerSeconds,
  };

  // Players get question without correct answer
  io.to(roomCode).emit('question:show', questionData);

  // Host also gets the correct answer
  io.to(game.hostSocketId).emit('question:correct', { correctAnswer: question.correct_answer });

  // Server-side timer
  let remaining = timerSeconds;
  game.timerInterval = setInterval(() => {
    remaining--;
    io.to(roomCode).emit('timer:tick', { remaining });
    if (remaining <= 0) {
      clearInterval(game.timerInterval);
      endQuestion(io, roomCode, game);
    }
  }, 1000);
}

function endQuestion(io, roomCode, game) {
  const question = game.quiz.questions[game.currentQuestionIndex];
  const timerSeconds = game.quiz.timer_seconds || 30;

  // Give 0 points to players who didn't answer
  for (const [playerId, player] of game.players) {
    if (!game.answers.has(playerId) && player.connected) {
      game.answers.set(playerId, { answerIndex: -1, timeElapsed: timerSeconds, points: 0, isCorrect: false });
      player.totalResponseTime += timerSeconds;
      player.answeredCount += 1;
    }
  }

  // Distribution
  const distribution = [0, 0, 0, 0];
  for (const a of game.answers.values()) {
    if (a.answerIndex >= 0 && a.answerIndex <= 3) distribution[a.answerIndex]++;
  }

  const leaderboard = getLeaderboard(game);

  // Build per-player results keyed by player name (since socket IDs can change)
  const playerResults = {};
  for (const [playerId, answer] of game.answers) {
    const player = game.players.get(playerId);
    if (player) {
      playerResults[player.name] = {
        isCorrect: answer.isCorrect,
        pointsEarned: answer.points,
        totalScore: player.score,
        rank: leaderboard.findIndex(p => p.id === playerId) + 1,
      };
    }
  }

  // Single broadcast to everyone with all data
  io.to(roomCode).emit('question:results', {
    correctAnswer: question.correct_answer,
    distribution,
    leaderboard,
    playerResults,
    isLastQuestion: game.currentQuestionIndex >= game.quiz.questions.length - 1,
  });
}

function endGame(io, roomCode, game) {
  game.status = 'finished';
  GameSession.updateStatus(game.sessionId, 'finished');

  const leaderboard = getLeaderboard(game);
  io.to(roomCode).emit('game:end', { leaderboard });

  // Cleanup after a delay
  setTimeout(() => cleanupGame(roomCode), 300000); // 5 minutes
}

function cleanupGame(roomCode) {
  const game = games.get(roomCode);
  if (game?.timerInterval) clearInterval(game.timerInterval);
  games.delete(roomCode);
}

function getPlayersArray(game) {
  return Array.from(game.players.values()).map(p => ({
    id: p.id, name: p.name, avatar: p.avatar, score: p.score, connected: p.connected,
  }));
}

function getConnectedCount(game) {
  let count = 0;
  for (const p of game.players.values()) { if (p.connected) count++; }
  return count;
}

function getLeaderboard(game) {
  return Array.from(game.players.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalResponseTime - b.totalResponseTime;
    })
    .map(p => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, connected: p.connected }));
}

module.exports = { setupSocket };
