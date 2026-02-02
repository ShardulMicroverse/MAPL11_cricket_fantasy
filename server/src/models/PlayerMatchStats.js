const mongoose = require('mongoose');

const playerMatchStatsSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  // Batting stats
  batting: {
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    dots: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    dismissalType: { type: String, default: '' }, // bowled, lbw, caught, run out, stumped, etc.
    didBat: { type: Boolean, default: false }
  },
  // Bowling stats
  bowling: {
    overs: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    dots: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 },
    didBowl: { type: Boolean, default: false }
  },
  // Fielding stats
  fielding: {
    catches: { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 }, // direct hit
    runOutAssists: { type: Number, default: 0 } // assist
  },
  // Calculated fantasy points (auto-calculated or manually set)
  fantasyPoints: { type: Number, default: 0 },
  isManualPoints: { type: Boolean, default: false }, // true if points were manually set instead of calculated

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for unique player-match combination
playerMatchStatsSchema.index({ matchId: 1, playerId: 1 }, { unique: true });

// Update timestamp on save
playerMatchStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('PlayerMatchStats', playerMatchStatsSchema);
