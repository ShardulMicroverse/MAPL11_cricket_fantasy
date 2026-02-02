const express = require('express');
const {
  // Legacy per-match team routes
  joinQueue,
  getQueueStatus,
  getMyTeam,
  leaveQueue,
  renameTeam,
  // Permanent team routes
  joinPermanentTeamQueue,
  leavePermanentTeamQueue,
  getPermanentTeamQueueStatus,
  getMyPermanentTeam,
  getPermanentTeamById,
  renamePermanentTeam,
  getAllPermanentTeams,
  getPermanentTeamLeaderboard,
  getTeamMatchHistory,
  registerTeamForMatch
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All team routes require authentication

// ========== PERMANENT TEAM ROUTES ==========

// Queue for permanent team formation
router.post('/permanent/queue/join', joinPermanentTeamQueue);
router.delete('/permanent/queue/leave', leavePermanentTeamQueue);
router.get('/permanent/queue/status', getPermanentTeamQueueStatus);

// Permanent team operations
router.get('/permanent/my-team', getMyPermanentTeam);
router.get('/permanent/leaderboard', getPermanentTeamLeaderboard);
router.get('/permanent', getAllPermanentTeams);
router.get('/permanent/:teamId', getPermanentTeamById);
router.put('/permanent/:teamId/rename', renamePermanentTeam);
router.get('/permanent/:teamId/history', getTeamMatchHistory);

// Register team for match participation
router.post('/permanent/:matchId/register', registerTeamForMatch);

// ========== LEGACY PER-MATCH ROUTES (deprecated) ==========
router.post('/:matchId/join', joinQueue);
router.get('/:matchId/status', getQueueStatus);
router.get('/:matchId/my-team', getMyTeam);
router.delete('/:matchId/leave', leaveQueue);
router.put('/:matchId/rename', renameTeam);

module.exports = router;
