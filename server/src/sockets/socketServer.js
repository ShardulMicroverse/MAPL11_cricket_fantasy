const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');

let io;
const userSockets = new Map(); // userId -> socketId
const matchRooms = new Map(); // matchId -> Set of socketIds

const initializeSocket = (httpServer) => {
  // Allow multiple origins for Socket.io
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

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

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
    console.log(`User connected: ${userId}`);

    // Join match room
    socket.on('join-match', ({ matchId }) => {
      socket.join(`match:${matchId}`);
      if (!matchRooms.has(matchId)) {
        matchRooms.set(matchId, new Set());
      }
      matchRooms.get(matchId).add(socket.id);
      console.log(`User ${userId} joined match room: ${matchId}`);
    });

    // Leave match room
    socket.on('leave-match', ({ matchId }) => {
      socket.leave(`match:${matchId}`);
      matchRooms.get(matchId)?.delete(socket.id);
    });

    // Disconnect
    socket.on('disconnect', () => {
      userSockets.delete(userId);
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

// Helper functions to broadcast events
const broadcastScoreUpdate = (matchId, liveData) => {
  if (io) {
    io.to(`match:${matchId}`).emit('score-update', { matchId, liveData });
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
    io.to(`match:${matchId}`).emit('match-locked', { matchId });
  }
};

const broadcastLeaderboardUpdate = (matchId, type, entries) => {
  if (io) {
    io.to(`match:${matchId}`).emit('leaderboard-update', { matchId, type, entries });
  }
};

const broadcastTeamMatched = (userIds, matchId, teamData) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'team-matched', { matchId, ...teamData });
    });
  }
};

// Broadcast permanent team formation
const broadcastPermanentTeamFormed = (userIds, teamData) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'permanent-team-formed', teamData);
    });
  }
};

// Broadcast team bonus awarded
const broadcastTeamBonusAwarded = (userIds, data) => {
  if (io) {
    userIds.forEach(userId => {
      notifyUser(userId.toString(), 'team-bonus-awarded', data);
    });
  }
};

// Broadcast team leaderboard update
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
