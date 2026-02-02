const express = require('express');
const {
  // API-based functions (optional)
  checkApiStatus,
  getAvailableSeries,
  getLiveMatchesFromApi,
  syncMatchesFromApi,
  syncPlayersFromApi,
  updateLiveScores,
  searchPlayersInApi,
  addPlayerFromApi,
  addTeamPlayers,

  // Player management
  getPlayersFromDb,
  deletePlayer,
  createPlayer,
  updatePlayer,

  // Match management
  createMatch,
  updateMatchStatus,
  getMatchesFromDb,
  deleteMatch,
  updateMatchStatsSnapshot,

  // Fantasy points
  calculateFantasyPoints,
  setPlayerPoints,
  getFantasyTeamsForMatch,
  recalculateAllUserStats,
  recalculateAllTeamStats,
  calculateTeamPointsForMatch,

  // Manual scorecard management
  getMatchPlayersForScorecard,
  savePlayerMatchStats,
  bulkSavePlayerStats,
  getMatchScorecard,
  calculatePointsFromScorecard
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication
// In production, you'd also add admin role check
router.use(protect);

// API Status (optional - works without API)
router.get('/api-status', checkApiStatus);

// Fetch from API (optional - only if API configured)
router.get('/series', getAvailableSeries);
router.get('/live-matches', getLiveMatchesFromApi);
router.get('/search-players', searchPlayersInApi);

// Sync to database (optional - only if API configured)
router.post('/sync-matches', syncMatchesFromApi);
router.post('/sync-players', syncPlayersFromApi);
router.post('/update-live-scores', updateLiveScores);

// Match management
router.get('/matches', getMatchesFromDb);
router.post('/create-match', createMatch);
router.patch('/matches/:id/status', updateMatchStatus);
router.post('/matches/:matchId/stats', updateMatchStatsSnapshot);
router.delete('/matches/:id', deleteMatch);

// Player management
router.get('/players', getPlayersFromDb);
router.post('/create-player', createPlayer);
router.put('/players/:id', updatePlayer);
router.post('/add-player', addPlayerFromApi);
router.post('/add-team-players', addTeamPlayers);
router.delete('/players/:id', deletePlayer);

// Manual Scorecard Entry
router.get('/scorecard/:matchId', getMatchScorecard);
router.get('/scorecard/:matchId/players', getMatchPlayersForScorecard);
router.post('/scorecard/:matchId/player/:playerId', savePlayerMatchStats);
router.post('/scorecard/:matchId/bulk', bulkSavePlayerStats);
router.post('/scorecard/:matchId/calculate-points', calculatePointsFromScorecard);

// Fantasy points calculation
router.get('/fantasy-teams/:matchId', getFantasyTeamsForMatch);
router.post('/calculate-points/:matchId', calculateFantasyPoints);
router.post('/set-player-points/:matchId', setPlayerPoints);
router.post('/recalculate-user-stats', recalculateAllUserStats);

// Team points calculation
router.post('/calculate-team-points/:matchId', calculateTeamPointsForMatch);
router.post('/recalculate-team-stats', recalculateAllTeamStats);

module.exports = router;
