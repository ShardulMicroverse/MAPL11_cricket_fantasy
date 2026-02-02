# Cricket Fantasy - Project Workflow & Context

> This document provides complete context for AI agents and developers to understand and work on this project.

---

## Project Overview

**Name:** Cricket Fantasy - T20 World Cup Edition
**Type:** Mobile-first Fantasy Cricket Web Application
**Status:** Development (Foundation Complete)
**Created:** January 2026

### What This App Does
- Users create fantasy cricket teams (11 players, 100 credits max)
- System auto-matches 4 users into competing teams
- Users make predictions about match outcomes
- Live scores update via WebSocket
- Individual and team leaderboards track rankings
- Points awarded for fantasy performance + correct predictions

### Target Scope
- **Matches:** T20 Men's World Cup - India matches only
- **Users:** 100-1000 (medium scale)
- **Currency:** Virtual points only (no real money)

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + Vite | React 18, Vite 5 |
| Backend | Node.js + Express | Node 18+, Express 4 |
| Database | MongoDB Atlas | Cloud hosted |
| Real-time | Socket.io | v4.6 |
| Auth | JWT | jsonwebtoken |
| HTTP Client | Axios | v1.6 |

---

## Project Structure

```
c:\Apps\MAPL11\
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/         # Header, BottomNav, Loading
│   │   │   ├── match/          # MatchCard
│   │   │   ├── fantasy/        # (Team builder components)
│   │   │   ├── predictions/    # (Prediction components)
│   │   │   ├── teams/          # (Auto-match team components)
│   │   │   └── leaderboard/    # (Leaderboard components)
│   │   ├── pages/              # Route pages
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── MatchesPage.jsx
│   │   │   ├── MatchDetailPage.jsx
│   │   │   ├── TeamBuilderPage.jsx
│   │   │   ├── PredictionsPage.jsx
│   │   │   ├── MyTeamPage.jsx
│   │   │   ├── LeaderboardPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useToast.js
│   │   ├── context/            # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SocketContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── services/           # API service functions
│   │   │   ├── api.js          # Axios instance
│   │   │   ├── authService.js
│   │   │   ├── matchService.js
│   │   │   ├── fantasyService.js
│   │   │   ├── predictionService.js
│   │   │   ├── teamService.js
│   │   │   └── leaderboardService.js
│   │   ├── styles/
│   │   │   └── index.css       # All CSS (mobile-first)
│   │   ├── App.jsx             # Main app with routes
│   │   └── index.jsx           # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                     # Node.js Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── environment.js  # Env variables
│   │   │   └── database.js     # MongoDB connection
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Match.js
│   │   │   ├── Player.js
│   │   │   ├── FantasyTeam.js
│   │   │   ├── AutoMatchedTeam.js
│   │   │   ├── Prediction.js
│   │   │   ├── MatchQueue.js
│   │   │   ├── Leaderboard.js
│   │   │   └── index.js        # Export all models
│   │   ├── controllers/        # Route handlers
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── matchController.js
│   │   │   ├── fantasyController.js
│   │   │   ├── predictionController.js
│   │   │   ├── teamController.js
│   │   │   └── leaderboardController.js
│   │   ├── routes/             # Express routes
│   │   │   ├── index.js        # Route aggregator
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── matchRoutes.js
│   │   │   ├── fantasyRoutes.js
│   │   │   ├── predictionRoutes.js
│   │   │   ├── teamRoutes.js
│   │   │   └── leaderboardRoutes.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── validateRequest.js
│   │   ├── services/
│   │   │   ├── autoMatchService.js  # 4-person team matching
│   │   │   └── scoringService.js    # Fantasy points calculation
│   │   ├── sockets/
│   │   │   └── socketServer.js      # WebSocket server
│   │   ├── validators/
│   │   │   └── authValidator.js
│   │   ├── utils/
│   │   │   └── ApiError.js
│   │   ├── app.js              # Express app setup
│   │   └── index.js            # Server entry point
│   ├── seedMatches.js          # Seed matches script
│   ├── seedPlayers.js          # Seed players script
│   ├── .env                    # Environment variables (DO NOT COMMIT)
│   ├── .env.example
│   └── package.json
│
├── shared/                     # Shared code
│   └── constants/
│       └── scoringRules.js     # Fantasy scoring rules
│
├── scripts/                    # (Old location - use server/ instead)
│
├── README.md                   # Project documentation
├── WORKFLOW.md                 # This file
└── .gitignore
```

