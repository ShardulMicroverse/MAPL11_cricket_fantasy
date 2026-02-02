const mongoose = require('mongoose');

const permanentTeamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    maxlength: 30,
    trim: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member'
    }
  }],
  stats: {
    totalPoints: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },        // Times ranked #1
    podiums: { type: Number, default: 0 },     // Times in top 3
    topFives: { type: Number, default: 0 },    // Times in top 5
    bestRank: { type: Number, default: null },
    averageRank: { type: Number, default: null }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
permanentTeamSchema.index({ 'members.userId': 1 });
permanentTeamSchema.index({ 'stats.totalPoints': -1 });
permanentTeamSchema.index({ teamName: 'text' });
permanentTeamSchema.index({ isActive: 1 });

module.exports = mongoose.model('PermanentTeam', permanentTeamSchema);
