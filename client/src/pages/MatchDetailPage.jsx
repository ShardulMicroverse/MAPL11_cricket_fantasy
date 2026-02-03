import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { matchService } from '../services/matchService'
import { fantasyService } from '../services/fantasyService'
import { teamService } from '../services/teamService'
import { useMatchSocket } from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'
import TeamLineup from '../components/fantasy/TeamLineup'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function MatchDetailPage() {
  const { matchId } = useParams()
  const [match, setMatch] = useState(null)
  const [fantasyTeam, setFantasyTeam] = useState(null)
  const [permanentTeam, setPermanentTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLineup, setShowLineup] = useState(false)
  const { success, error: showError } = useToast()

  useMatchSocket(matchId, {
    onScoreUpdate: (data) => {
      if (data.matchId === matchId) {
        setMatch(prev => ({ ...prev, liveData: data.liveData }))
      }
    },
    onMatchLocked: (data) => {
      if (data.matchId === matchId) {
        setMatch(prev => ({ ...prev, isTeamSelectionOpen: false }))
      }
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, fantasyRes, teamRes] = await Promise.all([
          matchService.getMatch(matchId),
          fantasyService.getFantasyTeam(matchId),
          teamService.getMyPermanentTeam().catch(() => ({ data: null }))
        ])
        setMatch(matchRes.data)
        setFantasyTeam(fantasyRes.data)
        setPermanentTeam(teamRes.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [matchId])

  if (loading) return <Loading />
  if (!match) return <div className="empty-state-card"><p>Match not found</p></div>

  const isUpcoming = match.status === 'upcoming'
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'
  const canCreateTeam = isUpcoming && match.isTeamSelectionOpen

  // Check if team selection is locked (can view other teams)
  const now = new Date()
  const lockTime = new Date(match.lockTime)
  const isTeamLocked = !match.isTeamSelectionOpen || now >= lockTime || isLive || isCompleted

  return (
    <div className="match-detail-page">
      {/* Match Header */}
      <div className="match-header-card">
        <div className="match-header-teams">
          <div className="match-header-team">
            <div className="team-logo-large">{match.team1.shortName}</div>
            <span className="team-name-large">{match.team1.name}</span>
            {match.result?.team1Score && (
              <span className="match-score">{match.result.team1Score}</span>
            )}
          </div>

          <div className="match-header-vs">
            <span className={`match-status-badge ${match.status}`}>
              {match.status.toUpperCase()}
            </span>
          </div>

          <div className="match-header-team">
            <div className="team-logo-large">{match.team2.shortName}</div>
            <span className="team-name-large">{match.team2.name}</span>
            {match.result?.team2Score && (
              <span className="match-score">{match.result.team2Score}</span>
            )}
          </div>
        </div>

        {isLive && match.liveData && (
          <div className="live-score-box">
            <div className="live-score-value">
              {match.liveData.currentScore}
            </div>
            <div className="live-score-overs">
              {match.liveData.currentOver} overs
            </div>
          </div>
        )}

        <div className="match-meta">
          <span className="match-venue">{match.venue}</span>
        </div>
      </div>

      {/* Actions - Show when team selection is open */}
      {canCreateTeam && (
        <div className="card">
          <div className="card-body">
            <h3 className="section-title mb-3">Create Your Team</h3>

            {/* Tab-like buttons */}
            <div className="action-tabs">
              {fantasyTeam ? (
                <Link to={`/match/${matchId}/team-builder`} className="action-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Edit Fantasy Team
                </Link>
              ) : (
                <Link to={`/match/${matchId}/team-builder`} className="action-tab active">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Create Fantasy Team
                </Link>
              )}

              <Link to={`/match/${matchId}/predictions`} className="action-tab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Make Predictions
              </Link>
            </div>

            {/* Fantasy Team Status */}
            {fantasyTeam && (
              <div className="team-status-card">
                <div className="team-status-info">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>Fantasy team ready ({fantasyTeam.players?.length || 0} players)</span>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowLineup(true)}
                >
                  View
                </button>
              </div>
            )}

            {/* Permanent Team Section */}
            <div className="team-competition-section">
              <h4 className="subsection-title">Team Competition</h4>
              {permanentTeam ? (
                <Link to="/my-team" className="permanent-team-card">
                  <div className="permanent-team-info">
                    <div className="permanent-team-name">{permanentTeam.teamName}</div>
                    <div className="permanent-team-members">
                      {permanentTeam.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="permanent-team-avatar">
                          {getInitials(m.userId?.displayName)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="permanent-team-stats">
                    <span className="permanent-team-rank">#{permanentTeam.rank || '-'}</span>
                    <span className="permanent-team-points">{permanentTeam.stats?.totalPoints || 0} pts</span>
                  </div>
                  <svg className="permanent-team-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ) : (
                <div className="no-team-prompt">
                  <p>Join a permanent team to compete in team rankings!</p>
                  <Link to="/teams/join" className="btn btn-success btn-full">
                    Find Teammates
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Other Teams Button - Show after team is locked */}
      {isTeamLocked && (
        <div className="card">
          <div className="card-body">
            <h3 className="section-title mb-3">
              {isLive ? 'Match In Progress' : isCompleted ? 'Match Completed' : 'Teams Locked'}
            </h3>
            
            {/* Show user's team if they have one */}
            {fantasyTeam && (
              <div className="team-status-card mb-3">
                <div className="team-status-info">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>Your team: {fantasyTeam.fantasyPoints || 0} pts</span>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowLineup(true)}
                >
                  View
                </button>
              </div>
            )}

            {/* View Other Teams Button */}
            <Link to={`/match/${matchId}/teams`} className="view-teams-btn">
              <div className="view-teams-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div className="view-teams-text">
                  <span className="view-teams-title">View Others' Teams</span>
                  <span className="view-teams-desc">See what teams other players created</span>
                </div>
              </div>
              <svg className="view-teams-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>

            {/* Permanent Team Section (also show after lock) */}
            {permanentTeam && (
              <div className="team-competition-section mt-3">
                <h4 className="subsection-title">Your Team</h4>
                <Link to="/my-team" className="permanent-team-card">
                  <div className="permanent-team-info">
                    <div className="permanent-team-name">{permanentTeam.teamName}</div>
                    <div className="permanent-team-members">
                      {permanentTeam.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="permanent-team-avatar">
                          {getInitials(m.userId?.displayName)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="permanent-team-stats">
                    <span className="permanent-team-rank">#{permanentTeam.rank || '-'}</span>
                    <span className="permanent-team-points">{permanentTeam.stats?.totalPoints || 0} pts</span>
                  </div>
                  <svg className="permanent-team-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Lineup Modal */}
      {showLineup && fantasyTeam && (
        <TeamLineup
          players={fantasyTeam.players?.map(p => p.playerId) || []}
          captain={fantasyTeam.players?.find(p => p.isCaptain)?.playerId?._id}
          viceCaptain={fantasyTeam.players?.find(p => p.isViceCaptain)?.playerId?._id}
          onClose={() => setShowLineup(false)}
        />
      )}

      <style>{`
        .match-status-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .match-status-badge.live {
          background: rgba(248, 81, 73, 0.15);
          color: var(--live);
        }
        .match-status-badge.upcoming {
          background: rgba(46, 160, 67, 0.15);
          color: var(--success);
        }
        .match-status-badge.completed {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }
        .live-score-box {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .live-score-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--live);
        }
        .live-score-overs {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .subsection-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }
        .action-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        .action-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: var(--transition-fast);
        }
        .action-tab svg {
          width: 18px;
          height: 18px;
        }
        .action-tab:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        .action-tab.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .team-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(46, 160, 67, 0.1);
          border: 1px solid rgba(46, 160, 67, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }
        .team-status-card.mb-3 {
          margin-bottom: var(--spacing-md);
        }
        .team-status-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--success);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .team-status-info svg {
          width: 18px;
          height: 18px;
        }
        .team-competition-section {
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--border-primary);
        }
        .team-competition-section.mt-3 {
          margin-top: var(--spacing-md);
        }
        .permanent-team-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: var(--transition-fast);
        }
        .permanent-team-card:hover {
          border-color: var(--primary);
          background: var(--bg-secondary);
        }
        .permanent-team-info {
          flex: 1;
        }
        .permanent-team-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .permanent-team-members {
          display: flex;
          gap: -6px;
        }
        .permanent-team-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 600;
          margin-left: -6px;
          border: 2px solid var(--bg-tertiary);
        }
        .permanent-team-avatar:first-child {
          margin-left: 0;
        }
        .permanent-team-stats {
          text-align: right;
        }
        .permanent-team-rank {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--accent);
        }
        .permanent-team-points {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .permanent-team-arrow {
          width: 18px;
          height: 18px;
          color: var(--text-muted);
        }
        .no-team-prompt {
          text-align: center;
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .no-team-prompt p {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-md);
        }
        
        /* View Other Teams Button Styles */
        .view-teams-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: var(--transition-fast);
        }
        .view-teams-btn:hover {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15));
          border-color: var(--primary);
          transform: translateY(-1px);
        }
        .view-teams-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex: 1;
        }
        .view-teams-content svg {
          width: 32px;
          height: 32px;
          color: var(--primary);
          flex-shrink: 0;
        }
        .view-teams-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .view-teams-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .view-teams-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .view-teams-arrow {
          width: 20px;
          height: 20px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}