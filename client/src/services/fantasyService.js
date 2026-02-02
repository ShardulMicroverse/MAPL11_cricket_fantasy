import api from './api'

export const fantasyService = {
  async getFantasyTeam(matchId) {
    return api.get(`/fantasy/${matchId}`)
  },

  async createOrUpdateTeam(matchId, data) {
    return api.post(`/fantasy/${matchId}`, data)
  },

  async validateTeam(matchId, playerIds) {
    return api.get(`/fantasy/${matchId}/validate`, {
      params: { players: playerIds.join(',') }
    })
  },

  async deleteTeam(matchId) {
    return api.delete(`/fantasy/${matchId}`)
  }
}
