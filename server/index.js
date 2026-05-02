const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('./models/db');
const quizRoutes = require('./routes/quizRoutes');
const { setupSocket } = require('./socket/gameSocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use('/uploads', express.static(uploadsPath));

// API
app.use('/api/quizzes', quizRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve built client
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Socket.IO
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});
setupSocket(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Family Quiz running on port ${PORT}`);
});

// Cleanup old sessions every hour
setInterval(() => {
  const { GameSession } = require('./models');
  GameSession.cleanup();
}, 3600000);
