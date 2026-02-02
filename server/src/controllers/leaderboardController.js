const Leaderboard = require('../models/Leaderboard');
const FantasyTeam = require('../models/FantasyTeam');
const AutoMatchedTeam = require('../models/AutoMatchedTeam');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// @desc    Get individual match leaderboard
// @route   GET /api/leaderboards/individual/:matchId
const getIndividualMatchLeaderboard = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get fantasy teams for this match, sorted by points
    const fantasyTeams = await FantasyTeam.find({ matchId })
      .populate('userId', 'displayName avatar')
      .sort({ fantasyPoints: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Get predictions for additional points
    const predictions = await Prediction.find({ matchId }).lean();
    const predictionMap = predictions.reduce((acc, p) => {
      acc[p.userId.toString()] = p.totalPredictionPoints;
      return acc;
    }, {});

    // Build leaderboard entries
    const entries = fantasyTeams.map((team, index) => {
      const predictionPoints = predictionMap[team.userId._id.toString()] || 0;
      return {
        rank: (page - 1) * limit + index + 1,
        userId: team.userId._id,
        displayName: team.userId.displayName,
        avatar: team.userId.avatar,
        fantasyPoints: team.fantasyPoints,
        predictionPoints,
        totalPoints: team.fantasyPoints + predictionPoints
      };
    });

    // Sort by total points
    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
      entry.rank = (page - 1) * limit + index + 1;
    });

    const total = await FantasyTeam.countDocuments({ matchId });

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team match leaderboard
// @route   GET /api/leaderboards/team/:matchId
const getTeamMatchLeaderboard = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const teams = await AutoMatchedTeam.find({ matchId })
      .populate('members.userId', 'displayName avatar')
      .sort({ totalPoints: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const entries = teams.map((team, index) => ({
      rank: (page - 1) * limit + index + 1,
      teamId: team._id,
      teamName: team.teamName,
      members: team.members.map(m => ({
        userId: m.userId._id,
        displayName: m.userId.displayName,
        avatar: m.userId.avatar,
        contributedPoints: m.contributedPoints
      })),
      totalPoints: team.totalPoints
    }));

    const total = await AutoMatchedTeam.countDocuments({ matchId });

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall individual leaderboard
// @route   GET /api/leaderboards/individual/overall
const getOverallIndividualLeaderboard = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const users = await User.find({ isActive: true })
      .select('displayName avatar virtualPoints stats')
      .sort({ 'stats.totalFantasyPoints': -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const entries = users.map((user, index) => ({
      rank: (page - 1) * limit + index + 1,
      userId: user._id,
      displayName: user.displayName,
      avatar: user.avatar,
      totalPoints: user.stats.totalFantasyPoints,
      matchesPlayed: user.stats.matchesPlayed,
      virtualPoints: user.virtualPoints
    }));

    const total = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's rank for a match
// @route   GET /api/leaderboards/my-rank/:matchId
const getMyRank = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    // Get user's fantasy team
    const myTeam = await FantasyTeam.findOne({
      userId: req.user._id,
      matchId
    }).lean();

    if (!myTeam) {
      return res.json({
        success: true,
        data: { rank: null, message: 'No team for this match' }
      });
    }

    // Get prediction points
    const myPrediction = await Prediction.findOne({
      userId: req.user._id,
      matchId
    }).lean();

    const totalPoints = myTeam.fantasyPoints + (myPrediction?.totalPredictionPoints || 0);

    // Count users with more points
    const higherRanked = await FantasyTeam.countDocuments({
      matchId,
      fantasyPoints: { $gt: myTeam.fantasyPoints }
    });

    const rank = higherRanked + 1;
    const totalParticipants = await FantasyTeam.countDocuments({ matchId });

    res.json({
      success: true,
      data: {
        rank,
        totalParticipants,
        fantasyPoints: myTeam.fantasyPoints,
        predictionPoints: myPrediction?.totalPredictionPoints || 0,
        totalPoints
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIndividualMatchLeaderboard,
  getTeamMatchLeaderboard,
  getOverallIndividualLeaderboard,
  getMyRank
};
