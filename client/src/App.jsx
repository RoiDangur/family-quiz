import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import QuizEditor from './pages/QuizEditor';
import JoinGame from './pages/JoinGame';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import PlayerGame from './pages/PlayerGame';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<QuizEditor />} />
        <Route path="/create/:quizId" element={<QuizEditor />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/host/:roomCode" element={<HostLobby />} />
        <Route path="/host/:roomCode/game" element={<HostGame />} />
        <Route path="/play/:roomCode" element={<PlayerGame />} />
      </Routes>
    </BrowserRouter>
  );
}
