import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { teamService } from '../services/teamService'
import { useAuth } from '../hooks/useAuth'
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

// Format date
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export default function TeamDetailPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success, error: showError } = useToast()

  const [team, setTeam] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPagination, setHistoryPagination] = useState(null)

  // Check if viewing "my-team"
  const isMyTeamRoute = !teamId

  useEffect(() => {
    fetchTeamData()
  }, [teamId])

  useEffect(() => {
    if (team?._id) {
      fetchHistory()
    }
  }, [team?._id, historyPage])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      let res

      if (isMyTeamRoute) {
        res = await teamService.getMyPermanentTeam()
      } else {
        res = await teamService.getPermanentTeamById(teamId)
      }

      if (res.data) {
        setTeam(res.data)
        setNewName(res.data.teamName)
      } else if (isMyTeamRoute) {
        // No team - redirect to join page
        navigate('/teams/join')
      }
    } catch (err) {
      console.error('Error fetching team:', err)
      if (isMyTeamRoute) {
        navigate('/teams/join')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    if (!team?._id) return
    try {
      const res = await teamService.getTeamMatchHistory(team._id, historyPage, 5)
      setHistory(res.data.performances || [])
      setHistoryPagination(res.data.pagination)
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  const handleRename = async () => {
    if (!newName.trim() || newName.trim().length < 2) {
      showError('Team name must be at least 2 characters')
      return
    }
    if (newName.trim().length > 30) {
      showError('Team name must be 30 characters or less')
      return
    }

    try {
      setSaving(true)
      await teamService.renamePermanentTeam(team._id, newName.trim())
      setTeam({ ...team, teamName: newName.trim() })
      setEditing(false)
      success('Team name updated!')
    } catch (err) {
      showError(err.message || 'Failed to rename team')
    } finally {
      setSaving(false)
    }
  }

  const isLeader = () => {
    return team?.members?.find(m =>
      m.userId?._id === user?._id && m.role === 'leader'
    )
  }

  const isMember = () => {
    return team?.members?.some(m => m.userId?._id === user?._id)
  }

  if (loading) {
    return <Loading fullScreen message="Loading team" />
  }

  if (!team) {
    return (
      <div className="team-detail-page">
        <div className="page-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2>Team Not Found</h2>
        </div>
        <div className="empty-state-card">
          <p>This team doesn't exist</p>
        </div>
      </div>
    )
  }

  return (
    <div className="team-detail-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>{isMember() ? 'My Team' : 'Team Details'}</h2>
      </div>

      {/* Team Header Card */}
      <div className="team-header-card">
        <div className="team-header-top">
          {editing ? (
            <div className="team-name-edit">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <div className="edit-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRename}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditing(false)
                    setNewName(team.teamName)
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="team-name-display">
              <h1>{team.teamName}</h1>
              {isLeader() && (
                <button className="edit-name-btn" onClick={() => setEditing(true)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="team-rank-badge">
            Rank #{team.rank || '-'}
          </div>
        </div>

        {/* Team Stats Grid */}
        <div className="team-stats-grid">
          <div className="team-stat-box">
            <span className="stat-number">{team.stats?.totalPoints || 0}</span>
            <span className="stat-label">Total Points</span>
          </div>
          <div className="team-stat-box">
            <span className="stat-number">{team.stats?.matchesPlayed || 0}</span>
            <span className="stat-label">Matches</span>
          </div>
          <div className="team-stat-box">
            <span className="stat-number">{team.stats?.wins || 0}</span>
            <span className="stat-label">Wins</span>
          </div>
          <div className="team-stat-box">
            <span className="stat-number">{team.stats?.podiums || 0}</span>
            <span className="stat-label">Top 3</span>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="team-members-card">
        <h3>Team Members</h3>
        <div className="members-list">
          {team.members?.map((member, i) => (
            <div key={i} className={`member-item ${member.userId?._id === user?._id ? 'is-you' : ''}`}>
              <div className="member-avatar">
                {getInitials(member.userId?.displayName)}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {member.userId?.displayName || 'Unknown Player'}
                  {member.userId?._id === user?._id && <span className="you-tag">You</span>}
                </div>
                <div className="member-role">
                  {member.role === 'leader' ? 'Team Leader' : 'Member'}
                </div>
              </div>
              <div className="member-points">
                {member.userId?.stats?.totalFantasyPoints || 0} pts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Match History */}
      <div className="match-history-card">
        <h3>Match History</h3>
        {history.length === 0 ? (
          <div className="history-empty">
            <p>No matches played yet</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {history.map((perf, i) => (
                <div key={i} className="history-item">
                  <div className="history-match">
                    <div className="history-teams">
                      {perf.matchId?.team1?.shortName} vs {perf.matchId?.team2?.shortName}
                    </div>
                    <div className="history-date">
                      {formatDate(perf.matchId?.date)}
                    </div>
                  </div>
                  <div className="history-result">
                    <div className={`history-rank ${perf.rank <= 3 ? 'top-rank' : ''}`}>
                      #{perf.rank || '-'}
                    </div>
                    <div className="history-points">
                      {perf.teamTotalPoints || 0} pts
                      {perf.bonusAwarded > 0 && (
                        <span className="bonus-earned">+{perf.bonusAwarded}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {historyPagination && historyPagination.pages > 1 && (
              <div className="history-pagination">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                >
                  Prev
                </button>
                <span>{historyPage} / {historyPagination.pages}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}
                  disabled={historyPage === historyPagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
