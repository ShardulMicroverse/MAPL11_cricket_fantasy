import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fantasyService } from '../services/fantasyService'
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

export default function ViewOtherTeamsPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    fetchTeams()
  }, [matchId, page])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fantasyService.getAllTeamsForMatch(matchId, page, limit)
      setData(response.data)
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError(err.response?.data?.message || 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (userId) => {
    navigate(`/match/${matchId}/teams/${userId}`)
  }

  if (loading && !data) return <Loading />
  
  if (error) {
    return (
      <div className="view-teams-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="page-title">View Teams</h1>
        </div>
        <div className="error-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
        <style>{styles}</style>
      </div>
    )
  }

  if (!data) return null

  const { teams, currentUser, match, pagination } = data

  return (
    <div className="view-teams-page">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="header-content">
          <h1 className="page-title">Fantasy Teams</h1>
          <p className="match-info">{match.team1.shortName} vs {match.team2.shortName}</p>
        </div>
      </div>

      {/* Current User Card (if exists) */}
      {currentUser && (
        <div className="current-user-section">
          <h3 className="section-label">Your Rank</h3>
          <div 
            className="user-card current-user"
            onClick={() => handleUserClick(currentUser.userId._id)}
          >
            <div className="user-rank">#{currentUser.rank}</div>
            <div className="user-avatar">
              {currentUser.userId.avatar && currentUser.userId.avatar !== 'default' ? (
                <img src={currentUser.userId.avatar} alt="" />
              ) : (
                getInitials(currentUser.userId.displayName)
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser.userId.displayName}</span>
              <span className="user-label">You</span>
            </div>
            <div className="user-points">
              <span className="points-value">{currentUser.fantasyPoints || 0}</span>
              <span className="points-label">pts</span>
            </div>
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      )}

      {/* All Teams List */}
      <div className="teams-section">
        <div className="section-header">
          <h3 className="section-label">All Participants</h3>
          <span className="team-count">{pagination.total} teams</span>
        </div>

        <div className="teams-list">
          {teams.map((team) => (
            <div 
              key={team._id}
              className={`user-card ${team.isCurrentUser ? 'highlight' : ''}`}
              onClick={() => handleUserClick(team.userId._id)}
            >
              <div className="user-rank">#{team.rank}</div>
              <div className="user-avatar">
                {team.userId.avatar && team.userId.avatar !== 'default' ? (
                  <img src={team.userId.avatar} alt="" />
                ) : (
                  getInitials(team.userId.displayName)
                )}
              </div>
              <div className="user-info">
                <span className="user-name">
                  {team.userId.displayName}
                  {team.isCurrentUser && <span className="you-badge">You</span>}
                </span>
              </div>
              <div className="user-points">
                <span className="points-value">{team.fantasyPoints || 0}</span>
                <span className="points-label">pts</span>
              </div>
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Previous
            </button>
            <span className="pagination-info">
              Page {page} of {pagination.pages}
            </span>
            <button 
              className="pagination-btn"
              disabled={page === pagination.pages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .view-teams-page {
    padding-bottom: var(--spacing-xl);
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-primary);
    margin: calc(-1 * var(--spacing-md));
    margin-bottom: var(--spacing-md);
  }

  .back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .back-btn:hover {
    background: var(--bg-primary);
    border-color: var(--primary);
  }

  .back-btn svg {
    width: 20px;
    height: 20px;
  }

  .header-content {
    flex: 1;
  }

  .page-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .match-info {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .error-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-xl);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  .error-card svg {
    width: 48px;
    height: 48px;
    color: var(--warning);
  }

  .error-card p {
    color: var(--text-secondary);
    margin: 0;
  }

  .current-user-section {
    margin-bottom: var(--spacing-md);
  }

  .section-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--spacing-sm);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-sm);
  }

  .team-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .teams-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .user-card:hover {
    background: var(--bg-tertiary);
    border-color: var(--primary);
  }

  .user-card.current-user {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
    border-color: var(--primary);
  }

  .user-card.highlight {
    background: rgba(99, 102, 241, 0.05);
  }

  .user-rank {
    min-width: 40px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: white;
    overflow: hidden;
  }

  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-info {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-label {
    display: block;
    font-size: 0.7rem;
    color: var(--primary);
    font-weight: 500;
  }

  .you-badge {
    padding: 2px 6px;
    background: var(--primary);
    color: white;
    font-size: 0.6rem;
    font-weight: 600;
    border-radius: var(--radius-full);
    text-transform: uppercase;
  }

  .user-points {
    text-align: right;
  }

  .points-value {
    display: block;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--accent);
  }

  .points-label {
    font-size: 0.65rem;
    color: var(--text-muted);
  }

  .arrow-icon {
    width: 18px;
    height: 18px;
    color: var(--text-muted);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-md);
    margin-top: var(--spacing-lg);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--border-primary);
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .pagination-btn:hover:not(:disabled) {
    background: var(--bg-secondary);
    border-color: var(--primary);
  }

  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination-btn svg {
    width: 16px;
    height: 16px;
  }

  .pagination-info {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
`