/**
 * Cricket API Service
 * Integrates with CricketData.org API for live scores and match data
 *
 * API Documentation: https://cricketdata.org/
 * Free tier: 100 requests/day
 */

const axios = require('axios');
const config = require('../config/environment');

const API_KEY = config.cricketApi.key;
const BASE_URL = 'https://api.cricapi.com/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  params: {
    apikey: API_KEY
  }
});

/**
 * Get list of current/recent matches
 * Endpoint: /currentMatches
 */
const getCurrentMatches = async () => {
  try {
    const response = await apiClient.get('/currentMatches');

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch matches');
    }

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching current matches:', error.message);
    throw error;
  }
};

/**
 * Get match info by ID
 * Endpoint: /match_info
 */
const getMatchInfo = async (matchId) => {
  try {
    const response = await apiClient.get('/match_info', {
      params: { id: matchId }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch match info');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching match info:', error.message);
    throw error;
  }
};

/**
 * Get live scorecard for a match
 * Endpoint: /match_scorecard
 */
const getMatchScorecard = async (matchId) => {
  try {
    const response = await apiClient.get('/match_scorecard', {
      params: { id: matchId }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch scorecard');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching scorecard:', error.message);
    throw error;
  }
};

/**
 * Get squad/players for a series
 * Endpoint: /series_squad
 */
const getSeriesSquad = async (seriesId) => {
  try {
    const response = await apiClient.get('/series_squad', {
      params: { id: seriesId }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch squad');
    }

    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching series squad:', error.message);
    throw error;
  }
};

/**
 * Get player info
 * Endpoint: /players_info
 */
const getPlayerInfo = async (playerId) => {
  try {
    const response = await apiClient.get('/players_info', {
      params: { id: playerId }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch player info');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching player info:', error.message);
    throw error;
  }
};

/**
 * Search for players by name
 * Endpoint: /players
 */
const searchPlayers = async (searchTerm) => {
  try {
    const response = await apiClient.get('/players', {
      params: { search: searchTerm }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to search players');
    }

    return response.data.data || [];
  } catch (error) {
    console.error('Error searching players:', error.message);
    throw error;
  }
};

/**
 * Get list of series (tournaments)
 * Endpoint: /series
 */
const getSeries = async () => {
  try {
    const response = await apiClient.get('/series');

    if (response.data.status !== 'success') {
      const errorMsg = response.data.info || response.data.reason || JSON.stringify(response.data);
      throw new Error(errorMsg);
    }

    return response.data.data || [];
  } catch (error) {
    const errorMsg = error.response?.data?.reason || error.response?.data?.info || error.message || 'Unknown error';
    console.error('Error fetching series:', errorMsg);
    throw new Error(errorMsg);
  }
};

/**
 * Get matches for a specific series
 * Endpoint: /series_info
 */
const getSeriesMatches = async (seriesId) => {
  try {
    const response = await apiClient.get('/series_info', {
      params: { id: seriesId }
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.info || 'Failed to fetch series matches');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching series matches:', error.message);
    throw error;
  }
};

/**
 * Transform API match data to our Match model format
 */
const transformMatchData = (apiMatch) => {
  return {
    externalMatchId: apiMatch.id,
    team1: {
      name: apiMatch.teamInfo?.[0]?.name || apiMatch.teams?.[0] || 'TBD',
      shortName: apiMatch.teamInfo?.[0]?.shortname || apiMatch.teams?.[0]?.substring(0, 3).toUpperCase() || 'TBD',
      logo: apiMatch.teamInfo?.[0]?.img || ''
    },
    team2: {
      name: apiMatch.teamInfo?.[1]?.name || apiMatch.teams?.[1] || 'TBD',
      shortName: apiMatch.teamInfo?.[1]?.shortname || apiMatch.teams?.[1]?.substring(0, 3).toUpperCase() || 'TBD',
      logo: apiMatch.teamInfo?.[1]?.img || ''
    },
    venue: apiMatch.venue || 'TBD',
    matchDate: new Date(apiMatch.dateTimeGMT || apiMatch.date),
    startTime: new Date(apiMatch.dateTimeGMT || apiMatch.date),
    status: mapMatchStatus(apiMatch.matchStarted, apiMatch.matchEnded),
    lockTime: new Date(new Date(apiMatch.dateTimeGMT || apiMatch.date).getTime() - 15 * 60 * 1000), // 15 min before
    isTeamSelectionOpen: !apiMatch.matchStarted,
    result: apiMatch.matchEnded ? {
      winner: apiMatch.matchWinner || '',
      summary: apiMatch.status || '',
      team1Score: apiMatch.score?.[0]?.r ? `${apiMatch.score[0].r}/${apiMatch.score[0].w} (${apiMatch.score[0].o})` : '',
      team2Score: apiMatch.score?.[1]?.r ? `${apiMatch.score[1].r}/${apiMatch.score[1].w} (${apiMatch.score[1].o})` : ''
    } : null,
    liveData: apiMatch.matchStarted && !apiMatch.matchEnded ? {
      currentScore: apiMatch.score?.[0] ? `${apiMatch.score[0].r}/${apiMatch.score[0].w}` : '0/0',
      currentOver: apiMatch.score?.[0]?.o?.toString() || '0',
      battingTeam: apiMatch.score?.[0]?.inning?.split(' ')?.[0] || '',
      lastUpdated: new Date()
    } : null
  };
};

/**
 * Map API match status to our status enum
 */
const mapMatchStatus = (matchStarted, matchEnded) => {
  if (matchEnded) return 'completed';
  if (matchStarted) return 'live';
  return 'upcoming';
};

/**
 * Transform API player data to our Player model format
 */
const transformPlayerData = (apiPlayer, teamShortName) => {
  // Determine role based on player data
  let role = 'Batsman';
  const name = apiPlayer.name?.toLowerCase() || '';

  if (apiPlayer.role) {
    if (apiPlayer.role.includes('WK') || apiPlayer.role.includes('Keeper')) {
      role = 'Wicket-Keeper';
    } else if (apiPlayer.role.includes('Allrounder') || apiPlayer.role.includes('All-rounder')) {
      role = 'All-Rounder';
    } else if (apiPlayer.role.includes('Bowler')) {
      role = 'Bowler';
    } else {
      role = 'Batsman';
    }
  }

  // Assign credit value based on typical player ratings (can be enhanced)
  let creditValue = 8.0;
  // Star players get higher credits
  const starPlayers = ['kohli', 'rohit', 'bumrah', 'babar', 'rizwan', 'shaheen', 'warner', 'starc', 'maxwell'];
  if (starPlayers.some(star => name.includes(star))) {
    creditValue = 10.0 + Math.random() * 0.5;
  } else if (role === 'Wicket-Keeper' || role === 'All-Rounder') {
    creditValue = 8.5 + Math.random() * 1.0;
  } else {
    creditValue = 7.5 + Math.random() * 1.5;
  }

  return {
    externalPlayerId: apiPlayer.id,
    name: apiPlayer.name,
    shortName: apiPlayer.name?.split(' ').pop() || apiPlayer.name,
    team: teamShortName,
    role: role,
    battingStyle: apiPlayer.battingStyle || '',
    bowlingStyle: apiPlayer.bowlingStyle || '',
    creditValue: Math.round(creditValue * 10) / 10, // Round to 1 decimal
    image: apiPlayer.playerImg || '',
    isActive: true,
    stats: {
      matchesPlayed: 0,
      runsScored: 0,
      wicketsTaken: 0,
      avgFantasyPoints: 0
    }
  };
};

/**
 * Extract match statistics for predictions evaluation
 */
const extractMatchStats = (scorecard) => {
  if (!scorecard) return null;

  let totalScore = 0;
  let powerplayScore = 0;
  let fiftiesCount = 0;
  let mostSixes = { playerId: null, playerName: '', count: 0 };
  let mostFours = { playerId: null, playerName: '', count: 0 };
  let mostWickets = { playerId: null, playerName: '', count: 0 };

  // Process batting scorecards
  scorecard.scoreCard?.forEach(innings => {
    totalScore += innings.scoreDetails?.runs || 0;

    // Estimate powerplay score (first 6 overs) - API might not have this directly
    // This is a rough estimate
    if (innings.scoreDetails?.overs >= 6) {
      powerplayScore += Math.floor((innings.scoreDetails.runs / innings.scoreDetails.overs) * 6);
    }

    // Process batsmen
    innings.batsman?.forEach(batsman => {
      // Count fifties
      if (batsman.runs >= 50) {
        fiftiesCount++;
      }

      // Track most sixes
      if (batsman['6s'] > mostSixes.count) {
        mostSixes = {
          playerId: batsman.id,
          playerName: batsman.name,
          count: batsman['6s']
        };
      }

      // Track most fours
      if (batsman['4s'] > mostFours.count) {
        mostFours = {
          playerId: batsman.id,
          playerName: batsman.name,
          count: batsman['4s']
        };
      }
    });

    // Process bowlers
    innings.bowler?.forEach(bowler => {
      if (bowler.wickets > mostWickets.count) {
        mostWickets = {
          playerId: bowler.id,
          playerName: bowler.name,
          count: bowler.wickets
        };
      }
    });
  });

  return {
    totalScore,
    powerplayScore,
    fiftiesCount,
    mostSixes,
    mostFours,
    mostWickets
  };
};

/**
 * Check if API key is configured
 */
const isApiConfigured = () => {
  return API_KEY && API_KEY !== 'your-cricket-api-key';
};

module.exports = {
  getCurrentMatches,
  getMatchInfo,
  getMatchScorecard,
  getSeriesSquad,
  getPlayerInfo,
  searchPlayers,
  getSeries,
  getSeriesMatches,
  transformMatchData,
  transformPlayerData,
  extractMatchStats,
  isApiConfigured
};