---

## Database Schema

### Collections

1. **users** - User accounts
   - email, passwordHash, displayName, avatar
   - virtualPoints (default: 1000)
   - stats: { matchesPlayed, totalFantasyPoints, predictionsCorrect, predictionsTotal, bestRank }

2. **matches** - Cricket matches
   - externalMatchId, team1, team2, venue, matchDate, startTime
   - status: 'upcoming' | 'live' | 'completed'
   - lockTime, isTeamSelectionOpen
   - liveData: { currentScore, currentOver, battingTeam }
   - statsSnapshot: { totalScore, mostSixes, mostFours, mostWickets, powerplayScore, fiftiesCount }

3. **players** - Cricket players
   - externalPlayerId, name, team, role
   - creditValue (7.0 - 11.0)
   - role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper'

4. **fantasyteams** - User's fantasy selections
   - userId, matchId
   - players: [{ playerId, isCaptain, isViceCaptain }] (exactly 11)
   - totalCredits (max 100), fantasyPoints, rank

5. **automatchedteams** - 4-person competing teams
   - matchId, teamName
   - members: [{ userId, fantasyTeamId, contributedPoints }]
   - totalPoints, rank, status

6. **predictions** - User predictions
   - userId, matchId
   - predictions: { totalScore, mostSixes, mostFours, mostWickets, powerplayScore, fiftiesCount }
   - totalPredictionPoints

7. **matchqueue** - Auto-match waiting queue
   - matchId, userId, fantasyTeamId, status, assignedTeamId

8. **leaderboards** - Cached rankings
   - type: 'individual_match' | 'team_match' | 'individual_overall' | 'team_overall'
   - matchId, entries: [{ rank, entityId, entityName, points }]

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/refresh-token | Refresh JWT |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users/profile | Get profile |
| PUT | /api/users/profile | Update profile |
| GET | /api/users/stats | Get statistics |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/matches | List all matches |
| GET | /api/matches/upcoming | Upcoming matches |
| GET | /api/matches/live | Live matches |
| GET | /api/matches/completed | Completed matches |
| GET | /api/matches/:id | Match details |
| GET | /api/matches/:id/players | Players for match |
| GET | /api/matches/:id/live-score | Live score |

### Fantasy Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fantasy/:matchId | Get user's team |
| POST | /api/fantasy/:matchId | Create/update team |
| GET | /api/fantasy/:matchId/validate | Validate team |
| DELETE | /api/fantasy/:matchId | Delete team |

### Auto-Match Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/teams/:matchId/join | Join queue |
| GET | /api/teams/:matchId/status | Queue status |
| GET | /api/teams/:matchId/my-team | Get assigned team |
| DELETE | /api/teams/:matchId/leave | Leave queue |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/predictions/:matchId | Get predictions |
| POST | /api/predictions/:matchId | Submit predictions |
| GET | /api/predictions/:matchId/options | Get player options |

### Leaderboards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leaderboards/individual/:matchId | Individual match |
| GET | /api/leaderboards/team/:matchId | Team match |
| GET | /api/leaderboards/individual/overall | Overall individual |
| GET | /api/leaderboards/my-rank/:matchId | User's rank |

---

## Environment Variables

