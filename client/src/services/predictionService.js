import api from './api'

export const predictionService = {
  async getPredictions(matchId) {
    return api.get(`/predictions/${matchId}`)
  },

  async submitPredictions(matchId, predictions) {
    return api.post(`/predictions/${matchId}`, { predictions })
  },

  async getPredictionOptions(matchId) {
    return api.get(`/predictions/${matchId}/options`)
  }
}
