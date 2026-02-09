/**
 * Admin Controller
 * Handles data synchronization from Cricket API
 */

const cricketApiService = require('../services/cricketApiService');
const scoringService = require('../services/scoringService');
const permanentTeamService = require('../services/permanentTeamService');
const Match = require('../models/Match');
const Player = require('../models/Player');
const FantasyTeam = require('../models/FantasyTeam');
const Prediction = require('../models/Prediction');
const PlayerMatchStats = require('../models/PlayerMatchStats');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Helper function to update user best ranks based on overall leaderboard position.
 * Called after match scoring updates user stats.totalFantasyPoints.
 */
const updateUserBestRanks = async () => {
  try {
    // Get all active users sorted by totalFantasyPoints (same as overall leaderboard)
    const users = await User.find({ isActive: true })
      .select('_id stats.totalFantasyPoints stats.bestRank')
      .sort({ 'stats.totalFantasyPoints': -1 })
      .lean();

    if (users.length === 0) return;

    // Assign overall leaderboard ranks and update bestRank where improved
    for (let i = 0; i < users.length; i++) {
      const rank = i + 1;
      const user = users[i];
      const currentBest = user.stats?.bestRank;

      // Only update if this rank is better (lower) or no bestRank exists
      if (!currentBest || rank < currentBest) {
        await User.findByIdAndUpdate(user._id, {
          'stats.bestRank': rank
        });
      }
    }
  } catch (err) {
    console.error('Error updating user best ranks:', err);
  }
};

/**
 * Check API status
 * GET /api/admin/api-status
 */
