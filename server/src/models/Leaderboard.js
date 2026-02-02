const mongoose = require('mongoose');

const leaderboardEntrySchema = {
  rank: { type: Number, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  entityName: { type: String, required: true },
  points: { type: Number, default: 0 },
  fantasyPoints: { type: Number, default: 0 },
  predictionPoints: { type: Number, default: 0 }
};

const leaderboardSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['individual_match', 'team_match', 'individual_overall', 'team_overall']
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null // null for overall leaderboards
  },
  entries: [leaderboardEntrySchema],
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
leaderboardSchema.index({ type: 1, matchId: 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
