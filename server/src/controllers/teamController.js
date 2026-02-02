const autoMatchService = require('../services/autoMatchService');
const permanentTeamService = require('../services/permanentTeamService');
const FantasyTeam = require('../models/FantasyTeam');
const Match = require('../models/Match');
const ApiError = require('../utils/ApiError');

// @desc    Join auto-match queue
// @route   POST /api/teams/:matchId/join
const joinQueue = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    // Check if match exists and is upcoming
    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    if (!match.isTeamSelectionOpen) {
      return next(new ApiError(400, 'Team selection is closed for this match'));
    }

    // Get user's fantasy team
    const fantasyTeam = await FantasyTeam.findOne({
      userId: req.user._id,
      matchId
    });

    if (!fantasyTeam) {
      return next(new ApiError(400, 'Please create your fantasy team first'));
    }

    const result = await autoMatchService.joinQueue(
      req.user._id,
      matchId,
      fantasyTeam._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get auto-match status
// @route   GET /api/teams/:matchId/status
const getQueueStatus = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const status = await autoMatchService.getQueueStatus(req.user._id, matchId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assigned team details
// @route   GET /api/teams/:matchId/my-team
const getMyTeam = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const team = await autoMatchService.getUserTeam(req.user._id, matchId);

    if (!team) {
      return res.json({
        success: true,
        data: null,
        message: 'Not yet matched to a team'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave queue (before matched)
// @route   DELETE /api/teams/:matchId/leave
const leaveQueue = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    await autoMatchService.leaveQueue(req.user._id, matchId);

    res.json({
      success: true,
      message: 'Left the queue successfully'
    });
  } catch (error) {
    if (error.message === 'Not in queue') {
      return next(new ApiError(400, error.message));
    }
    next(error);
  }
};

// @desc    Rename team
// @route   PUT /api/teams/:matchId/rename
const renameTeam = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { teamName } = req.body;

    if (!teamName || teamName.trim().length < 2) {
      return next(new ApiError(400, 'Team name must be at least 2 characters'));
    }

    if (teamName.trim().length > 30) {
      return next(new ApiError(400, 'Team name must be 30 characters or less'));
    }

    const team = await autoMatchService.renameTeam(
      req.user._id,
      matchId,
      teamName
    );

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    if (error.message === 'Team not found') {
      return next(new ApiError(404, error.message));
    }
    if (error.message === 'Cannot rename team after match has started') {
      return next(new ApiError(400, error.message));
    }
    next(error);
  }
};

// ========== PERMANENT TEAM ENDPOINTS ==========

// @desc    Join permanent team formation queue
// @route   POST /api/teams/permanent/queue/join
const joinPermanentTeamQueue = async (req, res, next) => {
  try {
    const result = await permanentTeamService.joinFormationQueue(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave permanent team formation queue
// @route   DELETE /api/teams/permanent/queue/leave
const leavePermanentTeamQueue = async (req, res, next) => {
  try {
    await permanentTeamService.leaveFormationQueue(req.user._id);
    res.json({ success: true, message: 'Left the queue successfully' });
  } catch (error) {
    if (error.message === 'Not in queue') {
      return next(new ApiError(400, error.message));
    }
    next(error);
  }
};

// @desc    Get permanent team queue status
// @route   GET /api/teams/permanent/queue/status
const getPermanentTeamQueueStatus = async (req, res, next) => {
  try {
    const status = await permanentTeamService.getQueueStatus(req.user._id);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's permanent team
// @route   GET /api/teams/permanent/my-team
const getMyPermanentTeam = async (req, res, next) => {
  try {
    const team = await permanentTeamService.getUserTeam(req.user._id);

    if (!team) {
      return res.json({
        success: true,
        data: null,
        message: 'Not yet in a permanent team'
      });
    }

    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

// @desc    Get permanent team by ID
// @route   GET /api/teams/permanent/:teamId
const getPermanentTeamById = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await permanentTeamService.getTeamById(teamId);

    if (!team) {
      return next(new ApiError(404, 'Team not found'));
    }

    res.json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

// @desc    Rename permanent team (leader only)
// @route   PUT /api/teams/permanent/:teamId/rename
const renamePermanentTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { teamName } = req.body;

    if (!teamName || teamName.trim().length < 2) {
      return next(new ApiError(400, 'Team name must be at least 2 characters'));
    }

    if (teamName.trim().length > 30) {
      return next(new ApiError(400, 'Team name must be 30 characters or less'));
    }

    const team = await permanentTeamService.renameTeam(teamId, req.user._id, teamName);
    res.json({ success: true, data: team });
  } catch (error) {
    if (error.message === 'Team not found') {
      return next(new ApiError(404, error.message));
    }
    if (error.message === 'Only the team leader can rename the team') {
      return next(new ApiError(403, error.message));
    }
    if (error.message === 'Team name already taken') {
      return next(new ApiError(400, error.message));
    }
    next(error);
  }
};

// @desc    Get all permanent teams (browse)
// @route   GET /api/teams/permanent
const getAllPermanentTeams = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const result = await permanentTeamService.getAllTeams(
      parseInt(page),
      parseInt(limit),
      search
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get permanent team leaderboard
// @route   GET /api/teams/permanent/leaderboard
const getPermanentTeamLeaderboard = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await permanentTeamService.getTeamLeaderboard(
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team match history
// @route   GET /api/teams/permanent/:teamId/history
const getTeamMatchHistory = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const result = await permanentTeamService.getTeamMatchHistory(
      teamId,
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Register team for match participation
// @route   POST /api/teams/permanent/:matchId/register
const registerTeamForMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    // Check if user has a permanent team
    const team = await permanentTeamService.getUserTeam(req.user._id);
    if (!team) {
      return next(new ApiError(400, 'You must be in a permanent team to participate'));
    }

    const result = await permanentTeamService.registerTeamForMatch(team._id, matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
