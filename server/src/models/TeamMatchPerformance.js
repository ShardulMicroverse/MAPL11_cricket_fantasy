const mongoose = require('mongoose');

const memberPerformanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fantasyTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FantasyTeam'
  },
  fantasyPoints: { type: Number, default: 0 },
  predictionPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  bonusPoints: { type: Number, default: 0 }  // Bonus from team rank
}, { _id: false });

const teamMatchPerformanceSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PermanentTeam',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  memberPerformances: [memberPerformanceSchema],
  teamTotalPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    default: null
  },
  bonusAwarded: {
    type: Number,
    default: 0  // Bonus points awarded based on rank
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Compound index for unique team-match combination
teamMatchPerformanceSchema.index({ teamId: 1, matchId: 1 }, { unique: true });
teamMatchPerformanceSchema.index({ matchId: 1, rank: 1 });
teamMatchPerformanceSchema.index({ matchId: 1, teamTotalPoints: -1 });
teamMatchPerformanceSchema.index({ matchId: 1, status: 1 });

module.exports = mongoose.model('TeamMatchPerformance', teamMatchPerformanceSchema);
