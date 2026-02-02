import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { leaderboardService } from '../services/leaderboardService'
import { matchService } from '../services/matchService'
import { useAuth } from '../hooks/useAuth'
import Loading from '../components/common/Loading'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function LeaderboardPage() {
  const { matchId } = useParams()
  const { user } = useAuth()
  const [tab, setTab] = useState('individual')
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (matchId) {
          const [matchRes, myRankRes] = await Promise.all([
            matchService.getMatch(matchId),
            leaderboardService.getMyRank(matchId)
          ])
          setMatch(matchRes.data?.data || matchRes.data)
          setMyRank(myRankRes.data?.data || myRankRes.data)
        }

        const leaderboardRes = matchId
          ? tab === 'individual'
            ? await leaderboardService.getIndividualMatchLeaderboard(matchId)
            : await leaderboardService.getTeamMatchLeaderboard(matchId)
          : await leaderboardService.getOverallIndividualLeaderboard()

        const resData = leaderboardRes.data?.data || leaderboardRes.data
        setLeaderboard(resData?.entries || resData || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId, tab])

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    return ''
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">Leaderboard</h1>
      </div>

      {match && (
        <div className="match-header-card">
          <div className="match-header-teams">
            <div className="match-header-team">
              <div className="team-logo-large">{match.team1?.shortName || match.team1?.name?.substring(0, 3)}</div>
              <span className="team-name-large">{match.team1?.name || match.team1}</span>
            </div>
            <span className="match-header-vs">vs</span>
            <div className="match-header-team">
              <div className="team-logo-large">{match.team2?.shortName || match.team2?.name?.substring(0, 3)}</div>
              <span className="team-name-large">{match.team2?.name || match.team2}</span>
            </div>
          </div>
          <div className="match-meta">
            <span className="match-venue">{match.venue}</span>
          </div>
        </div>
      )}

      {/* My Rank Card */}
      {myRank && myRank.rank && (
        <div className="card mb-3">
          <div className="card-body">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-muted text-xs">Your Rank</span>
                <div className="text-primary" style={{ fontSize: '2rem', fontWeight: 800 }}>#{myRank.rank}</div>
              </div>
              <div className="text-right">
                <span className="text-muted text-xs">Total Points</span>
                <div className="text-success" style={{ fontSize: '1.5rem', fontWeight: 700 }}>{myRank.totalPoints || 0}</div>
              </div>
            </div>
            <div className="flex justify-between" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-sm)' }}>
              <div className="text-center flex-1">
                <div className="font-bold">{myRank.fantasyPoints || 0}</div>
                <div className="text-muted text-xs">Fantasy</div>
              </div>
              <div className="text-center flex-1">
                <div className="font-bold">{myRank.predictionPoints || 0}</div>
                <div className="text-muted text-xs">Predictions</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {matchId && (
        <div className="tab-nav mb-3">
          <button
            className={`tab-btn ${tab === 'individual' ? 'active' : ''}`}
            onClick={() => setTab('individual')}
          >
            Individual
          </button>
          <button
            className={`tab-btn ${tab === 'team' ? 'active' : ''}`}
            onClick={() => setTab('team')}
          >
            Team
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <Loading />
      ) : (
        <div className="leaderboard-card">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <div
                key={entry.userId || entry.teamId || index}
                className={`leaderboard-item ${entry.userId === user?._id ? 'current-user' : ''}`}
              >
                <div className={`leaderboard-rank ${getRankClass(entry.rank || index + 1)}`}>
                  {entry.rank || index + 1}
                </div>
                <div className="leaderboard-user">
                  <div className="leaderboard-avatar">
                    {getInitials(entry.displayName || entry.teamName || entry.name)}
                  </div>
                  <div className="leaderboard-user-info">
                    <div className="leaderboard-name">
                      {entry.displayName || entry.teamName || entry.name || 'Unknown'}
                    </div>
                    {entry.teamName && entry.members && (
                      <div className="leaderboard-matches">
                        {entry.members.map(m => m.displayName || m.name).slice(0, 3).join(', ')}
                        {entry.members.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="leaderboard-points">
                  {entry.totalPoints || entry.points || 0}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                {tab === 'team' ? (
                  <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/>
                  </>
                )}
              </svg>
              <p>{tab === 'team' ? 'No teams yet' : 'No entries yet'}</p>
              <span>
                {tab === 'team'
                  ? 'Teams are formed when 4 users join'
                  : 'Create a fantasy team to participate'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
