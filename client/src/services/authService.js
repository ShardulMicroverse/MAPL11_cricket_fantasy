import api from './api'

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data)
    if (response.data) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('refreshToken', response.data.refreshToken)
    }
    return response.data
  },

  async login(data) {
    const response = await api.post('/auth/login', data)
    if (response.data) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('refreshToken', response.data.refreshToken)
    }
    return response.data
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  },

  async getMe() {
    const response = await api.get('/auth/me')
    return response.data
  },

  isAuthenticated() {
    return !!localStorage.getItem('token')
  }
}
