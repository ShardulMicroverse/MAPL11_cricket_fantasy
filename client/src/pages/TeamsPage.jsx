import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { teamService } from '../services/teamService'
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

export default function TeamsPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    fetchTeams()
  }, [page, search])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const res = await teamService.getAllPermanentTeams(page, 20, search)
      setTeams(res.data.teams || [])
      setPagination(res.data.pagination)
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>All Teams</h2>
        <Link to="/teams/leaderboard" className="header-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21V11"/>
            <path d="M12 21V7"/>
            <path d="M16 21V13"/>
          </svg>
        </Link>
      </div>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={handleSearch}
        />
        {search && (
          <button className="clear-search" onClick={() => setSearch('')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <Loading message="Loading teams" />
      ) : teams.length === 0 ? (
        <div className="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No teams found</p>
          <span>{search ? 'Try a different search term' : 'Teams will appear here once formed'}</span>
        </div>
      ) : (
        <>
          <div className="teams-list">
            {teams.map((team, index) => (
              <Link key={team._id} to={`/team/${team._id}`} className="team-list-item">
                <div className="team-list-rank">#{team.rank || index + 1}</div>
                <div className="team-list-info">
                  <div className="team-list-name">{team.teamName}</div>
                  <div className="team-list-members">
                    {team.members?.slice(0, 4).map((m, i) => (
                      <div key={i} className="team-list-avatar">
                        {getInitials(m.userId?.displayName)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="team-list-stats">
                  <div className="team-list-points">{team.stats?.totalPoints || 0}</div>
                  <div className="team-list-label">pts</div>
                </div>
                <svg className="team-list-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
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
    </div>
  )
}