File: `server/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/cricket-fantasy

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Cricket API (optional - for live data)
CRICKET_API_KEY=your-api-key
CRICKET_API_BASE_URL=https://api.cricketdata.org/v1
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- npm

### Step-by-Step Setup

1. **Install server dependencies:**
   ```cmd
   cd c:\Apps\MAPL11\server
   npm install
   ```

2. **Install client dependencies:**
   ```cmd
   cd c:\Apps\MAPL11\client
   npm install
   ```

3. **Configure MongoDB Atlas:**
   - Edit `server/.env`
   - Set `MONGODB_URI` to your Atlas connection string

4. **Seed database:**
   ```cmd
   cd c:\Apps\MAPL11\server
   node seedMatches.js
   node seedPlayers.js
   ```

5. **Start backend (Terminal 1):**
   ```cmd
   cd c:\Apps\MAPL11\server
   npm run dev
   ```

6. **Start frontend (Terminal 2):**
   ```cmd
   cd c:\Apps\MAPL11\client
   npm run dev
   ```

7. **Open browser:** http://localhost:5173

---

## Scoring System

### Fantasy Points (Dream11-style)

**Batting:**
- +1 per run
- +1 boundary bonus (4s)
- +2 six bonus
- +4 / +8 / +16 for 30 / 50 / 100 runs
- -2 for duck
- Strike rate bonuses/penalties

**Bowling:**
- +25 per wicket
- +8 LBW/Bowled bonus
- +4 / +8 / +16 for 3 / 4 / 5 wicket hauls
- +12 maiden over
- Economy rate bonuses/penalties

**Fielding:**
- +8 catch
- +12 stumping
- +12 direct hit run-out
- +6 indirect run-out

**Multipliers:**
- Captain: 2x points
- Vice-Captain: 1.5x points

### Prediction Points

| Question | Correct | Close | Wrong |
|----------|---------|-------|-------|
| Total Score | +50 | +25 (±15) | -10 |
| Most Sixes | +40 | - | -10 |
| Most Fours | +40 | - | -10 |
| Most Wickets | +40 | - | -10 |
| Powerplay Score | +35 | +15 (±10) | -10 |
| Fifties Count | +30 | - | -10 |

---

## Current State

### Completed
- [x] Project structure
- [x] MongoDB models (8 collections)
- [x] Express server with all routes
- [x] JWT authentication
- [x] WebSocket server
- [x] Auto-match algorithm
- [x] Scoring service
- [x] React frontend with all pages
- [x] Mobile-first CSS
- [x] Seed scripts with sample data

### TODO / Future Enhancements
- [x] Cricket API integration for real live scores
- [x] Admin panel for data sync
- [ ] Scheduled jobs for match locking
- [ ] Post-match score calculation
- [ ] Email notifications
- [ ] Unit tests
- [ ] Deployment (Vercel + Railway)

---

## Cricket API Integration

### API Provider: CricketData.org (CricAPI)

**Free Tier:** 100 requests/day

### Getting API Key
1. Go to https://cricketdata.org/
2. Sign up for free account
3. Copy API key from dashboard
4. Add to `server/.env`:
   ```
   CRICKET_API_KEY=your-api-key-here
   ```

### Admin Panel
Access at: http://localhost:5173/admin (after login)

**Features:**
- Check API connection status
- Browse available series/tournaments
- View live/current matches
- Sync matches to database
- Sync players/squads to database
- Update live scores

### API Endpoints (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/api-status | Check API connection |
| GET | /api/admin/series | Get tournaments from API |
| GET | /api/admin/live-matches | Get current matches |
| POST | /api/admin/sync-matches | Sync matches to DB |
| POST | /api/admin/sync-players | Sync players to DB |
| POST | /api/admin/update-live-scores | Update live match scores |

### Key Files
- `server/src/services/cricketApiService.js` - API integration
- `server/src/controllers/adminController.js` - Admin endpoints
- `server/src/routes/adminRoutes.js` - Admin routes
- `client/src/pages/AdminPage.jsx` - Admin UI

---

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add new API endpoint | `server/src/routes/`, `server/src/controllers/` |
| Modify database schema | `server/src/models/` |
| Change UI styling | `client/src/styles/index.css` |
| Add new page | `client/src/pages/`, `client/src/App.jsx` |
| Modify authentication | `server/src/middleware/auth.js`, `server/src/controllers/authController.js` |
| Change scoring rules | `server/src/services/scoringService.js` |
| Modify auto-match logic | `server/src/services/autoMatchService.js` |
| WebSocket events | `server/src/sockets/socketServer.js` |

---

## Common Commands

```bash
# Start development
cd server && npm run dev    # Backend on :5000
cd client && npm run dev    # Frontend on :5173

# Seed database
cd server
node seedMatches.js
node seedPlayers.js

# Build for production
cd client && npm run build
```

---

## Notes for AI Agents

1. **MongoDB Atlas is used** - Connection string is in `server/.env`
2. **No real money** - Only virtual points system
3. **India matches only** - Focused on T20 World Cup India games
4. **Mobile-first** - All CSS is designed for mobile screens
5. **Seed scripts are in server folder** - Run from `c:\Apps\MAPL11\server\`
6. **Two terminals needed** - One for backend, one for frontend

---

*Last updated: January 2026*
