const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  externalPlayerId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  shortName: {
    type: String
  },
  team: {
    type: String,
    required: true // "IND", "AUS", etc.
  },
  role: {
    type: String,
    required: true,
    enum: ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper']
  },
  battingStyle: {
    type: String
  },
  bowlingStyle: {
    type: String
  },
  creditValue: {
    type: Number,
    required: true,
    min: 7.0,
    max: 11.0
  },
  image: {
    type: String
  },
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    runsScored: { type: Number, default: 0 },
    wicketsTaken: { type: Number, default: 0 },
    avgFantasyPoints: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
playerSchema.index({ team: 1 });
playerSchema.index({ role: 1 });
playerSchema.index({ externalPlayerId: 1 });

module.exports = mongoose.model('Player', playerSchema);
