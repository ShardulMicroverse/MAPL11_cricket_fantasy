const mongoose = require('mongoose');

const predictionAnswerSchema = {
  answer: mongoose.Schema.Types.Mixed, // Number for scores, ObjectId for players
  answerName: String, // Player name if applicable
  actualValue: mongoose.Schema.Types.Mixed,
  actualPlayerName: String,
  pointsEarned: { type: Number, default: 0 },
  isCorrect: { type: Boolean, default: null }
};

const predictionSchema = new mongoose.Schema({
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
  predictions: {
    totalScore: predictionAnswerSchema,
    mostSixes: predictionAnswerSchema,
    mostFours: predictionAnswerSchema,
    mostWickets: predictionAnswerSchema,
    powerplayScore: predictionAnswerSchema,
    fiftiesCount: predictionAnswerSchema
  },
  totalPredictionPoints: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isScored: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for unique predictions per user per match
predictionSchema.index({ userId: 1, matchId: 1 }, { unique: true });
predictionSchema.index({ matchId: 1 });

module.exports = mongoose.model('Prediction', predictionSchema);
