const mongoose = require('mongoose');

const autoMatchedTeamSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  teamName: {
    type: String,
    required: true
  },
  members: [{
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
    contributedPoints: {
      type: Number,
      default: 0
    }
  }],
  totalPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number
  },
  status: {
    type: String,
    enum: ['forming', 'locked', 'completed'],
    default: 'forming'
  }
}, {
  timestamps: true
});

// Indexes
autoMatchedTeamSchema.index({ matchId: 1 });
autoMatchedTeamSchema.index({ 'members.userId': 1 });

module.exports = mongoose.model('AutoMatchedTeam', autoMatchedTeamSchema);
