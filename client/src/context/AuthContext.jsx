import { createContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getMe()
          setUser(userData)
        } catch (error) {
          console.error('Auth init error:', error)
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password) => {
    const { user, token, refreshToken } = await authService.login({ email, password })
    setUser(user)
    return user
  }

  const register = async (email, password, displayName) => {
    const { user, token, refreshToken } = await authService.register({
      email,
      password,
      displayName
    })
    setUser(user)
    return user
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
