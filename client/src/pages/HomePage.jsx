import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { matchService } from '../services/matchService'
import { teamService } from '../services/teamService'
import Loading from '../components/common/Loading'
import MatchCard from '../components/match/MatchCard'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function HomePage() {
  const { user } = useAuth()
  const [liveMatches, setLiveMatches] = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [myTeam, setMyTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveRes, upcomingRes, teamRes] = await Promise.all([
          matchService.getLiveMatches(),
          matchService.getUpcomingMatches(),
          teamService.getMyPermanentTeam().catch(() => ({ data: null }))
        ])
        setLiveMatches(liveRes.data || [])
        setUpcomingMatches(upcomingRes.data || [])
        setMyTeam(teamRes.data || null)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <Loading fullScreen message="Loading matches" />
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="home-page">
      {/* Hero Welcome Section */}
      <div className="welcome-hero">
        <div className="welcome-content">
          <span className="welcome-greeting">{getGreeting()}</span>
          <h1 className="welcome-name">{user?.displayName || 'Champion'}</h1>
          <p className="welcome-subtitle">Ready to play fantasy cricket?</p>
        </div>
        <div className="welcome-avatar">
          <div className="avatar-large">
            {getInitials(user?.displayName)}
          </div>
        </div>
      </div>

      {/* Quick Stats - Simplified */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12a4 4 0 0 0 8 0"/>
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-value">{user?.stats?.matchesPlayed || 0}</span>
            <span className="stat-label">Matches</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <rect x="6" y="3" width="12" height="10" rx="2"/>
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-value">{user?.stats?.bestRank ? `#${user.stats.bestRank}` : '-'}</span>
            <span className="stat-label">Best Rank</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-value">{myTeam?.stats?.wins || 0}</span>
            <span className="stat-label">Wins</span>
          </div>
        </div>
      </div>

      {/* My Permanent Team Card */}
      <section className="team-section">
        {myTeam ? (
          <div className="team-card-display">
            <div className="team-card-header">
              <div className="team-info">
                <h3 className="team-name">{myTeam.teamName}</h3>
                <span className="team-rank">
                  {myTeam.stats?.totalPoints > 0 ? `Rank #${myTeam.rank || '-'}` : 'New Team'}
                </span>
              </div>
              <Link to="/my-team" className="team-view-btn">
                View
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
            {myTeam.fixture?.opponentName && (
              <div className="team-fixture-info">
                <span className="fixture-vs">VS</span>
                <span className="opponent-name">{myTeam.fixture.opponentName}</span>
                {myTeam.fixture.opponent && (
                  <span className="opponent-stats">
                    {myTeam.fixture.opponent.stats?.wins || 0}W - {myTeam.fixture.opponent.stats?.matchesPlayed || 0}M
                  </span>
                )}
              </div>
            )}
            <div className="team-members-row">
              {myTeam.members?.map((member, i) => (
                <div key={i} className="team-member-avatar" title={member.userId?.displayName || 'Teammate'}>
                  {getInitials(member.userId?.displayName)}
                </div>
              ))}
            </div>
            <div className="team-stats-row">
              <div className="team-stat">
                <span className="team-stat-value">{myTeam.stats?.totalPoints || 0}</span>
                <span className="team-stat-label">Total Pts</span>
              </div>
              <div className="team-stat">
                <span className="team-stat-value">{myTeam.stats?.matchesPlayed || 0}</span>
                <span className="team-stat-label">Matches</span>
              </div>
              <div className="team-stat">
                <span className="team-stat-value">{myTeam.stats?.wins || 0}</span>
                <span className="team-stat-label">Wins</span>
              </div>
              <div className="team-stat">
                <span className="team-stat-value">
                  {myTeam.stats?.matchesPlayed > 0
                    ? `${Math.round((myTeam.stats.wins / myTeam.stats.matchesPlayed) * 100)}%`
                    : '0%'
                  }
                </span>
                <span className="team-stat-label">Win Rate</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="team-card-empty">
            <div className="team-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h4>Join a Team!</h4>
            <p>Get matched with 3 other players for team competitions</p>
            <Link to="/teams/join" className="btn btn-primary">Join Random Team</Link>
          </div>
        )}
      </section>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <section className="matches-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="live-indicator">
                <span className="live-dot"></span>
                LIVE
              </span>
              Matches
            </h3>
          </div>
          <div className="matches-list">
            {liveMatches.map(match => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      <section className="matches-section">
        <div className="section-header">
          <h3 className="section-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="section-icon">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Upcoming Matches
          </h3>
          {upcomingMatches.length > 3 && (
            <Link to="/matches" className="see-all-link">
              See All
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          )}
        </div>

        {upcomingMatches.length > 0 ? (
          <div className="matches-list">
            {upcomingMatches.slice(0, 3).map(match => (
              <MatchCard key={match._id} match={match} />
            ))}
          </div>
        ) : (
          <div className="empty-state-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No upcoming matches scheduled</p>
            <span>Check back later for new matches</span>
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <Link to="/matches" className="action-card">
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 12a4 4 0 0 0 8 0"/>
              <circle cx="12" cy="6" r="1.5"/>
            </svg>
          </div>
          <span>All Matches</span>
        </Link>

        <Link to="/leaderboard" className="action-card">
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 21V11"/>
              <path d="M12 21V7"/>
              <path d="M16 21V13"/>
              <circle cx="12" cy="4" r="2"/>
            </svg>
          </div>
          <span>Leaderboard</span>
        </Link>

        <Link to="/profile" className="action-card">
          <div className="action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span>My Profile</span>
        </Link>
      </section>
    </div>
  )
}
