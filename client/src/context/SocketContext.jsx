import { createContext, useEffect, useState, useContext } from 'react'
import { io } from 'socket.io-client'
import { AuthContext } from './AuthContext'

export const SocketContext = createContext(null)

// ⚠️ IMPORTANT: no localhost fallback in production
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // If user is not logged in → ensure socket is closed
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    // ✅ Create socket connection (mobile-safe)
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'], // 🔥 critical for mobile data
      extraHeaders: {
        Authorization: 'Bearer ${token}'
      }
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('⚠️ Socket error:', error.message)
    })

    setSocket(newSocket)

    // Cleanup on logout / unmount
    return () => {
      newSocket.disconnect()
    }
  }, [user])

  const joinMatch = (matchId) => {
    if (socket && isConnected) {
      socket.emit('join-match', { matchId })
    }
  }

  const leaveMatch = (matchId) => {
    if (socket && isConnected) {
      socket.emit('leave-match', { matchId })
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinMatch,
        leaveMatch
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
