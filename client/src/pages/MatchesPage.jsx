import { useState, useEffect } from 'react'
import { matchService } from '../services/matchService'
import Loading from '../components/common/Loading'
import MatchCard from '../components/match/MatchCard'

export default function MatchesPage() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true)
      try {
        let response
        if (filter === 'all') {
          response = await matchService.getMatches()
        } else if (filter === 'upcoming') {
          response = await matchService.getUpcomingMatches()
        } else if (filter === 'live') {
          response = await matchService.getLiveMatches()
        } else {
          response = await matchService.getCompletedMatches()
        }
        setMatches(response.data || [])
      } catch (error) {
        console.error('Error fetching matches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [filter])

  return (
    <div className="matches-page">
      <div className="matches-page-header">
        <h1 className="matches-page-title">Matches</h1>
      </div>

      {/* Filter Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={`tab-btn ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </button>
        <button
          className={`tab-btn ${filter === 'live' ? 'active' : ''}`}
          onClick={() => setFilter('live')}
        >
          Live
        </button>
        <button
          className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : matches.length > 0 ? (
        <div className="matches-list">
          {matches.map(match => (
            <MatchCard key={match._id} match={match} />
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12a4 4 0 0 0 8 0"/>
            <circle cx="12" cy="6" r="1.5"/>
          </svg>
          <p>No {filter !== 'all' ? filter : ''} matches found</p>
          <span>Check back later for new matches</span>
        </div>
      )}
    </div>
  )
}
