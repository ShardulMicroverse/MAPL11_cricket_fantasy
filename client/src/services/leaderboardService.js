import api from './api'

export const leaderboardService = {
  async getIndividualMatchLeaderboard(matchId, page = 1, limit = 20) {
    return api.get(`/leaderboards/individual/${matchId}`, {
      params: { page, limit }
    })
  },

  async getTeamMatchLeaderboard(matchId, page = 1, limit = 20) {
    return api.get(`/leaderboards/team/${matchId}`, {
      params: { page, limit }
    })
  },

  async getOverallIndividualLeaderboard(page = 1, limit = 20) {
    return api.get('/leaderboards/individual/overall', {
      params: { page, limit }
    })
  },

  async getMyRank(matchId) {
    return api.get(`/leaderboards/my-rank/${matchId}`)
  }
}
