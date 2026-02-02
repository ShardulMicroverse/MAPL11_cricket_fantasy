import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { teamService } from '../services/teamService'
import { matchService } from '../services/matchService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

export default function MyTeamPage() {
  const { matchId } = useParams()
  const { success, error: showError } = useToast()
  const [team, setTeam] = useState(null)
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, matchRes] = await Promise.all([
          teamService.getMyTeam(matchId),
          matchService.getMatch(matchId)
        ])
        setTeam(teamRes.data)
        setMatch(matchRes.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId])

  const handleRename = async () => {
    if (!newTeamName.trim() || newTeamName.trim().length < 2) {
      showError('Team name must be at least 2 characters')
      return
    }
    if (newTeamName.trim().length > 30) {
      showError('Team name must be 30 characters or less')
      return
    }

    setSaving(true)
    try {
      const res = await teamService.renameTeam(matchId, newTeamName.trim())
      setTeam(prev => ({ ...prev, teamName: res.data.teamName }))
      setIsEditing(false)
      success('Team renamed successfully!')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to rename team')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = () => {
    setNewTeamName(team.teamName)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setNewTeamName('')
  }

  if (loading) return <Loading />

  if (!team) {
    return (
      <div className="empty-state">
        <p>You haven't been matched to a team yet</p>
        <Link to={`/match/${matchId}`} className="btn btn-primary mt-md">
          Go Back
        </Link>
      </div>
    )
  }

  return (
    <div className="my-team-page">
      <div className="card mb-md">
        <div className="card-body text-center">
          {isEditing ? (
            <div className="team-name-edit">
              <input
                type="text"
                className="team-name-input"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                maxLength={30}
                autoFocus
                placeholder="Enter team name"
              />
              <div className="team-name-actions">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleRename}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="team-name-display">
              <h2 className="team-name">{team.teamName}</h2>
              {match?.status === 'upcoming' && (
                <button className="edit-btn" onClick={startEditing} title="Rename team">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="text-gray">
            {match?.team1.shortName} vs {match?.team2.shortName}
          </p>
          <div className="team-points mt-md">
            <span className="points-value">{team.totalPoints}</span>
            <span className="points-label">Total Points</span>
          </div>
          {team.rank && (
            <div className="team-rank mt-sm">
              Rank: #{team.rank}
            </div>
          )}
        </div>
      </div>

      <h3 className="mb-md">Team Members</h3>
      <div className="card">
        <div className="card-body">
          {team.members.map((member, index) => (
            <div key={member.userId._id || member.userId} className="member-row">
              <div className="member-rank">{index + 1}</div>
              <div className="member-info">
                <div className="member-name">
                  {member.userId.displayName || 'Unknown'}
                </div>
                <div className="member-points text-gray text-sm">
                  {member.contributedPoints} pts
                </div>
              </div>
              <div className="member-avatar">
                {(member.userId.displayName || 'U').charAt(0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link to={`/leaderboard/${matchId}`} className="btn btn-secondary btn-block mt-md">
        View Full Leaderboard
      </Link>

      <style>{`
        .team-name-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
        }
        .team-name {
          font-size: 1.5rem;
          color: var(--primary);
        }
        .edit-btn {
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--text-muted);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .edit-btn:hover {
          color: var(--primary);
        }
        .edit-btn svg {
          width: 18px;
          height: 18px;
        }
        .team-name-edit {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          align-items: center;
        }
        .team-name-input {
          width: 100%;
          max-width: 250px;
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 1.1rem;
          font-weight: 600;
          text-align: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }
        .team-name-input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .team-name-actions {
          display: flex;
          gap: var(--spacing-sm);
        }
        .team-points {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .points-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--primary);
        }
        .points-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }
        .team-rank {
          font-weight: 600;
          color: var(--accent);
        }
        .member-row {
          display: flex;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-primary);
        }
        .member-row:last-child {
          border-bottom: none;
        }
        .member-rank {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.75rem;
          margin-right: var(--spacing-sm);
          color: var(--text-secondary);
        }
        .member-info {
          flex: 1;
        }
        .member-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .member-avatar {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          border-radius: var(--radius-full);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
