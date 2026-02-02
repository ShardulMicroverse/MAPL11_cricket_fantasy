const mongoose = require('mongoose');

const fantasyTeamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  players: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    isCaptain: {
      type: Boolean,
      default: false
    },
    isViceCaptain: {
      type: Boolean,
      default: false
    }
  }],
  totalCredits: {
    type: Number,
    required: true,
    max: 100
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  fantasyPoints: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number
  },
  lockedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one team per user per match
fantasyTeamSchema.index({ userId: 1, matchId: 1 }, { unique: true });
fantasyTeamSchema.index({ matchId: 1 });

// Validate team has exactly 11 players
fantasyTeamSchema.pre('save', function(next) {
  if (this.players.length !== 11) {
    return next(new Error('Fantasy team must have exactly 11 players'));
  }

  // Validate exactly one captain and one vice-captain
  const captains = this.players.filter(p => p.isCaptain).length;
  const viceCaptains = this.players.filter(p => p.isViceCaptain).length;

  if (captains !== 1) {
    return next(new Error('Fantasy team must have exactly one captain'));
  }
  if (viceCaptains !== 1) {
    return next(new Error('Fantasy team must have exactly one vice-captain'));
  }

  next();
});

module.exports = mongoose.model('FantasyTeam', fantasyTeamSchema);
