const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true,
    minlength: 2,
    maxlength: 30
  },
  avatar: {
    type: String,
    default: 'default'
  },
  virtualPoints: {
    type: Number,
    default: 1000
  },
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    totalFantasyPoints: { type: Number, default: 0 },
    predictionsCorrect: { type: Number, default: 0 },
    predictionsTotal: { type: Number, default: 0 },
    bestRank: { type: Number, default: null }
  },
  permanentTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PermanentTeam',
    default: null
  },
  teamStats: {
    teamBonusPointsEarned: { type: Number, default: 0 },
    teamMatchesPlayed: { type: Number, default: 0 }
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ virtualPoints: -1 });
userSchema.index({ permanentTeamId: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

module.exports = mongoose.model('User', userSchema);
