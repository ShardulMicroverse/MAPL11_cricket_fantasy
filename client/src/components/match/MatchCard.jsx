import { Link } from 'react-router-dom'

export default function MatchCard({ match }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = (dateStr) => {
    const now = new Date()
    const matchDate = new Date(dateStr)
    const diff = matchDate - now

    if (diff < 0) return 'Started'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  return (
    <Link to={`/match/${match._id}`} className="match-card">
      <div className="match-teams">
        <div className="match-team">
          <div className="match-team-logo">
            {match.team1.shortName}
          </div>
          <div className="match-team-name">{match.team1.name}</div>
          {match.result?.team1Score && (
            <div className="match-score">{match.result.team1Score}</div>
          )}
        </div>

        <div className="match-vs">
          {match.status === 'live' ? (
            <span className="match-status live">LIVE</span>
          ) : (
            'VS'
          )}
        </div>

        <div className="match-team">
          <div className="match-team-logo">
            {match.team2.shortName}
          </div>
          <div className="match-team-name">{match.team2.name}</div>
          {match.result?.team2Score && (
            <div className="match-score">{match.result.team2Score}</div>
          )}
        </div>
      </div>

      <div className="match-info">
        {match.status === 'upcoming' && (
          <>
            <div>{formatDate(match.matchDate)}</div>
            <div className="text-primary font-bold">
              Starts in {getTimeRemaining(match.matchDate)}
            </div>
          </>
        )}
        {match.status === 'live' && match.liveData && (
          <div className="text-danger font-bold">
            {match.liveData.currentScore} ({match.liveData.currentOver} ov)
          </div>
        )}
        {match.status === 'completed' && match.result?.summary && (
          <div className="text-success">{match.result.summary}</div>
        )}
        <div className="text-xs text-gray">{match.venue}</div>
      </div>
    </Link>
  )
}
