const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

let io;
const userSockets = new Map(); // userId -> socketId
const matchRooms = new Map(); // matchId -> Set of socketIds

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
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // ✅ AUTHENTICATION MIDDLEWARE (FIXED)
  io.use((socket, next) => {
    const authHeader = socket.handshake.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new Error('Authentication required'));
    }

    const token = authHeader.split(' ')[1]; // ✅ FIXED

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    userSockets.set(userId, socket.id);
    console.log(User connected: ${userId});

    socket.on('join-match', ({ matchId }) => {
      socket.join(match:${matchId});
      if (!matchRooms.has(matchId)) {
        matchRooms.set(matchId, new Set());
      }
      matchRooms.get(matchId).add(socket.id);
      console.log(User ${userId} joined match room: ${matchId});
    });

    socket.on('leave-match', ({ matchId }) => {
      socket.leave(match:${matchId});
      matchRooms.get(matchId)?.delete(socket.id);
    });

    socket.on('disconnect', () => {
      userSockets.delete(userId);
      console.log(User disconnected: ${userId});
    });
  });

  return io;
};

// ===== Broadcasters (unchanged) =====

const broadcastScoreUpdate = (matchId, liveData) => {
  if (io) {
    io.to(match:${matchId}).emit('score-update', { matchId, liveData });
  }
};

const notifyUser = (userId, event, data) => {
  if (io) {
    const socketId = userSockets.get(userId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  }
};

const broadcastMatchLocked = (matchId) => {
  if (io) {
    io.to(match:${matchId}).emit('match-locked', { matchId });
  }
};

const broadcastLeaderboardUpdate = (matchId, type, entries) => {
  if (io) {
    io.to(match:${matchId}).emit('leaderboard-update', { matchId, type, entries });
  }
};

const broadcastTeamMatched = (userIds, matchId, teamData) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'team-matched', { matchId, ...teamData });
    });
  }
};

const broadcastPermanentTeamFormed = (userIds, teamData) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'permanent-team-formed', teamData);
    });
  }
};

const broadcastTeamBonusAwarded = (userIds, data) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'team-bonus-awarded', data);
    });
  }
};

const broadcastTeamLeaderboardUpdate = (data) => {
  if (io) {
    io.emit('team-leaderboard-update', data);
  }
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
