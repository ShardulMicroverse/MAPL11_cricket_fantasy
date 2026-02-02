const mongoose = require('mongoose');

const teamFormationQueueSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true  // One entry per user globally
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['waiting', 'matched'],
    default: 'waiting'
  },
  assignedTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PermanentTeam'
  }
}, {
  timestamps: true
});

// Index for finding waiting users
teamFormationQueueSchema.index({ status: 1, joinedAt: 1 });

module.exports = mongoose.model('TeamFormationQueue', teamFormationQueueSchema);
