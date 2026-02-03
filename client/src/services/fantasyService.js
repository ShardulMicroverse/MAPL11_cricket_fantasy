import api from './api'

export const fantasyService = {
  // Existing methods...
  getFantasyTeam: (matchId) => api.get(`/fantasy/${matchId}`),
  
  createOrUpdateTeam: (matchId, teamData) => api.post(`/fantasy/${matchId}`, teamData),
  
  validateTeam: (matchId, playerIds) => 
    api.get(`/fantasy/${matchId}/validate?players=${playerIds.join(',')}`),
  
  deleteTeam: (matchId) => api.delete(`/fantasy/${matchId}`),

  // New methods for viewing other teams
  getAllTeamsForMatch: (matchId, page = 1, limit = 20) => 
    api.get(`/fantasy/${matchId}/all-teams?page=${page}&limit=${limit}`),
  
  getUserTeamForMatch: (matchId, userId) => 
    api.get(`/fantasy/${matchId}/team/${userId}`)
}