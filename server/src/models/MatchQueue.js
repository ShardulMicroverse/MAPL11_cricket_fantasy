const mongoose = require('mongoose');

const matchQueueSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fantasyTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FantasyTeam',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'expired'],
    default: 'waiting'
  },
  assignedTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AutoMatchedTeam'
  }
}, {
  timestamps: true
});

// Indexes
matchQueueSchema.index({ matchId: 1, status: 1 });
matchQueueSchema.index({ joinedAt: 1 });
matchQueueSchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model('MatchQueue', matchQueueSchema);
