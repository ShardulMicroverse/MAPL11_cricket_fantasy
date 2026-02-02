# Cricket Fantasy - T20 World Cup Edition

A mobile-first fantasy cricket web application for T20 World Cup matches featuring team selection, 4-person team competitions, live scores, and prediction questions.

## Features

- **Fantasy Team Builder**: Select 11 players within 100 credits (Dream11-style)
- **Auto-Matched Teams**: System groups 4 users into competing teams
- **Prediction Questions**: Predict match outcomes for bonus points
- **Live Scores**: Real-time score updates via WebSocket
- **Leaderboards**: Individual and team rankings

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Create `server/.env` from the example:

```bash
cp server/.env.example server/.env
```

Edit the `.env` file with your MongoDB connection string and other settings.

### 3. Seed Database

```bash
# From root directory
node scripts/seedMatches.js
node scripts/seedPlayers.js
```

### 4. Start Development Servers

```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Project Structure

```
cricket-fantasy/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service functions
│   │   └── styles/         # CSS styles
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── controllers/    # Route handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   └── sockets/        # WebSocket handlers
│   └── package.json
│
├── shared/                 # Shared constants
│   └── constants/
│
└── scripts/                # Seed scripts
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Matches
- `GET /api/matches` - List all matches
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/:id/players` - Get players for match

### Fantasy Teams
- `GET /api/fantasy/:matchId` - Get user's fantasy team
- `POST /api/fantasy/:matchId` - Create/update fantasy team

### Teams (Auto-Match)
- `POST /api/teams/:matchId/join` - Join auto-match queue
- `GET /api/teams/:matchId/status` - Get queue status
- `GET /api/teams/:matchId/my-team` - Get assigned team

### Predictions
- `GET /api/predictions/:matchId` - Get user's predictions
- `POST /api/predictions/:matchId` - Submit predictions

### Leaderboards
- `GET /api/leaderboards/individual/:matchId` - Individual leaderboard
- `GET /api/leaderboards/team/:matchId` - Team leaderboard

## Scoring System

### Fantasy Points (Dream11-style)

**Batting**
- Run: +1 point
- Boundary (4): +1 bonus
- Six: +2 bonus
- Half-century: +8 bonus
- Century: +16 bonus
- Duck: -2 points

**Bowling**
- Wicket: +25 points
- LBW/Bowled: +8 bonus
- 4-wicket haul: +8 bonus
- Maiden: +12 points

**Fielding**
- Catch: +8 points
- Stumping: +12 points
- Run-out (direct): +12 points

**Multipliers**
- Captain: 2x points
- Vice-Captain: 1.5x points

### Prediction Points

| Question | Correct | Close | Wrong |
|----------|---------|-------|-------|
| Total Score | +50 | +25 | -10 |
| Most Sixes | +40 | - | -10 |
| Most Fours | +40 | - | -10 |
| Most Wickets | +40 | - | -10 |
| Powerplay Score | +35 | +15 | -10 |
| Fifties Count | +30 | - | -10 |

## License

MIT
