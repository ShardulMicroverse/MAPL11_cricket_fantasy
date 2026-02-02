import api from './api'

export const matchService = {
  async getMatches(status) {
    const params = status ? { status } : {}
    return api.get('/matches', { params })
  },

  async getUpcomingMatches() {
    return api.get('/matches/upcoming')
  },

  async getLiveMatches() {
    return api.get('/matches/live')
  },

  async getCompletedMatches() {
    return api.get('/matches/completed')
  },

  async getMatch(matchId) {
    return api.get(`/matches/${matchId}`)
  },

  async getMatchPlayers(matchId) {
    return api.get(`/matches/${matchId}/players`)
  },

  async getLiveScore(matchId) {
    return api.get(`/matches/${matchId}/live-score`)
  }
}
