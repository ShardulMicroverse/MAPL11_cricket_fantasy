const Prediction = require('../models/Prediction');
const Match = require('../models/Match');
const Player = require('../models/Player');
const ApiError = require('../utils/ApiError');

// @desc    Get user's predictions for a match
// @route   GET /api/predictions/:matchId
const getPredictions = async (req, res, next) => {
  try {
    const prediction = await Prediction.findOne({
      userId: req.user._id,
      matchId: req.params.matchId
    });

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit predictions
// @route   POST /api/predictions/:matchId
const submitPredictions = async (req, res, next) => {
  try {
    const { predictions } = req.body;
    const matchId = req.params.matchId;

    // Check if match exists
    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Check if match has started
    if (match.status !== 'upcoming') {
      return next(new ApiError(400, 'Predictions are closed for this match'));
    }

    if (new Date() >= match.lockTime) {
      return next(new ApiError(400, 'Prediction deadline has passed'));
    }

    // Validate predictions format
    const requiredFields = ['totalScore', 'mostSixes', 'mostFours', 'mostWickets', 'powerplayScore', 'fiftiesCount'];
    for (const field of requiredFields) {
      if (predictions[field] === undefined || predictions[field].answer === undefined) {
        return next(new ApiError(400, `Missing prediction for ${field}`));
      }
    }

    // Build predictions object
    const predictionData = {
      totalScore: { answer: predictions.totalScore.answer },
      mostSixes: {
        answer: predictions.mostSixes.answer,
        answerName: predictions.mostSixes.answerName
      },
      mostFours: {
        answer: predictions.mostFours.answer,
        answerName: predictions.mostFours.answerName
      },
      mostWickets: {
        answer: predictions.mostWickets.answer,
        answerName: predictions.mostWickets.answerName
      },
      powerplayScore: { answer: predictions.powerplayScore.answer },
      fiftiesCount: { answer: predictions.fiftiesCount.answer }
    };

    // Check for existing prediction
    let prediction = await Prediction.findOne({
      userId: req.user._id,
      matchId
    });

    if (prediction) {
      if (prediction.isLocked) {
        return next(new ApiError(400, 'Your predictions are locked'));
      }

      // Update existing prediction
      prediction.predictions = predictionData;
      await prediction.save();
    } else {
      // Create new prediction
      prediction = await Prediction.create({
        userId: req.user._id,
        matchId,
        predictions: predictionData
      });
    }

    res.status(prediction.isNew ? 201 : 200).json({
      success: true,
      data: prediction
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get prediction options (players for selection)
// @route   GET /api/predictions/:matchId/options
const getPredictionOptions = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.matchId).lean();

    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Trim team names to handle whitespace issues
    const team1ShortName = match.team1.shortName?.trim() || '';
    const team2ShortName = match.team2.shortName?.trim() || '';
    const team1Name = match.team1.name?.trim() || '';
    const team2Name = match.team2.name?.trim() || '';

    console.log('Match teams:', {
      team1: { name: team1Name, shortName: team1ShortName },
      team2: { name: team2Name, shortName: team2ShortName }
    });

    // Escape special regex characters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build search patterns for both teams (search by shortName AND full name)
    const team1Patterns = [
      new RegExp(`^${escapeRegex(team1ShortName)}$`, 'i'),
      new RegExp(escapeRegex(team1Name), 'i')
    ];
    const team2Patterns = [
      new RegExp(`^${escapeRegex(team2ShortName)}$`, 'i'),
      new RegExp(escapeRegex(team2Name), 'i')
    ];

    // Get players from both teams (case-insensitive, match shortName or full name)
    const players = await Player.find({
      $or: [
        { team: { $in: team1Patterns } },
        { team: { $in: team2Patterns } }
      ],
      isActive: true
    })
      .select('_id name shortName team role')
      .sort({ name: 1 })
      .lean();

    console.log('Found players:', players.length, 'Teams:', [...new Set(players.map(p => p.team))]);

    // If still no players, get ALL active players as fallback
    let allPlayers = players;
    if (players.length === 0) {
      console.log('No players found for teams, returning all active players');
      allPlayers = await Player.find({ isActive: true })
        .select('_id name shortName team role')
        .sort({ name: 1 })
        .lean();
    }

    // Group by team (case-insensitive, with trimming)
    const isTeam1 = (p) => {
      const team = p.team?.trim().toLowerCase() || '';
      return team === team1ShortName.toLowerCase() ||
             team.includes(team1Name.toLowerCase());
    };
    const isTeam2 = (p) => {
      const team = p.team?.trim().toLowerCase() || '';
      return team === team2ShortName.toLowerCase() ||
             team.includes(team2Name.toLowerCase());
    };

    const team1Players = allPlayers.filter(isTeam1);
    const team2Players = allPlayers.filter(isTeam2);

    res.json({
      success: true,
      data: {
        team1: {
          name: match.team1.name,
          shortName: match.team1.shortName,
          players: team1Players
        },
        team2: {
          name: match.team2.name,
          shortName: match.team2.shortName,
          players: team2Players
        },
        allPlayers: allPlayers
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPredictions,
  submitPredictions,
  getPredictionOptions
};
