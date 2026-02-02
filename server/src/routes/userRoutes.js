const express = require('express');
const { getProfile, updateProfile, getStats } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // All user routes require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/stats', getStats);

module.exports = router;
