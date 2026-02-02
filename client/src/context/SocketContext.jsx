import { createContext, useEffect, useState, useContext } from 'react'
import { io } from 'socket.io-client'
import { AuthContext } from './AuthContext'

export const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext)
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token')
      const newSocket = io(SOCKET_URL, {
        auth: { token }
      })

      newSocket.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
      }
    }
  }, [user])

  const joinMatch = (matchId) => {
    if (socket) {
      socket.emit('join-match', { matchId })
    }
  }

  const leaveMatch = (matchId) => {
    if (socket) {
      socket.emit('leave-match', { matchId })
    }
  }

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinMatch, leaveMatch }}>
      {children}
    </SocketContext.Provider>
  )
}
