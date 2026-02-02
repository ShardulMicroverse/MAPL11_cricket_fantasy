const express = require('express');
const {
  getFantasyTeam,
  createOrUpdateFantasyTeam,
  validateTeam,
  deleteFantasyTeam
} = require('../controllers/fantasyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All fantasy routes require authentication

router.get('/:matchId', getFantasyTeam);
router.post('/:matchId', createOrUpdateFantasyTeam);
router.get('/:matchId/validate', validateTeam);
router.delete('/:matchId', deleteFantasyTeam);

module.exports = router;
