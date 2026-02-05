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

// Get all teams for a match (after lock) - with pagination
router.get('/:matchId/all-teams', getAllFantasyTeamsForMatch);

// Get specific user's team for a match (after lock)
// Using 'odUserId' to match the frontend route param
router.get('/:matchId/teams/:odUserId', getUserFantasyTeam);

// Existing routes
router.get('/:matchId/validate', validateTeam); // Must come before /:matchId
router.get('/:matchId', getFantasyTeam);
router.post('/:matchId', createOrUpdateFantasyTeam);
router.delete('/:matchId', deleteFantasyTeam);

module.exports = router;
