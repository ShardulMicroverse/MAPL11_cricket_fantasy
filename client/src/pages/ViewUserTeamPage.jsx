import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

// Role colors
const ROLE_COLORS = {
  'Wicket-Keeper': '#e91e63',
  'Batsman': '#2196f3',
  'All-Rounder': '#9c27b0',
  'Bowler': '#4caf50'
}

const ROLE_SHORT = {
  'Wicket-Keeper': 'WK',
  'Batsman': 'BAT',
  'All-Rounder': 'AR',
  'Bowler': 'BOWL'
}

// Player Avatar Component with image loading and error handling
const PlayerAvatar = ({ player, size = 36 }) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  const hasValidImage = player?.image && player.image.trim() !== '' && !imageError
  
  const avatarStyle = {
    width: size,
    height: size,
    minWidth: size,
    background: hasValidImage ? 'var(--bg-tertiary)' : ROLE_COLORS[player?.role] || 'var(--primary)',
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  return (
    <div className="player-avatar" style={avatarStyle}>
      {hasValidImage ? (
        <>
          {imageLoading && (
            <div className="avatar-loading">
              <div className="avatar-spinner"></div>
            </div>
          )}
          <img 
            src={player.image} 
            alt={player.name || 'Player'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ 
              opacity: imageLoading ? 0 : 1,
              transition: 'opacity 0.2s ease'
            }}
          />
        </>
      ) : (
        <span className="avatar-initials">
          {getInitials(player?.name || player?.shortName)}
        </span>
      )}
    </div>
  )
}

export default function ViewUserTeamPage() {
  const { matchId, odUserId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUserTeam()
  }, [matchId, odUserId])

  const fetchUserTeam = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fantasyService.getUserTeamForMatch(matchId, odUserId)
      setData(response.data)
    } catch (err) {
      console.error('Error fetching user team:', err)
      setError(err.response?.data?.message || 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />
  
  if (error) {
    return (
      <div className="view-user-team-page">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="page-title">View Team</h1>
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

  const { team, match, user } = data
  const players = team.players || []

  // Group players by role
  const groupedPlayers = {
    'Wicket-Keeper': players.filter(p => p.playerId?.role === 'Wicket-Keeper'),
    'Batsman': players.filter(p => p.playerId?.role === 'Batsman'),
    'All-Rounder': players.filter(p => p.playerId?.role === 'All-Rounder'),
    'Bowler': players.filter(p => p.playerId?.role === 'Bowler')
  }

  return (
    <div className="view-user-team-page">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="header-content">
          <h1 className="page-title">{user.displayName}'s Team</h1>
          <p className="match-info">{match.team1.shortName} vs {match.team2.shortName}</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="user-info-card">
        <div className="user-avatar-large">
          {user.avatar && user.avatar !== 'default' ? (
            <img src={user.avatar} alt="" />
          ) : (
            getInitials(user.displayName)
          )}
        </div>
        <h2 className="user-display-name">{user.displayName}</h2>
      </div>

      {/* Team Composition */}
      <div className="team-composition">
        {Object.entries(groupedPlayers).map(([role, rolePlayers]) => (
          rolePlayers.length > 0 && (
            <div key={role} className="role-section">
              <div className="role-header" style={{ borderColor: ROLE_COLORS[role] }}>
                <span className="role-badge" style={{ background: ROLE_COLORS[role] }}>
                  {ROLE_SHORT[role]}
                </span>
                <span className="role-name">{role}s</span>
                <span className="role-count">{rolePlayers.length}</span>
              </div>
              <div className="players-grid">
                {rolePlayers.map((playerItem) => {
                  const player = playerItem.playerId
                  const isCaptain = playerItem.isCaptain
                  const isViceCaptain = playerItem.isViceCaptain

                  return (
                    <div 
                      key={player._id} 
                      className={`player-card ${isCaptain ? 'captain' : ''} ${isViceCaptain ? 'vice-captain' : ''}`}
                    >
                      {(isCaptain || isViceCaptain) && (
                        <div className={`player-badge ${isCaptain ? 'captain-badge' : 'vc-badge'}`}>
                          {isCaptain ? 'C' : 'VC'}
                        </div>
                      )}
                      <PlayerAvatar player={player} size={40} />
                      <div className="player-info">
                        <span className="player-name">{player.shortName || player.name}</span>
                        <span className="player-team">{player.team}</span>
                      </div>
                      <div className="player-credits">
                        {player.creditValue} cr
                      </div>
                      {(isCaptain || isViceCaptain) && (
                        <div className="multiplier-badge">
                          {isCaptain ? '2x' : '1.5x'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Legend */}
      <div className="legend-card">
        <div className="legend-item">
          <span className="legend-badge captain-badge">C</span>
          <span>Captain (2x points)</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge vc-badge">VC</span>
          <span>Vice Captain (1.5x points)</span>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .view-user-team-page {
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

  .user-info-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--spacing-md);
  }

  .user-avatar-large {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    color: white;
    overflow: hidden;
    flex-shrink: 0;
  }

  .user-avatar-large img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-display-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .team-composition {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .role-section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .role-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-bottom: 2px solid;
  }

  .role-badge {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
  }

  .role-name {
    flex: 1;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .role-count {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .players-grid {
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .player-card {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-primary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    position: relative;
  }

  .player-card.captain {
    background: rgba(255, 193, 7, 0.1);
    border-color: rgba(255, 193, 7, 0.3);
  }

  .player-card.vice-captain {
    background: rgba(156, 39, 176, 0.1);
    border-color: rgba(156, 39, 176, 0.3);
  }

  .player-badge {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    color: white;
    z-index: 2;
  }

  .captain-badge {
    background: linear-gradient(135deg, #ffc107, #ff9800);
  }

  .vc-badge {
    background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  }

  /* Player Avatar Styles */
  .player-avatar {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
  }

  .player-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-avatar .avatar-initials {
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
  }

  .player-avatar .avatar-loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
  }

  .player-avatar .avatar-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-primary);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .player-info {
    flex: 1;
    min-width: 0;
  }

  .player-name {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-team {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .player-credits {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .multiplier-badge {
    padding: 2px 6px;
    background: var(--accent);
    color: var(--bg-primary);
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: var(--radius-sm);
  }

  .legend-card {
    display: flex;
    justify-content: center;
    gap: var(--spacing-lg);
    padding: var(--spacing-md);
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: var(--radius-md);
    margin-top: var(--spacing-md);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .legend-badge {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 700;
    color: white;
  }
`