const express = require('express');
const {
  getFantasyTeam,
  createOrUpdateFantasyTeam,
  validateTeam,
  deleteFantasyTeam,
  getAllFantasyTeamsForMatch,
  getUserFantasyTeam
} = require('../controllers/fantasyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All fantasy routes require authentication

// Get all teams for a match (after lock)
router.get('/:matchId/all-teams', getAllFantasyTeamsForMatch);

// Get specific user's team for a match (after lock)
// Using 'odUserId' to match the frontend route param
router.get('/:matchId/team/:odUserId', getUserFantasyTeam);

// Existing routes
router.get('/:matchId', getFantasyTeam);
router.post('/:matchId', createOrUpdateFantasyTeam);
router.get('/:matchId/validate', validateTeam);
router.delete('/:matchId', deleteFantasyTeam);

module.exports = router;