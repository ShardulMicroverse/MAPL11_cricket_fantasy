const express = require('express');
const {
  getPredictions,
  submitPredictions,
  getPredictionOptions
} = require('../controllers/predictionController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All prediction routes require authentication

router.get('/:matchId', getPredictions);
router.post('/:matchId', submitPredictions);
router.get('/:matchId/options', getPredictionOptions);

module.exports = router;
