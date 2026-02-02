import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamService } from '../services/teamService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function TeamJoinPage() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [queueStatus, setQueueStatus] = useState(null)
  const [team, setTeam] = useState(null)

  useEffect(() => {
    fetchQueueStatus()
  }, [])

  const fetchQueueStatus = async () => {
    try {
      setLoading(true)
      const res = await teamService.getPermanentQueueStatus()
      setQueueStatus(res.data)
      if (res.data.status === 'in_team' || res.data.status === 'matched') {
        setTeam(res.data.team)
      }
    } catch (err) {
      console.error('Error fetching queue status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinQueue = async () => {
    try {
      setJoining(true)
      const res = await teamService.joinPermanentQueue()

      if (res.data.matched || res.data.alreadyInTeam) {
        setTeam(res.data.team)
        setQueueStatus({ status: 'matched', team: res.data.team })
        success('You have been matched to a team!')
      } else if (res.data.inQueue || res.data.alreadyInQueue) {
        setQueueStatus({
          status: 'waiting',
          position: res.data.position,
          totalWaiting: res.data.totalWaiting || 1,
          needMore: res.data.needMore || 3
        })
        success('You have joined the queue!')
      }
    } catch (err) {
      showError(err.message || 'Failed to join queue')
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveQueue = async () => {
    try {
      setLeaving(true)
      await teamService.leavePermanentQueue()
      setQueueStatus({ status: 'not_joined' })
      success('You have left the queue')
    } catch (err) {
      showError(err.message || 'Failed to leave queue')
    } finally {
      setLeaving(false)
    }
  }

  if (loading) {
    return <Loading fullScreen message="Checking team status" />
  }

  // Already in a team - redirect or show team info
  if (queueStatus?.status === 'in_team' || queueStatus?.status === 'matched') {
    return (
      <div className="team-join-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2>My Team</h2>
        </div>

        <div className="team-matched-card">
          <div className="matched-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h3>You're in a team!</h3>
          <p className="team-matched-name">{team?.teamName}</p>

          <div className="matched-members">
            {team?.members?.map((member, i) => (
              <div key={i} className="matched-member">
                <div className="matched-member-avatar">
                  {getInitials(member.userId?.displayName)}
                </div>
                <span className="matched-member-name">
                  {member.userId?.displayName || 'Teammate'}
                  {member.role === 'leader' && <span className="leader-badge">Leader</span>}
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={() => navigate('/my-team')}
          >
            View Team Details
          </button>
        </div>
      </div>
    )
  }

  // In queue - waiting for more players
  if (queueStatus?.status === 'waiting') {
    return (
      <div className="team-join-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2>Finding Teammates</h2>
        </div>

        <div className="queue-waiting-card">
          <div className="queue-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>

          <h3>Looking for teammates...</h3>
          <p className="queue-info">
            You're #{queueStatus.position} in queue.
            Need {queueStatus.needMore || 3} more player{queueStatus.needMore !== 1 ? 's' : ''}.
          </p>

          <div className="queue-progress">
            <div className="queue-progress-bar">
              <div
                className="queue-progress-fill"
                style={{ width: `${((4 - (queueStatus.needMore || 3)) / 4) * 100}%` }}
              />
            </div>
            <span className="queue-progress-text">
              {4 - (queueStatus.needMore || 3)} / 4 players
            </span>
          </div>

          <button
            className="btn btn-secondary btn-full"
            onClick={handleLeaveQueue}
            disabled={leaving}
          >
            {leaving ? 'Leaving...' : 'Leave Queue'}
          </button>
        </div>

        <div className="queue-tips">
          <h4>While you wait...</h4>
          <ul>
            <li>Teams are formed automatically when 4 players join</li>
            <li>Once matched, your team stays together for all matches</li>
            <li>Top teams earn bonus points for their members</li>
          </ul>
        </div>
      </div>
    )
  }

  // Not in queue - show join option
  return (
    <div className="team-join-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>Join a Team</h2>
      </div>

      <div className="team-join-hero">
        <div className="hero-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h1>Find Your Team</h1>
        <p>Get matched with 3 other players and compete together!</p>
      </div>

      <div className="team-benefits">
        <h4>Why join a team?</h4>
        <div className="benefit-item">
          <div className="benefit-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <rect x="6" y="3" width="12" height="10" rx="2"/>
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Compete Together</strong>
            <span>Your team's combined points compete in team rankings</span>
          </div>
        </div>
        <div className="benefit-item">
          <div className="benefit-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Earn Bonus Points</strong>
            <span>Top teams win +50, +30, +20 bonus points per member</span>
          </div>
        </div>
        <div className="benefit-item">
          <div className="benefit-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div className="benefit-text">
            <strong>Permanent Team</strong>
            <span>Stay together for all matches throughout the league</span>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={handleJoinQueue}
        disabled={joining}
      >
        {joining ? 'Joining...' : 'Find Teammates'}
      </button>
    </div>
  )
}
