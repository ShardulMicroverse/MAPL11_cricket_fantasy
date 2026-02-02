const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const matchRoutes = require('./matchRoutes');
const fantasyRoutes = require('./fantasyRoutes');
const predictionRoutes = require('./predictionRoutes');
const teamRoutes = require('./teamRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/fantasy', fantasyRoutes);
router.use('/predictions', predictionRoutes);
router.use('/teams', teamRoutes);
router.use('/leaderboards', leaderboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
