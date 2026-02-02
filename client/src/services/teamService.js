import api from './api'

export const teamService = {
  // ======== LEGACY PER-MATCH ROUTES (deprecated) ========
  async joinQueue(matchId) {
    return api.post(`/teams/${matchId}/join`)
  },

  async getQueueStatus(matchId) {
    return api.get(`/teams/${matchId}/status`)
  },

  async getMyTeam(matchId) {
    return api.get(`/teams/${matchId}/my-team`)
  },

  async leaveQueue(matchId) {
    return api.delete(`/teams/${matchId}/leave`)
  },

  async renameTeam(matchId, teamName) {
    return api.put(`/teams/${matchId}/rename`, { teamName })
  },

  // ======== PERMANENT TEAM ROUTES ========

  // Join permanent team formation queue
  async joinPermanentQueue() {
    return api.post('/teams/permanent/queue/join')
  },

  // Leave permanent team formation queue
  async leavePermanentQueue() {
    return api.delete('/teams/permanent/queue/leave')
  },

  // Get permanent queue status
  async getPermanentQueueStatus() {
    return api.get('/teams/permanent/queue/status')
  },

  // Get user's permanent team
  async getMyPermanentTeam() {
    return api.get('/teams/permanent/my-team')
  },

  // Get permanent team by ID
  async getPermanentTeamById(teamId) {
    return api.get(`/teams/permanent/${teamId}`)
  },

  // Rename permanent team (leader only)
  async renamePermanentTeam(teamId, teamName) {
    return api.put(`/teams/permanent/${teamId}/rename`, { teamName })
  },

  // Get all permanent teams (browse)
  async getAllPermanentTeams(page = 1, limit = 20, search = '') {
    return api.get('/teams/permanent', { params: { page, limit, search } })
  },

  // Get permanent team leaderboard
  async getPermanentTeamLeaderboard(page = 1, limit = 20) {
    return api.get('/teams/permanent/leaderboard', { params: { page, limit } })
  },

  // Get team match history
  async getTeamMatchHistory(teamId, page = 1, limit = 10) {
    return api.get(`/teams/permanent/${teamId}/history`, { params: { page, limit } })
  },

  // Register team for match participation
  async registerForMatch(matchId) {
    return api.post(`/teams/permanent/${matchId}/register`)
  }
}
