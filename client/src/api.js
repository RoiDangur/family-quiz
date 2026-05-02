const BASE = '/api';

async function req(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'שגיאה');
  return data;
}

export const api = {
  getQuizzes: () => req('/quizzes'),
  getQuiz: (id) => req(`/quizzes/${id}`),
  createQuiz: (title, timerSeconds) => req('/quizzes', { method: 'POST', body: JSON.stringify({ title, timerSeconds }) }),
  updateQuiz: (id, data) => req(`/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => req(`/quizzes/${id}`, { method: 'DELETE' }),

  addQuestion: (quizId, formData) => fetch(`${BASE}/quizzes/${quizId}/questions`, { method: 'POST', body: formData }).then(r => r.json()),
  updateQuestion: (quizId, qId, formData) => fetch(`${BASE}/quizzes/${quizId}/questions/${qId}`, { method: 'PUT', body: formData }).then(r => r.json()),
  deleteQuestion: (quizId, qId) => req(`/quizzes/${quizId}/questions/${qId}`, { method: 'DELETE' }),
  reorderQuestions: (quizId, ids) => req(`/quizzes/${quizId}/reorder`, { method: 'PUT', body: JSON.stringify({ questionIds: ids }) }),
  bulkImport: (quizId, questions, replace) => req(`/quizzes/${quizId}/questions/bulk`, { method: 'POST', body: JSON.stringify({ questions, replace }) }),

  startGame: (quizId) => req(`/quizzes/${quizId}/start`, { method: 'POST' }),
  checkRoom: (code) => req(`/quizzes/game/${code}`),
};
