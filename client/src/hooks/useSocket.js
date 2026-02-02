import { useContext, useEffect } from 'react'
import { SocketContext } from '../context/SocketContext'

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export function useMatchSocket(matchId, handlers = {}) {
  const { socket, joinMatch, leaveMatch } = useSocket()

  useEffect(() => {
    if (!socket || !matchId) return

    joinMatch(matchId)

    // Set up event listeners
    if (handlers.onScoreUpdate) {
      socket.on('score-update', handlers.onScoreUpdate)
    }
    if (handlers.onTeamMatched) {
      socket.on('team-matched', handlers.onTeamMatched)
    }
    if (handlers.onMatchLocked) {
      socket.on('match-locked', handlers.onMatchLocked)
    }
    if (handlers.onLeaderboardUpdate) {
      socket.on('leaderboard-update', handlers.onLeaderboardUpdate)
    }

    return () => {
      leaveMatch(matchId)
      if (handlers.onScoreUpdate) {
        socket.off('score-update', handlers.onScoreUpdate)
      }
      if (handlers.onTeamMatched) {
        socket.off('team-matched', handlers.onTeamMatched)
      }
      if (handlers.onMatchLocked) {
        socket.off('match-locked', handlers.onMatchLocked)
      }
      if (handlers.onLeaderboardUpdate) {
        socket.off('leaderboard-update', handlers.onLeaderboardUpdate)
      }
    }
  }, [socket, matchId])
}
