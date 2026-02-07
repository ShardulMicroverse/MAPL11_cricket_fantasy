const FantasyTeam = require('../models/FantasyTeam');
const Match = require('../models/Match');
const Player = require('../models/Player');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const permanentTeamService = require('../services/permanentTeamService');

// Team composition rules
const TEAM_RULES = {
  TOTAL_PLAYERS: 11,
  MAX_CREDITS: 100,
  ROLE_REQUIREMENTS: {
    'Wicket-Keeper': { min: 1, max: 11 },
    'Batsman': { min: 2, max: 11 },
    'All-Rounder': { min: 1, max: 11 },
    'Bowler': { min: 2, max: 11 }
  },
  MAX_PLAYERS_PER_TEAM: 7
};

// Validate team composition
const validateTeamComposition = async (playerIds, matchId) => {
  const players = await Player.find({ _id: { $in: playerIds } }).lean();

  if (players.length !== TEAM_RULES.TOTAL_PLAYERS) {
    throw new ApiError(400, `Team must have exactly ${TEAM_RULES.TOTAL_PLAYERS} players`);
  }

  // Check total credits
  const totalCredits = players.reduce((sum, p) => sum + p.creditValue, 0);
  if (totalCredits > TEAM_RULES.MAX_CREDITS) {
    throw new ApiError(400, `Total credits (${totalCredits}) exceeds maximum (${TEAM_RULES.MAX_CREDITS})`);
  }

  // Check role requirements
  const roleCounts = {};
  players.forEach(p => {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  });

  for (const [role, limits] of Object.entries(TEAM_RULES.ROLE_REQUIREMENTS)) {
    const count = roleCounts[role] || 0;
    if (count < limits.min) {
      throw new ApiError(400, `Team must have at least ${limits.min} ${role}(s)`);
    }
    if (count > limits.max) {
      throw new ApiError(400, `Team cannot have more than ${limits.max} ${role}(s)`);
    }
  }

  // Check max players per team
  const teamCounts = {};
  players.forEach(p => {
    teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
  });

  for (const [team, count] of Object.entries(teamCounts)) {
    if (count > TEAM_RULES.MAX_PLAYERS_PER_TEAM) {
      throw new ApiError(400, `Cannot select more than ${TEAM_RULES.MAX_PLAYERS_PER_TEAM} players from ${team}`);
    }
  }

  return { totalCredits, players };
};

