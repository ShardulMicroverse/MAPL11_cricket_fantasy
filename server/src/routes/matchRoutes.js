const express = require('express');
const {
  getMatches,
  getUpcomingMatches,
  getLiveMatches,
  getCompletedMatches,
  getMatch,
  getMatchPlayers,
  getLiveScore
} = require('../controllers/matchController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes (no auth required for viewing matches)
router.get('/', getMatches);
router.get('/upcoming', getUpcomingMatches);
router.get('/live', getLiveMatches);
router.get('/completed', getCompletedMatches);
router.get('/:id', getMatch);
router.get('/:id/players', protect, getMatchPlayers);
router.get('/:id/live-score', getLiveScore);

module.exports = router;
