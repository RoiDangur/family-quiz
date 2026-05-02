# 🎯 חידון משפחתי — Family Quiz

A Kahoot-style multiplayer quiz game with full Hebrew RTL support. The host creates quizzes and controls the game from a laptop/tablet, while players join from their phones using a room code.

## Features

- 🇮🇱 Full Hebrew RTL interface
- 📱 Mobile-first design — players play from their phones
- ⚡ Real-time multiplayer via WebSockets (Socket.IO)
- 📄 CSV bulk import for questions
- ⏱️ Configurable timer per quiz (10–60 seconds)
- 🏆 Speed-based scoring with leaderboard
- 🎉 Winner celebration with confetti
- 🖼️ Image support on questions
- 📷 QR code for easy joining

## Tech Stack

- **Frontend**: React + Vite + React Router
- **Backend**: Node.js + Express + Socket.IO
- **Database**: SQLite (better-sqlite3)
- **Deployment**: Docker / Railway

---

## 🚀 Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   cd family-quiz
   git init
   git add .
   git commit -m "Family quiz app"
   git remote add origin https://github.com/YOUR_USER/family-quiz.git
   git push -u origin main
   ```

2. **Connect to Railway**:
   - Go to [railway.app](https://railway.app) and sign in
   - Click **"New Project"** → **"Deploy from GitHub repo"**
   - Select your `family-quiz` repository
   - Railway will auto-detect the Dockerfile and start building

3. **Generate a domain**:
   - In your Railway project, go to **Settings** → **Networking**
   - Click **"Generate Domain"** to get a public URL
   - That's it! Share the URL with your family

### Option B: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project and deploy
cd family-quiz
railway init
railway up

# Generate a public URL
railway domain
```

### Environment Variables (Optional)

Railway sets `PORT` automatically. These are optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port (set by Railway) |
| `DB_PATH` | `./data/quiz.db` | SQLite database path |
| `NODE_ENV` | `production` | Environment |

---

## 🎮 How to Play

### Host (laptop/tablet):
1. Open the app → **"צור חידון"** (Create Quiz)
2. Add questions manually or import from CSV
3. Click **"התחל משחק"** → get a 4-digit room code + QR
4. Wait for players to join → click **"התחל משחק!"**
5. Control the flow: show questions → see results → next question

### Players (phone):
1. Open the app URL on your phone
2. Click **"הצטרף למשחק"** (Join Game)
3. Enter the room code, your name, pick an avatar
4. Answer questions as fast as you can!
5. See your score after each question

### CSV Import Format:
```
question text,answer 1,*correct answer,answer 3,answer 4
```
- `*` before the correct answer
- `[image.jpg]` at end of question for images
- One question per line

---

## 🛠️ Local Development

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Start server (terminal 1)
cd server && node index.js

# Start client (terminal 2)
cd client && npx vite --host

# Open http://localhost:5173
```

---

## Project Structure

```
family-quiz/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/          # Home, QuizEditor, JoinGame, HostLobby, HostGame, PlayerGame
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # useSocket
│   │   └── assets/         # Avatars
│   └── index.html
├── server/                 # Node.js backend
│   ├── models/             # SQLite models (Quiz, Question, GameSession)
│   ├── routes/             # REST API routes
│   ├── socket/             # WebSocket game engine
│   └── index.js            # Entry point
├── Dockerfile
├── package.json
└── README.md
```