// @desc    Get all fantasy teams for a match (after lock)
// @route   GET /api/fantasy/:matchId/all-teams
const getAllFantasyTeamsForMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user._id;

    // Check if match exists
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
      
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Check if team selection is locked
    const now = new Date();
    const isLocked = !match.isTeamSelectionOpen || now >= new Date(match.lockTime);
    
    if (!isLocked) {
      return next(new ApiError(403, 'Team selection is still open. You can view other teams after lock time.'));
    }

    const skip = (page - 1) * limit;

    // Get fantasy teams with user info, sorted by points (descending), then by creation time (ascending)
    const [teams, total] = await Promise.all([
      FantasyTeam.find({ matchId })
        .populate('userId', 'displayName avatar')
        .select('userId fantasyPoints createdAt')
        .sort({ fantasyPoints: -1, createdAt: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      FantasyTeam.countDocuments({ matchId })
    ]);

    // CRITICAL: Filter out teams where userId is null (deleted users)
    const validTeams = teams.filter(team => team.userId != null);

    // Handle case where no valid teams exist
    if (validTeams.length === 0) {
      return res.json({
        success: true,
        data: {
          teams: [],
          currentUser: null,
          match: {
            _id: match._id,
            team1: match.team1,
            team2: match.team2,
            status: match.status
          },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            pages: 0
          }
        }
      });
    }

    // Calculate rank for each team properly (handling ties with createdAt as tiebreaker)
    const teamsWithRank = await Promise.all(validTeams.map(async (team) => {
      // Count teams that rank higher:
      // - Teams with more points, OR
      // - Teams with same points but created earlier
      const higherRanked = await FantasyTeam.countDocuments({
        matchId,
        userId: { $ne: null }, // Only count teams with valid users
        $or: [
          { fantasyPoints: { $gt: team.fantasyPoints } },
          { 
            fantasyPoints: team.fantasyPoints,
            createdAt: { $lt: team.createdAt }
          }
        ]
      });
      
      return {
        ...team,
        rank: higherRanked + 1,
        isCurrentUser: team.userId._id.toString() === currentUserId.toString()
      };
    }));

    // Find current user's entry and rank
    let currentUserEntry = null;
    
    const currentUserTeam = await FantasyTeam.findOne({ matchId, userId: currentUserId })
      .populate('userId', 'displayName avatar')
      .select('userId fantasyPoints createdAt')
      .lean();
    
    if (currentUserTeam && currentUserTeam.userId) {
      // Count teams that rank higher than current user
      const higherRanked = await FantasyTeam.countDocuments({
        matchId,
        userId: { $ne: null }, // Only count teams with valid users
        $or: [
          { fantasyPoints: { $gt: currentUserTeam.fantasyPoints } },
          { 
            fantasyPoints: currentUserTeam.fantasyPoints,
            createdAt: { $lt: currentUserTeam.createdAt }
          }
        ]
      });
      const currentUserRank = higherRanked + 1;
      currentUserEntry = {
        ...currentUserTeam,
        rank: currentUserRank,
        isCurrentUser: true
      };
    }

    // Count only valid teams for total
    const validTotal = await FantasyTeam.countDocuments({ 
      matchId,
      userId: { $ne: null }
    });

    res.json({
      success: true,
      data: {
        teams: teamsWithRank,
        currentUser: currentUserEntry,
        match: {
          _id: match._id,
          team1: match.team1,
          team2: match.team2,
          status: match.status
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: validTotal,
          pages: Math.ceil(validTotal / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a specific user's fantasy team for a match (after lock)
// @route   GET /api/fantasy/:matchId/teams/:odUserId
const getUserFantasyTeam = async (req, res, next) => {
  try {
    const { matchId, odUserId } = req.params;
    // Handle both 'userId' and 'odUserId' param names for flexibility
    const targetUserId = odUserId || req.params.userId;

    // Check if match exists
    const match = await Match.findById(matchId)
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
      
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Check if team selection is locked (skip check if viewing own team)
    const isOwnTeam = targetUserId === req.user._id.toString();
    const now = new Date();
    const isLocked = !match.isTeamSelectionOpen || now >= new Date(match.lockTime);
    
    if (!isLocked && !isOwnTeam) {
      return next(new ApiError(403, 'Team selection is still open. You can view other teams after lock time.'));
    }

    // Get the target user info
    const targetUser = await User.findById(targetUserId).select('displayName avatar');
    if (!targetUser) {
      return next(new ApiError(404, 'User not found'));
    }

    // Get the user's fantasy team
    const fantasyTeam = await FantasyTeam.findOne({ matchId, userId: targetUserId })
      .populate('userId', 'displayName avatar')
      .populate('players.playerId');

    if (!fantasyTeam) {
      return next(new ApiError(404, 'Fantasy team not found for this user'));
    }

    // CRITICAL: Check if userId populated correctly
    if (!fantasyTeam.userId) {
      return next(new ApiError(404, 'User information not available for this team'));
    }

    // Calculate user's rank properly (with tiebreaker, only counting valid teams)
    const higherRanked = await FantasyTeam.countDocuments({
      matchId,
      userId: { $ne: null }, // Only count teams with valid users
      $or: [
        { fantasyPoints: { $gt: fantasyTeam.fantasyPoints } },
        { 
          fantasyPoints: fantasyTeam.fantasyPoints,
          createdAt: { $lt: fantasyTeam.createdAt }
        }
      ]
    });
    const rank = higherRanked + 1;
    const totalTeams = await FantasyTeam.countDocuments({ 
      matchId,
      userId: { $ne: null } 
    });

    res.json({
      success: true,
      data: {
        team: {
          ...fantasyTeam.toObject(),
          rank,
          totalTeams
        },
        match: {
          _id: match._id,
          team1: match.team1,
          team2: match.team2,
          status: match.status,
          matchDate: match.matchDate
        },
        user: targetUser
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's fantasy team for a match
// @route   GET /api/fantasy/:matchId
const getFantasyTeam = async (req, res, next) => {
  try {
    const fantasyTeam = await FantasyTeam.findOne({
      userId: req.user._id,
      matchId: req.params.matchId
    }).populate('players.playerId');

    res.json({
      success: true,
      data: fantasyTeam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update fantasy team
// @route   POST /api/fantasy/:matchId
const createOrUpdateFantasyTeam = async (req, res, next) => {
  try {
    const { players, captainId, viceCaptainId } = req.body;
    const matchId = req.params.matchId;

    // Check if match exists and team selection is open
    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    if (!match.isTeamSelectionOpen) {
      return next(new ApiError(400, 'Team selection is closed for this match'));
    }

    if (new Date() >= match.lockTime) {
      return next(new ApiError(400, 'Team selection deadline has passed'));
    }

    // Validate player IDs
    if (!players || players.length !== 11) {
      return next(new ApiError(400, 'Please select exactly 11 players'));
    }

    // Validate captain and vice captain
    if (!captainId || !viceCaptainId) {
      return next(new ApiError(400, 'Please select a captain and vice-captain'));
    }

    if (captainId === viceCaptainId) {
      return next(new ApiError(400, 'Captain and vice-captain must be different'));
    }

    if (!players.includes(captainId) || !players.includes(viceCaptainId)) {
      return next(new ApiError(400, 'Captain and vice-captain must be from selected players'));
    }

    // Validate team composition
    const { totalCredits } = await validateTeamComposition(players, matchId);

    // Build players array with captain/vice-captain flags
    const playersData = players.map(playerId => ({
      playerId,
      isCaptain: playerId === captainId,
      isViceCaptain: playerId === viceCaptainId
    }));

    // Check for existing team
    let fantasyTeam = await FantasyTeam.findOne({
      userId: req.user._id,
      matchId
    });

    if (fantasyTeam) {
      if (fantasyTeam.isLocked) {
        return next(new ApiError(400, 'Your team is locked and cannot be modified'));
      }

      // Update existing team
      fantasyTeam.players = playersData;
      fantasyTeam.totalCredits = totalCredits;
      await fantasyTeam.save();
    } else {
      // Create new team
      fantasyTeam = await FantasyTeam.create({
        userId: req.user._id,
        matchId,
        players: playersData,
        totalCredits
      });
    }

    await fantasyTeam.populate('players.playerId');

    // Register permanent team for this match if user has one
    try {
      const user = await User.findById(req.user._id);
      if (user && user.permanentTeamId) {
        await permanentTeamService.registerTeamForMatch(user.permanentTeamId, matchId);
      }
    } catch (teamErr) {
      // Don't fail the fantasy team creation if team registration fails
      console.error('Error registering permanent team for match:', teamErr);
    }

    res.status(fantasyTeam.isNew ? 201 : 200).json({
      success: true,
      data: fantasyTeam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate team composition (without saving)
// @route   GET /api/fantasy/:matchId/validate
const validateTeam = async (req, res, next) => {
  try {
    const { players } = req.query;

    if (!players) {
      return next(new ApiError(400, 'Players array is required'));
    }

    const playerIds = players.split(',');
    const { totalCredits } = await validateTeamComposition(playerIds, req.params.matchId);

    res.json({
      success: true,
      data: {
        valid: true,
        totalCredits,
        remainingCredits: TEAM_RULES.MAX_CREDITS - totalCredits
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      res.json({
        success: false,
        data: {
          valid: false,
          error: error.message
        }
      });
    } else {
      next(error);
    }
  }
};

// @desc    Delete fantasy team (before lock)
// @route   DELETE /api/fantasy/:matchId
const deleteFantasyTeam = async (req, res, next) => {
  try {
    const fantasyTeam = await FantasyTeam.findOne({
      userId: req.user._id,
      matchId: req.params.matchId
    });

    if (!fantasyTeam) {
      return next(new ApiError(404, 'Fantasy team not found'));
    }

    if (fantasyTeam.isLocked) {
      return next(new ApiError(400, 'Cannot delete locked team'));
    }

    await fantasyTeam.deleteOne();

    res.json({
      success: true,
      message: 'Fantasy team deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFantasyTeam,
  createOrUpdateFantasyTeam,
  validateTeam,
  deleteFantasyTeam,
  getAllFantasyTeamsForMatch,
  getUserFantasyTeam,
  TEAM_RULES
};
