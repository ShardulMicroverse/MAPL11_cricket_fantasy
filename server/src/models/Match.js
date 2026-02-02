const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  externalMatchId: {
    type: String,
    required: true,
    unique: true
  },
  team1: {
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    logo: { type: String }
  },
  team2: {
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    logo: { type: String }
  },
  venue: {
    type: String,
    required: true
  },
  matchDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed'],
    default: 'upcoming'
  },
  lockTime: {
    type: Date,
    required: true
  },
  result: {
    winner: { type: String },
    summary: { type: String },
    team1Score: { type: String },
    team2Score: { type: String }
  },
  liveData: {
    currentInnings: { type: Number },
    currentScore: { type: String },
    currentOver: { type: String },
    battingTeam: { type: String },
    lastUpdated: { type: Date }
  },
  statsSnapshot: {
    totalScore: { type: Number },
    mostSixes: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      playerName: { type: String },
      count: { type: Number }
    },
    mostFours: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      playerName: { type: String },
      count: { type: Number }
    },
    mostWickets: {
      playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      playerName: { type: String },
      count: { type: Number }
    },
    powerplayScore: { type: Number },
    fiftiesCount: { type: Number }
  },
  isTeamSelectionOpen: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
matchSchema.index({ matchDate: 1 });
matchSchema.index({ status: 1 });
matchSchema.index({ externalMatchId: 1 });

module.exports = mongoose.model('Match', matchSchema);
