import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { teamService } from '../services/teamService'
import { useAuth } from '../hooks/useAuth'
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

// Sort teams: primary = most wins, secondary = most total points
const sortAndRankTeams = (teams) => {
  return [...teams]
    .sort((a, b) => {
      const winsA = a.stats?.wins || 0
      const winsB = b.stats?.wins || 0
      if (winsB !== winsA) return winsB - winsA

      const pointsA = a.stats?.totalPoints || 0
      const pointsB = b.stats?.totalPoints || 0
      return pointsB - pointsA
    })
    .map((team, index) => ({ ...team, rank: index + 1 }))
}

export default function TeamLeaderboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [teams, setTeams] = useState([])
  const [myTeam, setMyTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    fetchData()
  }, [page])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [leaderboardRes, myTeamRes] = await Promise.all([
        teamService.getPermanentTeamLeaderboard(page, 20),
        teamService.getMyPermanentTeam().catch(() => ({ data: null }))
      ])

      // Apply client-side sorting: wins first, then total points
      const sorted = sortAndRankTeams(leaderboardRes.data.teams || [])
      setTeams(sorted)
      setPagination(leaderboardRes.data.pagination)

      // Recalculate rank for myTeam based on sorted order
      const rawMyTeam = myTeamRes.data
      if (rawMyTeam) {
        const myTeamSorted = sorted.find(t => t._id === rawMyTeam._id)
        setMyTeam(myTeamSorted ? { ...rawMyTeam, rank: myTeamSorted.rank } : rawMyTeam)
      } else {
        setMyTeam(null)
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRankStyle = (rank) => {
    if (rank === 1) return 'rank-gold'
    if (rank === 2) return 'rank-silver'
    if (rank === 3) return 'rank-bronze'
    return ''
  }

  const isMyTeam = (teamId) => {
    return myTeam?._id === teamId
  }

  return (
    <div className="team-leaderboard-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>Team Leaderboard</h2>
        <Link to="/teams" className="header-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </Link>
      </div>

      {/* Sorting criteria indicator */}
      <div className="sort-criteria-bar">
        <span className="sort-label">Ranked by:</span>
        <span className="sort-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Wins
        </span>
        <span className="sort-divider">then</span>
        <span className="sort-secondary">Total Points</span>
      </div>

      {/* My Team Position Card */}
      {myTeam && (
        <Link to="/my-team" className="my-team-position-card">
          <div className="my-team-label">Your Team</div>
          <div className="my-team-content">
            <div className="my-team-rank">
              <span>#{myTeam.rank || '-'}</span>
            </div>
            <div className="my-team-info">
              <div className="my-team-name">{myTeam.teamName}</div>
              <div className="my-team-stats">
                {myTeam.stats?.wins || 0}W | {myTeam.stats?.totalPoints || 0} pts | {myTeam.stats?.matchesPlayed || 0} matches
              </div>
            </div>
            <svg className="my-team-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </Link>
      )}

      {loading ? (
        <Loading message="Loading leaderboard" />
      ) : teams.length === 0 ? (
        <div className="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 21V11"/>
            <path d="M12 21V7"/>
            <path d="M16 21V13"/>
          </svg>
          <p>No team rankings yet</p>
          <span>Teams will be ranked after matches are completed</span>
        </div>
      ) : (
        <>
          <div className="leaderboard-list">
            {teams.map((team) => (
              <Link
                key={team._id}
                to={`/team/${team._id}`}
                className={`leaderboard-item ${isMyTeam(team._id) ? 'my-team-highlight' : ''}`}
              >
                <div className={`leaderboard-rank ${getRankStyle(team.rank)}`}>
                  {team.rank <= 3 ? (
                    <div className="rank-medal">
                      {team.rank === 1 && '🥇'}
                      {team.rank === 2 && '🥈'}
                      {team.rank === 3 && '🥉'}
                    </div>
                  ) : (
                    <span>#{team.rank}</span>
                  )}
                </div>
                <div className="leaderboard-team-info">
                  <div className="leaderboard-team-name">
                    {team.teamName}
                    {isMyTeam(team._id) && <span className="you-badge">You</span>}
                  </div>
                  <div className="leaderboard-team-members">
                    {team.members?.slice(0, 4).map((m, i) => (
                      <div key={i} className="leaderboard-avatar">
                        {getInitials(m.userId?.displayName)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="leaderboard-team-stats">
                  <div className="leaderboard-points">{team.stats?.totalPoints || 0}</div>
                  <div className="leaderboard-meta">
                    <span>{team.stats?.wins || 0}W</span>
                    <span>{team.stats?.matchesPlayed || 0}M</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Bonus Info */}
      <div className="bonus-info-card">
        <h4>Team Bonus Points</h4>
        <div className="bonus-grid">
          <div className="bonus-item">
            <span className="bonus-rank">1st</span>
            <span className="bonus-points">+50 pts</span>
          </div>
          <div className="bonus-item">
            <span className="bonus-rank">2nd</span>
            <span className="bonus-points">+30 pts</span>
          </div>
          <div className="bonus-item">
            <span className="bonus-rank">3rd</span>
            <span className="bonus-points">+20 pts</span>
          </div>
          <div className="bonus-item">
            <span className="bonus-rank">4-5th</span>
            <span className="bonus-points">+10 pts</span>
          </div>
        </div>
        <p className="bonus-note">Bonus points awarded to each team member after every match</p>
      </div>
    </div>
  )
}
