import { useAuth } from '../hooks/useAuth'
import { useNavigate, Link } from 'react-router-dom'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {getInitials(user?.displayName)}
        </div>
        <h2 className="profile-name">{user?.displayName}</h2>
        <p className="profile-email">{user?.email}</p>

        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">{user?.stats?.matchesPlayed || 0}</div>
            <div className="profile-stat-label">Matches</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{user?.stats?.totalFantasyPoints || 0}</div>
            <div className="profile-stat-label">Points</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">#{user?.stats?.bestRank || '-'}</div>
            <div className="profile-stat-label">Best Rank</div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="profile-section">
        <div className="profile-section-header">Performance</div>
        <div className="profile-menu-item">
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <span className="profile-menu-text">Fantasy Points</span>
          </div>
          <span className="text-primary font-bold">{user?.stats?.totalFantasyPoints || 0}</span>
        </div>
        <div className="profile-menu-item">
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <span className="profile-menu-text">Correct Predictions</span>
          </div>
          <span className="text-primary font-bold">
            {user?.stats?.predictionsCorrect || 0}/{user?.stats?.predictionsTotal || 0}
          </span>
        </div>
      </div>

      {/* Scoring Rules */}
      <div className="profile-section">
        <div className="profile-section-header">Scoring Rules</div>
        <Link to="#" className="profile-menu-item" onClick={(e) => e.preventDefault()}>
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <span className="profile-menu-text">Batting</span>
          </div>
          <span className="text-gray text-sm">+1/run, +8 for 50</span>
        </Link>
        <Link to="#" className="profile-menu-item" onClick={(e) => e.preventDefault()}>
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 12a4 4 0 0 0 8 0"/>
                <circle cx="12" cy="6" r="1.5"/>
              </svg>
            </div>
            <span className="profile-menu-text">Bowling</span>
          </div>
          <span className="text-gray text-sm">+25/wicket</span>
        </Link>
        <Link to="#" className="profile-menu-item" onClick={(e) => e.preventDefault()}>
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span className="profile-menu-text">Captain/VC</span>
          </div>
          <span className="text-gray text-sm">2x / 1.5x</span>
        </Link>
      </div>

      {/* Account Section */}
      <div className="profile-section">
        <div className="profile-section-header">Account</div>
        {user?.isAdmin && (
          <Link to="/admin" className="profile-menu-item">
            <div className="profile-menu-left">
              <div className="profile-menu-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
              <span className="profile-menu-text">Admin Panel</span>
            </div>
            <div className="profile-menu-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        )}
        <div className="profile-menu-item logout-btn" onClick={handleLogout}>
          <div className="profile-menu-left">
            <div className="profile-menu-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <span className="profile-menu-text">Logout</span>
          </div>
        </div>
      </div>
    </div>
  )
}
