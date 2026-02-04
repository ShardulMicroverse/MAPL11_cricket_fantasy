const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

let io;

// userId -> socketId
const userSockets = new Map();

// matchId -> Set of socketIds
const matchRooms = new Map();

const initializeSocket = (httpServer) => {
  const allowedOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://mapl11.vercel.app'
  ].filter(Boolean);

 io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});


  // ===== AUTH MIDDLEWARE =====
  io.use((socket, next) => {
    const authHeader = socket.handshake.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new Error('Authentication required'));
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    userSockets.set(userId.toString(), socket.id);
    console.log(`User connected: ${userId}`);

    socket.on('join-match', ({ matchId }) => {
      const room = `match:${matchId}`;

      socket.join(room);

      if (!matchRooms.has(matchId)) {
        matchRooms.set(matchId, new Set());
      }

      matchRooms.get(matchId).add(socket.id);
      console.log(`User ${userId} joined match room: ${matchId}`);
    });

    socket.on('leave-match', ({ matchId }) => {
      const room = `match:${matchId}`;

      socket.leave(room);
      matchRooms.get(matchId)?.delete(socket.id);
    });

    socket.on('disconnect', () => {
      userSockets.delete(userId.toString());
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

// ===== Broadcasters =====

const broadcastScoreUpdate = (matchId, liveData) => {
  if (!io) return;
  io.to(`match:${matchId}`).emit('score-update', { matchId, liveData });
};

const notifyUser = (userId, event, data) => {
  if (!io) return;

  const socketId = userSockets.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
};

const broadcastMatchLocked = (matchId) => {
  if (!io) return;
  io.to(`match:${matchId}`).emit('match-locked', { matchId });
};

const broadcastLeaderboardUpdate = (matchId, type, entries) => {
  if (!io) return;
  io.to(`match:${matchId}`).emit('leaderboard-update', {
    matchId,
    type,
    entries
  });
};

const broadcastTeamMatched = (userIds, matchId, teamData) => {
  if (!io) return;

  userIds.forEach((userId) => {
    notifyUser(userId.toString(), 'team-matched', {
      matchId,
      ...teamData
    });
  });
};

const broadcastPermanentTeamFormed = (userIds, teamData) => {
  if (!io) return;

  userIds.forEach((userId) => {
    notifyUser(userId.toString(), 'permanent-team-formed', teamData);
  });
};

const broadcastTeamBonusAwarded = (userIds, data) => {
  if (!io) return;

  userIds.forEach((userId) => {
    notifyUser(userId.toString(), 'team-bonus-awarded', data);
  });
};

const broadcastTeamLeaderboardUpdate = (data) => {
  if (!io) return;
  io.emit('team-leaderboard-update', data);
};

module.exports = {
  initializeSocket,
  broadcastScoreUpdate,
  notifyUser,
  broadcastMatchLocked,
  broadcastLeaderboardUpdate,
  broadcastTeamMatched,
  broadcastPermanentTeamFormed,
  broadcastTeamBonusAwarded,
  broadcastTeamLeaderboardUpdate
};