const checkApiStatus = async (req, res, next) => {
  try {
    const isConfigured = cricketApiService.isApiConfigured();

    if (!isConfigured) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Cricket API key not configured. Add CRICKET_API_KEY to your .env file.'
        }
      });
    }

    // Test API connection
    try {
      const series = await cricketApiService.getSeries();
      res.json({
        success: true,
        data: {
          configured: true,
          connected: true,
          seriesCount: series.length
        }
      });
    } catch (apiError) {
      const errorMsg = apiError.message || 'Unknown API error';
      console.error('API connection test failed:', errorMsg);
      res.json({
        success: true,
        data: {
          configured: true,
          connected: false,
          error: errorMsg
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get available series/tournaments from API
 * GET /api/admin/series
 * Query params:
 *   - search: optional search term to filter series by name
 */
const getAvailableSeries = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { search } = req.query;
    const series = await cricketApiService.getSeries();

    // Log all series names for debugging
    console.log('All series from API:', series.map(s => s.name));

    // If search is provided, filter by search term
    let filteredSeries = series;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSeries = series.filter(s =>
        s.name?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      count: filteredSeries.length,
      data: filteredSeries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current/live matches from API
 * GET /api/admin/live-matches
 */
const getLiveMatchesFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const matches = await cricketApiService.getCurrentMatches();

    // Filter for India matches if needed
    const indiaMatches = matches.filter(m =>
      m.teams?.some(t => t?.toLowerCase().includes('india')) ||
      m.name?.toLowerCase().includes('india')
    );

    res.json({
      success: true,
      count: indiaMatches.length,
      allMatchesCount: matches.length,
      data: indiaMatches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync matches from API to database
 * POST /api/admin/sync-matches
 */
const syncMatchesFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { seriesId, matchIds } = req.body;

    let matchesToSync = [];

    if (seriesId) {
      // Get matches from a specific series
      const seriesData = await cricketApiService.getSeriesMatches(seriesId);
      matchesToSync = seriesData.matchList || [];
    } else if (matchIds && matchIds.length > 0) {
      // Get specific matches by ID
      for (const id of matchIds) {
        const matchInfo = await cricketApiService.getMatchInfo(id);
        if (matchInfo) {
          matchesToSync.push(matchInfo);
        }
      }
    } else {
      // Get current matches
      matchesToSync = await cricketApiService.getCurrentMatches();
    }

    // Filter for India matches
    const indiaMatches = matchesToSync.filter(m =>
      m.teams?.some(t => t?.toLowerCase().includes('india')) ||
      m.name?.toLowerCase().includes('india')
    );

    const results = {
      synced: 0,
      updated: 0,
      errors: []
    };

    for (const apiMatch of indiaMatches) {
      try {
        const matchData = cricketApiService.transformMatchData(apiMatch);

        // Check if match already exists
        const existing = await Match.findOne({ externalMatchId: matchData.externalMatchId });

        if (existing) {
          // Update existing match
          await Match.findByIdAndUpdate(existing._id, matchData);
          results.updated++;
        } else {
          // Create new match
          await Match.create(matchData);
          results.synced++;
        }
      } catch (err) {
        results.errors.push({
          matchId: apiMatch.id,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalFound: indiaMatches.length,
        ...results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync squad/players from API
 * POST /api/admin/sync-players
 */
const syncPlayersFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { seriesId, teamNames } = req.body;

    if (!seriesId) {
      return next(new ApiError(400, 'Series ID is required'));
    }

    const squads = await cricketApiService.getSeriesSquad(seriesId);

    const results = {
      synced: 0,
      updated: 0,
      errors: []
    };

    for (const team of squads) {
      // Filter by team names if provided
      if (teamNames && teamNames.length > 0) {
        const teamName = team.teamName?.toLowerCase() || '';
        if (!teamNames.some(t => teamName.includes(t.toLowerCase()))) {
          continue;
        }
      }

      const teamShortName = team.teamSName || team.teamName?.substring(0, 3).toUpperCase() || 'UNK';

      for (const apiPlayer of (team.players || [])) {
        try {
          const playerData = cricketApiService.transformPlayerData(apiPlayer, teamShortName);

          // Check if player already exists
          const existing = await Player.findOne({ externalPlayerId: playerData.externalPlayerId });

          if (existing) {
            // Update existing player
            await Player.findByIdAndUpdate(existing._id, playerData);
            results.updated++;
          } else {
            // Create new player
            await Player.create(playerData);
            results.synced++;
          }
        } catch (err) {
          results.errors.push({
            playerId: apiPlayer.id,
            playerName: apiPlayer.name,
            error: err.message
          });
        }
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update live scores from API
 * POST /api/admin/update-live-scores
 */
const updateLiveScores = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    // Get all live matches from our database
    const liveMatches = await Match.find({ status: 'live' });

    const results = {
      updated: 0,
      errors: []
    };

    for (const match of liveMatches) {
      if (!match.externalMatchId) continue;

      try {
        // Fetch latest score from API
        const scorecard = await cricketApiService.getMatchScorecard(match.externalMatchId);

        if (scorecard) {
          // Extract live data
          const lastInnings = scorecard.scoreCard?.[scorecard.scoreCard.length - 1];

          const liveData = {
            currentInnings: scorecard.scoreCard?.length || 1,
            currentScore: lastInnings?.scoreDetails ?
              `${lastInnings.scoreDetails.runs}/${lastInnings.scoreDetails.wickets}` : '0/0',
            currentOver: lastInnings?.scoreDetails?.overs?.toString() || '0',
            battingTeam: lastInnings?.batTeamName || '',
            lastUpdated: new Date()
          };

          // Check if match is completed
          const matchInfo = await cricketApiService.getMatchInfo(match.externalMatchId);
          const isCompleted = matchInfo?.matchEnded;

          const updateData = { liveData };

          if (isCompleted) {
            updateData.status = 'completed';
            updateData.isTeamSelectionOpen = false;

            // Extract final stats
            const stats = cricketApiService.extractMatchStats(scorecard);
            if (stats) {
              updateData.statsSnapshot = stats;
            }

            // Set result
            updateData.result = {
              winner: matchInfo.matchWinner || '',
              summary: matchInfo.status || '',
              team1Score: scorecard.scoreCard?.[0]?.scoreDetails ?
                `${scorecard.scoreCard[0].scoreDetails.runs}/${scorecard.scoreCard[0].scoreDetails.wickets} (${scorecard.scoreCard[0].scoreDetails.overs})` : '',
              team2Score: scorecard.scoreCard?.[1]?.scoreDetails ?
                `${scorecard.scoreCard[1].scoreDetails.runs}/${scorecard.scoreCard[1].scoreDetails.wickets} (${scorecard.scoreCard[1].scoreDetails.overs})` : ''
            };
          }

          await Match.findByIdAndUpdate(match._id, updateData);
          results.updated++;
        }
      } catch (err) {
        results.errors.push({
          matchId: match._id,
          externalId: match.externalMatchId,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for players in API
 * GET /api/admin/search-players?q=virat
 */
const searchPlayersInApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { q } = req.query;
    if (!q || q.length < 2) {
      return next(new ApiError(400, 'Search query must be at least 2 characters'));
    }

    const players = await cricketApiService.searchPlayers(q);

    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a player from API search to database
 * POST /api/admin/add-player
 */
const addPlayerFromApi = async (req, res, next) => {
  try {
    const { playerId, team, creditValue } = req.body;

    if (!playerId) {
      return next(new ApiError(400, 'Player ID is required'));
    }

    // Get player info from API
    const playerInfo = await cricketApiService.getPlayerInfo(playerId);

    if (!playerInfo) {
      return next(new ApiError(404, 'Player not found in API'));
    }

    // Check if player already exists
    const existing = await Player.findOne({ externalPlayerId: playerId });
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'Player already exists in database'
      });
    }

    // Determine role
    let role = 'Batsman';
    if (playerInfo.role) {
      const roleStr = playerInfo.role.toLowerCase();
      if (roleStr.includes('keeper') || roleStr.includes('wk')) {
        role = 'Wicket-Keeper';
      } else if (roleStr.includes('allrounder') || roleStr.includes('all-rounder')) {
        role = 'All-Rounder';
      } else if (roleStr.includes('bowler')) {
        role = 'Bowler';
      }
    }

    // Create player
    const player = await Player.create({
      externalPlayerId: playerId,
      name: playerInfo.name,
      shortName: playerInfo.name?.split(' ').pop() || playerInfo.name,
      team: team || playerInfo.country || 'UNK',
      role: role,
      battingStyle: playerInfo.battingStyle || '',
      bowlingStyle: playerInfo.bowlingStyle || '',
      creditValue: creditValue || 8.5,
      image: playerInfo.playerImg || '',
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add players by searching team name
 * POST /api/admin/add-team-players
 */
const addTeamPlayers = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { teamName, teamShortName } = req.body;

    if (!teamName) {
      return next(new ApiError(400, 'Team name is required'));
    }

    // Search for players from this team
    const searchResults = await cricketApiService.searchPlayers(teamName);

    const results = {
      found: searchResults.length,
      added: 0,
      skipped: 0,
      errors: []
    };

    for (const apiPlayer of searchResults) {
      try {
        // Check if already exists
        const existing = await Player.findOne({ externalPlayerId: apiPlayer.id });
        if (existing) {
          results.skipped++;
          continue;
        }

        // Get detailed player info
        let playerInfo = apiPlayer;
        try {
          const detailedInfo = await cricketApiService.getPlayerInfo(apiPlayer.id);
          if (detailedInfo) {
            playerInfo = { ...apiPlayer, ...detailedInfo };
          }
        } catch (e) {
          // Use basic info if detailed fetch fails
        }

        // Determine role
        let role = 'Batsman';
        if (playerInfo.role) {
          const roleStr = playerInfo.role.toLowerCase();
          if (roleStr.includes('keeper') || roleStr.includes('wk')) {
            role = 'Wicket-Keeper';
          } else if (roleStr.includes('allrounder') || roleStr.includes('all-rounder')) {
            role = 'All-Rounder';
          } else if (roleStr.includes('bowler')) {
            role = 'Bowler';
          }
        }

        // Assign credit value based on role
        let creditValue = 8.0;
        if (role === 'Wicket-Keeper') creditValue = 8.5;
        else if (role === 'All-Rounder') creditValue = 9.0;
        else if (role === 'Bowler') creditValue = 8.0;
        else creditValue = 8.5;

        // Add some randomness
        creditValue += (Math.random() * 1.5 - 0.5);
        creditValue = Math.round(creditValue * 10) / 10;
        creditValue = Math.max(7.0, Math.min(11.0, creditValue));

        await Player.create({
          externalPlayerId: apiPlayer.id,
          name: playerInfo.name,
          shortName: playerInfo.name?.split(' ').pop() || playerInfo.name,
          team: teamShortName || teamName.substring(0, 3).toUpperCase(),
          role: role,
          battingStyle: playerInfo.battingStyle || '',
          bowlingStyle: playerInfo.bowlingStyle || '',
          creditValue: creditValue,
          image: playerInfo.playerImg || '',
          isActive: true
        });

        results.added++;
      } catch (err) {
        results.errors.push({ player: apiPlayer.name, error: err.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all players from database
 * GET /api/admin/players
 */
const getPlayersFromDb = async (req, res, next) => {
  try {
    const { team } = req.query;
    const filter = {};
    if (team) filter.team = team;

    const players = await Player.find(filter).sort({ team: 1, name: 1 });

    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a player
 * DELETE /api/admin/players/:id
 */
const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return next(new ApiError(404, 'Player not found'));
    }

    res.json({
      success: true,
      message: 'Player deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually create a match
 * POST /api/admin/create-match
 */
const createMatch = async (req, res, next) => {
  try {
    const {
      team1Name,
      team1ShortName,
      team2Name,
      team2ShortName,
      venue,
      matchDate,
      matchTime
    } = req.body;

    // Validate required fields
    if (!team1Name || !team2Name || !venue || !matchDate) {
      return next(new ApiError(400, 'Missing required fields: team1Name, team2Name, venue, matchDate'));
    }

    // Parse date and time
    const dateTime = matchTime
      ? new Date(`${matchDate}T${matchTime}:00`)
      : new Date(matchDate);

    // Generate a unique external ID for manual matches
    const externalMatchId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Trim all team names to avoid whitespace matching issues
    const t1Name = team1Name.trim();
    const t2Name = team2Name.trim();
    const t1Short = team1ShortName?.trim() || t1Name.substring(0, 3).toUpperCase();
    const t2Short = team2ShortName?.trim() || t2Name.substring(0, 3).toUpperCase();

    const matchData = {
      externalMatchId,
      team1: {
        name: t1Name,
        shortName: t1Short,
        logo: ''
      },
      team2: {
        name: t2Name,
        shortName: t2Short,
        logo: ''
      },
      venue: venue.trim(),
      matchDate: dateTime,
      startTime: dateTime,
      status: 'upcoming',
      lockTime: new Date(dateTime.getTime() - 15 * 60 * 1000), // 15 min before
      isTeamSelectionOpen: true
    };

    const match = await Match.create(matchData);

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update match status
 * PATCH /api/admin/matches/:id/status
 */
const updateMatchStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['upcoming', 'live', 'completed'].includes(status)) {
      return next(new ApiError(400, 'Invalid status. Must be: upcoming, live, or completed'));
    }

    const match = await Match.findByIdAndUpdate(
      req.params.id,
      {
        status,
        isTeamSelectionOpen: status === 'upcoming'
      },
      { new: true }
    );

    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all matches from database
 * GET /api/admin/matches
 */
const getMatchesFromDb = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const matches = await Match.find(filter).sort({ matchDate: 1 });

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a match
 * DELETE /api/admin/matches/:id
 */
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);

    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    res.json({
      success: true,
      message: 'Match deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate fantasy points for a match
 * POST /api/admin/calculate-points/:matchId
 *
 * This can work in two modes:
 * 1. Automatic: Fetches scorecard from API and calculates points
 * 2. Manual: Admin provides player points directly
 */
const calculateFantasyPoints = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerPoints, useApi } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Get all fantasy teams for this match
    const fantasyTeams = await FantasyTeam.find({ matchId })
      .populate('players.playerId', 'name externalPlayerId');

    if (fantasyTeams.length === 0) {
      return res.json({
        success: true,
        message: 'No fantasy teams found for this match',
        data: { teamsUpdated: 0 }
      });
    }

    let playerPointsMap = {};

    if (useApi && match.externalMatchId && cricketApiService.isApiConfigured()) {
      // Try to fetch from API
      try {
        const scorecard = await cricketApiService.getMatchScorecard(match.externalMatchId);

        if (scorecard && scorecard.scoreCard) {
          // Process batting stats
          for (const innings of scorecard.scoreCard) {
            for (const batsman of (innings.batsman || [])) {
              const stats = {
                batting: {
                  runs: batsman.runs || 0,
                  fours: batsman['4s'] || 0,
                  sixes: batsman['6s'] || 0,
                  ballsFaced: batsman.balls || 0,
                  isOut: batsman.dismissal !== 'not out'
                },
                bowling: {},
                fielding: {}
              };

              // Find player in our database by external ID or name
              const player = await Player.findOne({
                $or: [
                  { externalPlayerId: batsman.id },
                  { name: new RegExp(batsman.name?.split(' ').pop(), 'i') }
                ]
              });

              if (player) {
                const points = scoringService.calculatePlayerPoints(stats);
                playerPointsMap[player._id.toString()] = (playerPointsMap[player._id.toString()] || 0) + points;
              }
            }

            // Process bowling stats
            for (const bowler of (innings.bowler || [])) {
              const stats = {
                batting: {},
                bowling: {
                  wickets: bowler.wickets || 0,
                  overs: parseFloat(bowler.overs) || 0,
                  runsConceded: bowler.runs || 0,
                  maidens: bowler.maidens || 0
                },
                fielding: {}
              };

              const player = await Player.findOne({
                $or: [
                  { externalPlayerId: bowler.id },
                  { name: new RegExp(bowler.name?.split(' ').pop(), 'i') }
                ]
              });

              if (player) {
                const points = scoringService.calculatePlayerPoints(stats);
                playerPointsMap[player._id.toString()] = (playerPointsMap[player._id.toString()] || 0) + points;
              }
            }
          }
        }
      } catch (apiError) {
        console.error('API fetch failed:', apiError.message);
        // Fall back to manual points if provided
        if (!playerPoints) {
          return next(new ApiError(400, 'Could not fetch scorecard from API and no manual points provided'));
        }
      }
    }

    // If manual points provided, use them (can supplement or override API points)
    if (playerPoints && typeof playerPoints === 'object') {
      for (const [playerId, points] of Object.entries(playerPoints)) {
        playerPointsMap[playerId] = points;
      }
    }

    // If no points calculated, generate random points for testing
    if (Object.keys(playerPointsMap).length === 0) {
      // Generate test points for all players in fantasy teams
      const allPlayerIds = new Set();
      fantasyTeams.forEach(team => {
        team.players.forEach(p => allPlayerIds.add(p.playerId._id.toString()));
      });

      for (const playerId of allPlayerIds) {
        // Random points between 10-80 for testing
        playerPointsMap[playerId] = Math.floor(Math.random() * 70) + 10;
      }
    }

    // Update each fantasy team with calculated points
    const results = { teamsUpdated: 0, errors: [] };

    for (const team of fantasyTeams) {
      try {
        const totalPoints = scoringService.calculateFantasyTeamPoints(team, playerPointsMap);

        await FantasyTeam.findByIdAndUpdate(team._id, {
          fantasyPoints: totalPoints,
          isLocked: true
        });

        results.teamsUpdated++;
      } catch (err) {
        results.errors.push({
          teamId: team._id,
          userId: team.userId,
          error: err.message
        });
      }
    }

    // Also calculate prediction points if match stats are available
    if (match.statsSnapshot) {
      const predictions = await Prediction.find({ matchId });

      for (const prediction of predictions) {
        try {
          const { totalPoints: predPoints, results: predResults } = scoringService.calculatePredictionPoints(
            prediction.predictions,
            match.statsSnapshot
          );

          // Build updated predictions with results
          const updatedPredictions = { ...prediction.predictions.toObject() };

          // Update each prediction field with results
          if (predResults.totalScore) {
            updatedPredictions.totalScore = {
              ...updatedPredictions.totalScore,
              pointsEarned: predResults.totalScore.points,
              isCorrect: predResults.totalScore.isCorrect,
              actualValue: match.statsSnapshot.totalScore
            };
          }
          if (predResults.mostSixes) {
            updatedPredictions.mostSixes = {
              ...updatedPredictions.mostSixes,
              pointsEarned: predResults.mostSixes.points,
              isCorrect: predResults.mostSixes.isCorrect,
              actualValue: match.statsSnapshot.mostSixes?.playerId,
              actualPlayerName: match.statsSnapshot.mostSixes?.name || match.statsSnapshot.mostSixes?.playerName
            };
          }
          if (predResults.mostFours) {
            updatedPredictions.mostFours = {
              ...updatedPredictions.mostFours,
              pointsEarned: predResults.mostFours.points,
              isCorrect: predResults.mostFours.isCorrect,
              actualValue: match.statsSnapshot.mostFours?.playerId,
              actualPlayerName: match.statsSnapshot.mostFours?.name || match.statsSnapshot.mostFours?.playerName
            };
          }
          if (predResults.mostWickets) {
            updatedPredictions.mostWickets = {
              ...updatedPredictions.mostWickets,
              pointsEarned: predResults.mostWickets.points,
              isCorrect: predResults.mostWickets.isCorrect,
              actualValue: match.statsSnapshot.mostWickets?.playerId,
              actualPlayerName: match.statsSnapshot.mostWickets?.name || match.statsSnapshot.mostWickets?.playerName
            };
          }
          if (predResults.powerplayScore) {
            updatedPredictions.powerplayScore = {
              ...updatedPredictions.powerplayScore,
              pointsEarned: predResults.powerplayScore.points,
              isCorrect: predResults.powerplayScore.isCorrect,
              actualValue: match.statsSnapshot.powerplayScore
            };
          }
          if (predResults.fiftiesCount) {
            updatedPredictions.fiftiesCount = {
              ...updatedPredictions.fiftiesCount,
              pointsEarned: predResults.fiftiesCount.points,
              isCorrect: predResults.fiftiesCount.isCorrect,
              actualValue: match.statsSnapshot.fiftiesCount
            };
          }

          await Prediction.findByIdAndUpdate(prediction._id, {
            predictions: updatedPredictions,
            totalPredictionPoints: predPoints,
            isScored: true
          });
        } catch (err) {
          console.error('Error scoring prediction:', err);
        }
      }
    }

    // Update user stats (recalculate total points from all matches)
    const userIds = [...new Set(fantasyTeams.map(t => t.userId.toString()))];
    for (const odUserId of userIds) {
      try {
        // Get all fantasy teams for this user
        const userTeams = await FantasyTeam.find({ userId: odUserId });
        const totalFantasyPoints = userTeams.reduce((sum, t) => sum + (t.fantasyPoints || 0), 0);
        const matchesPlayed = userTeams.filter(t => t.fantasyPoints > 0).length;

        // Get all predictions for this user
        const userPredictions = await Prediction.find({ userId: odUserId, isScored: true });
        const totalPredictionPoints = userPredictions.reduce((sum, p) => sum + (p.totalPredictionPoints || 0), 0);

        await User.findByIdAndUpdate(odUserId, {
          'stats.totalFantasyPoints': totalFantasyPoints + totalPredictionPoints,
          'stats.matchesPlayed': matchesPlayed
        });
      } catch (err) {
        console.error('Error updating user stats:', err);
      }
    }

    // Calculate and update best ranks for this match
    await updateUserBestRanks();

    // Calculate team points and award bonuses for permanent teams
    try {
      await permanentTeamService.completeMatchTeamScoring(matchId);
    } catch (teamErr) {
      console.error('Error calculating team scores:', teamErr);
    }

    res.json({
      success: true,
      data: {
        ...results,
        playerPointsUsed: Object.keys(playerPointsMap).length,
        usersUpdated: userIds.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set player points manually for a match (for testing/manual scoring)
 * POST /api/admin/set-player-points/:matchId
 */
const setPlayerPoints = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerPoints } = req.body;

    if (!playerPoints || typeof playerPoints !== 'object') {
      return next(new ApiError(400, 'playerPoints object is required'));
    }

    // Forward to calculateFantasyPoints with manual points
    req.body = { playerPoints, useApi: false };
    return calculateFantasyPoints(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Get fantasy teams for a match (admin view)
 * GET /api/admin/fantasy-teams/:matchId
 */
const getFantasyTeamsForMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const teams = await FantasyTeam.find({ matchId })
      .populate('userId', 'displayName email')
      .populate('players.playerId', 'name shortName team role creditValue')
      .sort({ fantasyPoints: -1 });

    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// =====================================
// MANUAL SCORECARD MANAGEMENT
// =====================================

/**
 * Get players for a match (for scorecard entry)
 * GET /api/admin/scorecard/:matchId/players
 */
const getMatchPlayersForScorecard = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Get players from both teams - trim whitespace to avoid matching issues
    const team1ShortName = match.team1.shortName?.trim() || '';
    const team2ShortName = match.team2.shortName?.trim() || '';
    const team1Name = match.team1.name?.trim() || '';
    const team2Name = match.team2.name?.trim() || '';

    // Escape special regex characters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const players = await Player.find({
      $or: [
        { team: new RegExp(`^${escapeRegex(team1ShortName)}$`, 'i') },
        { team: new RegExp(`^${escapeRegex(team2ShortName)}$`, 'i') },
        { team: new RegExp(escapeRegex(team1Name), 'i') },
        { team: new RegExp(escapeRegex(team2Name), 'i') }
      ],
      isActive: true
    }).select('_id name shortName team role').sort({ team: 1, name: 1 });

    // Get existing stats for these players
    const existingStats = await PlayerMatchStats.find({ matchId })
      .populate('playerId', 'name shortName team role');

    // Create a map of existing stats
    const statsMap = {};
    existingStats.forEach(stat => {
      if (stat.playerId) {
        statsMap[stat.playerId._id.toString()] = stat;
      }
    });

    // Group players by team (with trimming)
    const team1Players = players.filter(p => {
      const team = p.team?.trim().toLowerCase() || '';
      return team === team1ShortName.toLowerCase() ||
             team.includes(team1Name.toLowerCase());
    });
    const team2Players = players.filter(p => {
      const team = p.team?.trim().toLowerCase() || '';
      return team === team2ShortName.toLowerCase() ||
             team.includes(team2Name.toLowerCase());
    });

    res.json({
      success: true,
      data: {
        match: {
          _id: match._id,
          team1: match.team1,
          team2: match.team2,
          status: match.status,
          statsSnapshot: match.statsSnapshot || null
        },
        team1Players: team1Players.map(p => ({
          ...p.toObject(),
          stats: statsMap[p._id.toString()] || null
        })),
        team2Players: team2Players.map(p => ({
          ...p.toObject(),
          stats: statsMap[p._id.toString()] || null
        })),
        allPlayers: players.map(p => ({
          ...p.toObject(),
          stats: statsMap[p._id.toString()] || null
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save/update player stats for a match (manual scorecard entry)
 * POST /api/admin/scorecard/:matchId/player/:playerId
 */
const savePlayerMatchStats = async (req, res, next) => {
  try {
    const { matchId, playerId } = req.params;
    const { batting, bowling, fielding, fantasyPoints, isManualPoints } = req.body;

    // Validate match exists
    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Validate player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return next(new ApiError(404, 'Player not found'));
    }

    // Prepare stats data
    const statsData = {
      matchId,
      playerId,
      batting: {
        runs: batting?.runs || 0,
        ballsFaced: batting?.ballsFaced || 0,
        fours: batting?.fours || 0,
        sixes: batting?.sixes || 0,
        dots: batting?.dots || 0,
        strikeRate: batting?.ballsFaced > 0
          ? ((batting?.runs || 0) / batting.ballsFaced * 100).toFixed(2)
          : 0,
        isOut: batting?.isOut || false,
        dismissalType: batting?.dismissalType || '',
        didBat: batting?.didBat || (batting?.runs > 0 || batting?.ballsFaced > 0)
      },
      bowling: {
        overs: bowling?.overs || 0,
        maidens: bowling?.maidens || 0,
        runsConceded: bowling?.runsConceded || 0,
        wickets: bowling?.wickets || 0,
        dots: bowling?.dots || 0,
        economy: bowling?.overs > 0
          ? ((bowling?.runsConceded || 0) / bowling.overs).toFixed(2)
          : 0,
        wides: bowling?.wides || 0,
        noBalls: bowling?.noBalls || 0,
        didBowl: bowling?.didBowl || (bowling?.overs > 0)
      },
      fielding: {
        catches: fielding?.catches || 0,
        stumpings: fielding?.stumpings || 0,
        runOuts: fielding?.runOuts || 0,
        runOutAssists: fielding?.runOutAssists || 0
      },
      isManualPoints: isManualPoints || false,
      updatedAt: new Date()
    };

    // Calculate fantasy points if not manually set
    if (isManualPoints && fantasyPoints !== undefined) {
      statsData.fantasyPoints = fantasyPoints;
    } else {
      // Auto-calculate points from stats
      const playerStats = {
        batting: {
          runs: statsData.batting.runs,
          fours: statsData.batting.fours,
          sixes: statsData.batting.sixes,
          ballsFaced: statsData.batting.ballsFaced,
          isOut: statsData.batting.isOut
        },
        bowling: {
          wickets: statsData.bowling.wickets,
          overs: statsData.bowling.overs,
          runsConceded: statsData.bowling.runsConceded,
          maidens: statsData.bowling.maidens
        },
        fielding: {
          catches: statsData.fielding.catches,
          stumpings: statsData.fielding.stumpings,
          runOutsDirect: statsData.fielding.runOuts,
          runOutsIndirect: statsData.fielding.runOutAssists
        }
      };
      statsData.fantasyPoints = scoringService.calculatePlayerPoints(playerStats);
    }

    // Upsert the stats
    const result = await PlayerMatchStats.findOneAndUpdate(
      { matchId, playerId },
      statsData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk save player stats for a match
 * POST /api/admin/scorecard/:matchId/bulk
 */
const bulkSavePlayerStats = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { players } = req.body;

    if (!players || !Array.isArray(players)) {
      return next(new ApiError(400, 'players array is required'));
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    const results = { saved: 0, errors: [] };

    for (const playerData of players) {
      try {
        const { playerId, batting, bowling, fielding, fantasyPoints, isManualPoints } = playerData;

        if (!playerId) {
          results.errors.push({ error: 'Missing playerId' });
          continue;
        }

        const statsData = {
          matchId,
          playerId,
          batting: {
            runs: batting?.runs || 0,
            ballsFaced: batting?.ballsFaced || 0,
            fours: batting?.fours || 0,
            sixes: batting?.sixes || 0,
            dots: batting?.dots || 0,
            strikeRate: batting?.ballsFaced > 0
              ? ((batting?.runs || 0) / batting.ballsFaced * 100).toFixed(2)
              : 0,
            isOut: batting?.isOut || false,
            dismissalType: batting?.dismissalType || '',
            didBat: batting?.didBat || (batting?.runs > 0 || batting?.ballsFaced > 0)
          },
          bowling: {
            overs: bowling?.overs || 0,
            maidens: bowling?.maidens || 0,
            runsConceded: bowling?.runsConceded || 0,
            wickets: bowling?.wickets || 0,
            dots: bowling?.dots || 0,
            economy: bowling?.overs > 0
              ? ((bowling?.runsConceded || 0) / bowling.overs).toFixed(2)
              : 0,
            wides: bowling?.wides || 0,
            noBalls: bowling?.noBalls || 0,
            didBowl: bowling?.didBowl || (bowling?.overs > 0)
          },
          fielding: {
            catches: fielding?.catches || 0,
            stumpings: fielding?.stumpings || 0,
            runOuts: fielding?.runOuts || 0,
            runOutAssists: fielding?.runOutAssists || 0
          },
          isManualPoints: isManualPoints || false,
          updatedAt: new Date()
        };

        // Calculate or use manual points
        if (isManualPoints && fantasyPoints !== undefined) {
          statsData.fantasyPoints = fantasyPoints;
        } else {
          const playerStats = {
            batting: statsData.batting,
            bowling: {
              wickets: statsData.bowling.wickets,
              overs: statsData.bowling.overs,
              runsConceded: statsData.bowling.runsConceded,
              maidens: statsData.bowling.maidens
            },
            fielding: {
              catches: statsData.fielding.catches,
              stumpings: statsData.fielding.stumpings,
              runOutsDirect: statsData.fielding.runOuts,
              runOutsIndirect: statsData.fielding.runOutAssists
            }
          };
          statsData.fantasyPoints = scoringService.calculatePlayerPoints(playerStats);
        }

        await PlayerMatchStats.findOneAndUpdate(
          { matchId, playerId },
          statsData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        results.saved++;
      } catch (err) {
        results.errors.push({ playerId: playerData.playerId, error: err.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all player stats for a match
 * GET /api/admin/scorecard/:matchId
 */
const getMatchScorecard = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    const stats = await PlayerMatchStats.find({ matchId })
      .populate('playerId', 'name shortName team role')
      .sort({ 'batting.runs': -1 });

    // Calculate match summary
    const summary = {
      totalRuns: 0,
      totalWickets: 0,
      totalFours: 0,
      totalSixes: 0,
      mostRuns: null,
      mostWickets: null,
      mostSixes: null,
      mostFours: null,
      fiftiesCount: 0
    };

    let maxRuns = 0, maxWickets = 0, maxSixes = 0, maxFours = 0;

    stats.forEach(s => {
      summary.totalRuns += s.batting.runs || 0;
      summary.totalWickets += s.bowling.wickets || 0;
      summary.totalFours += s.batting.fours || 0;
      summary.totalSixes += s.batting.sixes || 0;

      if (s.batting.runs >= 50) summary.fiftiesCount++;

      if (s.batting.runs > maxRuns) {
        maxRuns = s.batting.runs;
        summary.mostRuns = { playerId: s.playerId._id, name: s.playerId.name, value: s.batting.runs };
      }
      if (s.bowling.wickets > maxWickets) {
        maxWickets = s.bowling.wickets;
        summary.mostWickets = { playerId: s.playerId._id, name: s.playerId.name, value: s.bowling.wickets };
      }
      if (s.batting.sixes > maxSixes) {
        maxSixes = s.batting.sixes;
        summary.mostSixes = { playerId: s.playerId._id, name: s.playerId.name, value: s.batting.sixes };
      }
      if (s.batting.fours > maxFours) {
        maxFours = s.batting.fours;
        summary.mostFours = { playerId: s.playerId._id, name: s.playerId.name, value: s.batting.fours };
      }
    });

    res.json({
      success: true,
      data: {
        match: {
          _id: match._id,
          team1: match.team1,
          team2: match.team2,
          status: match.status,
          statsSnapshot: match.statsSnapshot
        },
        stats,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate and update fantasy points for all teams using scorecard stats
 * POST /api/admin/scorecard/:matchId/calculate-points
 */
const calculatePointsFromScorecard = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { updateMatchStats } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Get all player stats for this match
    const playerStats = await PlayerMatchStats.find({ matchId });

    if (playerStats.length === 0) {
      return next(new ApiError(400, 'No player stats found. Enter scorecard first.'));
    }

    // Create player points map from stats
    const playerPointsMap = {};
    playerStats.forEach(s => {
      playerPointsMap[s.playerId.toString()] = s.fantasyPoints || 0;
    });

    // Debug logging
    console.log('=== CALCULATE POINTS DEBUG ===');
    console.log('PlayerMatchStats count:', playerStats.length);
    console.log('PlayerPointsMap:', JSON.stringify(playerPointsMap, null, 2));

    // Update match stats snapshot if requested
    if (updateMatchStats) {
      const populatedStats = await PlayerMatchStats.find({ matchId })
        .populate('playerId', 'name');

      let totalScore = 0, mostSixes = null, mostFours = null, mostWickets = null;
      let powerplayScore = 0, fiftiesCount = 0;
      let maxSixes = 0, maxFours = 0, maxWickets = 0;

      populatedStats.forEach(s => {
        totalScore += s.batting.runs || 0;

        if (s.batting.runs >= 50) fiftiesCount++;

        if ((s.batting.sixes || 0) > maxSixes) {
          maxSixes = s.batting.sixes;
          mostSixes = { playerId: s.playerId._id, name: s.playerId.name, value: s.batting.sixes };
        }
        if ((s.batting.fours || 0) > maxFours) {
          maxFours = s.batting.fours;
          mostFours = { playerId: s.playerId._id, name: s.playerId.name, value: s.batting.fours };
        }
        if ((s.bowling.wickets || 0) > maxWickets) {
          maxWickets = s.bowling.wickets;
          mostWickets = { playerId: s.playerId._id, name: s.playerId.name, value: s.bowling.wickets };
        }
      });

      // Estimate powerplay score as ~30% of total (can be updated manually)
      powerplayScore = Math.round(totalScore * 0.3);

      match.statsSnapshot = {
        totalScore,
        mostSixes,
        mostFours,
        mostWickets,
        powerplayScore,
        fiftiesCount
      };
      await match.save();
    }

    // Get all fantasy teams for this match
    const fantasyTeams = await FantasyTeam.find({ matchId })
      .populate('players.playerId', 'name');

    console.log('Fantasy teams found:', fantasyTeams.length);

    if (fantasyTeams.length === 0) {
      return res.json({
        success: true,
        message: 'No fantasy teams found for this match',
        data: { teamsUpdated: 0, playerPointsUsed: Object.keys(playerPointsMap).length }
      });
    }

    const results = { teamsUpdated: 0, errors: [] };

    for (const team of fantasyTeams) {
      try {
        // Debug: log team players
        console.log('--- Fantasy Team:', team._id.toString(), '---');
        team.players.forEach((p, i) => {
          const resolvedId = p.playerId?._id ? p.playerId._id.toString() : p.playerId?.toString();
          const hasPoints = playerPointsMap[resolvedId] !== undefined;
          console.log(`  Player ${i}: id=${resolvedId}, inMap=${hasPoints}, points=${playerPointsMap[resolvedId] || 0}, cap=${p.isCaptain}, vc=${p.isViceCaptain}`);
        });

        const totalPoints = scoringService.calculateFantasyTeamPoints(team, playerPointsMap);
        console.log('  => Calculated totalPoints:', totalPoints);

        await FantasyTeam.findByIdAndUpdate(team._id, {
          fantasyPoints: totalPoints,
          isLocked: true
        });

        results.teamsUpdated++;
      } catch (err) {
        console.error('Error calculating team points:', err);
        results.errors.push({
          teamId: team._id,
          userId: team.userId,
          error: err.message
        });
      }
    }

    // Also calculate prediction points if match stats are available
    if (match.statsSnapshot) {
      const predictions = await Prediction.find({ matchId });

      for (const prediction of predictions) {
        try {
          const { totalPoints: predPoints, results: predResults } = scoringService.calculatePredictionPoints(
            prediction.predictions,
            match.statsSnapshot
          );

          // Build updated predictions with results
          const updatedPredictions = { ...prediction.predictions.toObject() };

          // Update each prediction field with results
          if (predResults.totalScore) {
            updatedPredictions.totalScore = {
              ...updatedPredictions.totalScore,
              pointsEarned: predResults.totalScore.points,
              isCorrect: predResults.totalScore.isCorrect,
              actualValue: match.statsSnapshot.totalScore
            };
          }
          if (predResults.mostSixes) {
            updatedPredictions.mostSixes = {
              ...updatedPredictions.mostSixes,
              pointsEarned: predResults.mostSixes.points,
              isCorrect: predResults.mostSixes.isCorrect,
              actualValue: match.statsSnapshot.mostSixes?.playerId,
              actualPlayerName: match.statsSnapshot.mostSixes?.name || match.statsSnapshot.mostSixes?.playerName
            };
          }
          if (predResults.mostFours) {
            updatedPredictions.mostFours = {
              ...updatedPredictions.mostFours,
              pointsEarned: predResults.mostFours.points,
              isCorrect: predResults.mostFours.isCorrect,
              actualValue: match.statsSnapshot.mostFours?.playerId,
              actualPlayerName: match.statsSnapshot.mostFours?.name || match.statsSnapshot.mostFours?.playerName
            };
          }
          if (predResults.mostWickets) {
            updatedPredictions.mostWickets = {
              ...updatedPredictions.mostWickets,
              pointsEarned: predResults.mostWickets.points,
              isCorrect: predResults.mostWickets.isCorrect,
              actualValue: match.statsSnapshot.mostWickets?.playerId,
              actualPlayerName: match.statsSnapshot.mostWickets?.name || match.statsSnapshot.mostWickets?.playerName
            };
          }
          if (predResults.powerplayScore) {
            updatedPredictions.powerplayScore = {
              ...updatedPredictions.powerplayScore,
              pointsEarned: predResults.powerplayScore.points,
              isCorrect: predResults.powerplayScore.isCorrect,
              actualValue: match.statsSnapshot.powerplayScore
            };
          }
          if (predResults.fiftiesCount) {
            updatedPredictions.fiftiesCount = {
              ...updatedPredictions.fiftiesCount,
              pointsEarned: predResults.fiftiesCount.points,
              isCorrect: predResults.fiftiesCount.isCorrect,
              actualValue: match.statsSnapshot.fiftiesCount
            };
          }

          await Prediction.findByIdAndUpdate(prediction._id, {
            predictions: updatedPredictions,
            totalPredictionPoints: predPoints,
            isScored: true
          });

          // Count correct predictions for user stats
          const correctCount = Object.values(predResults).filter(r => r.isCorrect).length;
          const totalPredictions = Object.keys(predResults).length;

          await User.findByIdAndUpdate(prediction.userId, {
            $inc: {
              'stats.predictionsCorrect': correctCount,
              'stats.predictionsTotal': totalPredictions
            }
          });
        } catch (err) {
          console.error('Error scoring prediction:', err);
        }
      }
    }

    // Update user stats (recalculate total points from all matches)
    const userIds = [...new Set(fantasyTeams.map(t => t.userId.toString()))];
    for (const odUserId of userIds) {
      try {
        // Get all fantasy teams for this user
        const userTeams = await FantasyTeam.find({ userId: odUserId });
        const totalFantasyPoints = userTeams.reduce((sum, t) => sum + (t.fantasyPoints || 0), 0);
        const matchesPlayed = userTeams.filter(t => t.fantasyPoints > 0).length;

        // Get all predictions for this user
        const userPredictions = await Prediction.find({ userId: odUserId, isScored: true });
        const totalPredictionPoints = userPredictions.reduce((sum, p) => sum + (p.totalPredictionPoints || 0), 0);

        await User.findByIdAndUpdate(odUserId, {
          'stats.totalFantasyPoints': totalFantasyPoints + totalPredictionPoints,
          'stats.matchesPlayed': matchesPlayed
        });
      } catch (err) {
        console.error('Error updating user stats:', err);
      }
    }

    // Calculate and update best ranks for this match
    await updateUserBestRanks();

    // Calculate team points and award bonuses for permanent teams
    try {
      await permanentTeamService.completeMatchTeamScoring(matchId);
    } catch (teamErr) {
      console.error('Error calculating team scores:', teamErr);
    }

    res.json({
      success: true,
      data: {
        ...results,
        playerPointsUsed: Object.keys(playerPointsMap).length,
        matchStatsUpdated: updateMatchStats || false,
        usersUpdated: userIds.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update match stats snapshot manually (for predictions)
 * POST /api/admin/matches/:matchId/stats
 */
const updateMatchStatsSnapshot = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { totalScore, mostSixes, mostFours, mostWickets, powerplayScore, fiftiesCount, result } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Update stats snapshot
    match.statsSnapshot = {
      totalScore: totalScore || match.statsSnapshot?.totalScore || 0,
      mostSixes: mostSixes || match.statsSnapshot?.mostSixes,
      mostFours: mostFours || match.statsSnapshot?.mostFours,
      mostWickets: mostWickets || match.statsSnapshot?.mostWickets,
      powerplayScore: powerplayScore || match.statsSnapshot?.powerplayScore || 0,
      fiftiesCount: fiftiesCount !== undefined ? fiftiesCount : (match.statsSnapshot?.fiftiesCount || 0)
    };

    // Update result if provided
    if (result) {
      match.result = {
        winner: result.winner || '',
        summary: result.summary || '',
        team1Score: result.team1Score || '',
        team2Score: result.team2Score || ''
      };
    }

    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a player manually (without API)
 * POST /api/admin/create-player
 */
const createPlayer = async (req, res, next) => {
  try {
    const { name, shortName, team, role, creditValue, battingStyle, bowlingStyle } = req.body;

    if (!name || !team || !role) {
      return next(new ApiError(400, 'name, team, and role are required'));
    }

    // Validate role
    const validRoles = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
    if (!validRoles.includes(role)) {
      return next(new ApiError(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`));
    }

    const player = await Player.create({
      name,
      shortName: shortName || name.split(' ').pop(),
      team,
      role,
      creditValue: creditValue || 8.5,
      battingStyle: battingStyle || '',
      bowlingStyle: bowlingStyle || '',
      isActive: true,
      externalPlayerId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a player
 * PUT /api/admin/players/:id
 */
const updatePlayer = async (req, res, next) => {
  try {
    const { name, shortName, team, role, creditValue, battingStyle, bowlingStyle, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (shortName !== undefined) updateData.shortName = shortName;
    if (team !== undefined) updateData.team = team;
    if (role !== undefined) updateData.role = role;
    if (creditValue !== undefined) updateData.creditValue = creditValue;
    if (battingStyle !== undefined) updateData.battingStyle = battingStyle;
    if (bowlingStyle !== undefined) updateData.bowlingStyle = bowlingStyle;
    if (isActive !== undefined) updateData.isActive = isActive;

    const player = await Player.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!player) {
      return next(new ApiError(404, 'Player not found'));
    }

    res.json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recalculate all user stats from fantasy teams, predictions, and team bonuses
 * POST /api/admin/recalculate-user-stats
 * Use this to sync user stats if they are out of sync
 */
const recalculateAllUserStats = async (req, res, next) => {
  try {
    const TeamMatchPerformance = require('../models/TeamMatchPerformance');
    const users = await User.find({ isActive: true });
    const results = { updated: 0, errors: [] };

    for (const user of users) {
      try {
        // Get all fantasy teams for this user
        const userTeams = await FantasyTeam.find({ userId: user._id }).populate('matchId', 'status');
        const totalFantasyPoints = userTeams.reduce((sum, t) => sum + (t.fantasyPoints || 0), 0);
        const matchesPlayed = userTeams.filter(t => t.fantasyPoints > 0).length;

        // Get all predictions for this user
        const userPredictions = await Prediction.find({ userId: user._id, isScored: true });
        const totalPredictionPoints = userPredictions.reduce((sum, p) => sum + (p.totalPredictionPoints || 0), 0);

        // Calculate team bonus points from TeamMatchPerformance records
        let totalTeamBonusPoints = 0;
        let teamMatchesPlayed = 0;
        const teamPerformances = await TeamMatchPerformance.find({
          'memberPerformances.userId': user._id,
          status: 'completed'
        });
        for (const perf of teamPerformances) {
          const memberPerf = perf.memberPerformances.find(
            mp => mp.userId.toString() === user._id.toString()
          );
          if (memberPerf) {
            totalTeamBonusPoints += memberPerf.bonusPoints || 0;
            teamMatchesPlayed++;
          }
        }

        await User.findByIdAndUpdate(user._id, {
          'stats.totalFantasyPoints': totalFantasyPoints + totalPredictionPoints + totalTeamBonusPoints,
          'stats.matchesPlayed': matchesPlayed,
          'stats.bestRank': null, // Reset - will be recalculated below
          'teamStats.teamBonusPointsEarned': totalTeamBonusPoints,
          'teamStats.teamMatchesPlayed': teamMatchesPlayed
        });

        results.updated++;
      } catch (err) {
        results.errors.push({ userId: user._id, error: err.message });
      }
    }

    // Recalculate best ranks based on overall leaderboard positions
    await updateUserBestRanks();

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recalculate all permanent team stats from TeamMatchPerformance records
 * POST /api/admin/recalculate-team-stats
 * Use this to sync team stats if they are out of sync
 */
const recalculateAllTeamStats = async (req, res, next) => {
  try {
    const PermanentTeam = require('../models/PermanentTeam');
    const TeamMatchPerformance = require('../models/TeamMatchPerformance');

    const teams = await PermanentTeam.find({ isActive: true });
    const results = { updated: 0, errors: [] };

    for (const team of teams) {
      try {
        // Get all completed team match performances
        const performances = await TeamMatchPerformance.find({
          teamId: team._id,
          status: 'completed'
        });

        // Calculate aggregate stats
        let totalPoints = 0;
        let matchesPlayed = 0;
        let wins = 0;
        let podiums = 0;
        let topFives = 0;
        let bestRank = null;
        let rankSum = 0;

        for (const perf of performances) {
          totalPoints += perf.teamTotalPoints || 0;
          totalPoints += (perf.bonusAwarded || 0) * 4; // Bonus is per member
          matchesPlayed++;

          if (perf.rank === 1) wins++;
          if (perf.rank <= 3) podiums++;
          if (perf.rank <= 5) topFives++;

          if (perf.rank) {
            rankSum += perf.rank;
            if (bestRank === null || perf.rank < bestRank) {
              bestRank = perf.rank;
            }
          }
        }

        const averageRank = matchesPlayed > 0
          ? Math.round((rankSum / matchesPlayed) * 10) / 10
          : null;

        await PermanentTeam.findByIdAndUpdate(team._id, {
          'stats.totalPoints': totalPoints,
          'stats.matchesPlayed': matchesPlayed,
          'stats.wins': wins,
          'stats.podiums': podiums,
          'stats.topFives': topFives,
          'stats.bestRank': bestRank,
          'stats.averageRank': averageRank
        });

        results.updated++;
      } catch (err) {
        results.errors.push({ teamId: team._id, teamName: team.teamName, error: err.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger team scoring for a specific match (for testing/fixing)
 * POST /api/admin/calculate-team-points/:matchId
 */
const calculateTeamPointsForMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Trigger the team scoring process
    await permanentTeamService.completeMatchTeamScoring(matchId);

    res.json({
      success: true,
      message: 'Team points calculated and bonuses awarded for match'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
