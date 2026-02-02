import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'
import ScorecardEntry from '../components/admin/ScorecardEntry'
import CreatePlayerForm from '../components/admin/CreatePlayerForm'

export default function AdminPage() {
  const { success, error: showError } = useToast()
  const [apiStatus, setApiStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [series, setSeries] = useState([])
  const [liveMatches, setLiveMatches] = useState([])
  const [selectedSeriesId, setSelectedSeriesId] = useState('')

  // Player management state
  const [activeTab, setActiveTab] = useState('sync')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [dbPlayers, setDbPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamShortName, setTeamShortName] = useState('')

  // Match management state
  const [dbMatches, setDbMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [selectedMatchForScorecard, setSelectedMatchForScorecard] = useState(null)
  const [newMatch, setNewMatch] = useState({
    team1Name: '',
    team1ShortName: '',
    team2Name: '',
    team2ShortName: '',
    venue: '',
    matchDate: '',
    matchTime: ''
  })

  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await api.get('/admin/api-status')
      setApiStatus(response.data)
    } catch (err) {
      showError('Failed to check API status')
    } finally {
      setLoading(false)
    }
  }

  const fetchSeries = async () => {
    try {
      setSyncing(true)
      const response = await api.get('/admin/series')
      setSeries(response.data || [])
      success(`Found ${response.count} series`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const fetchLiveMatches = async () => {
    try {
      setSyncing(true)
      const response = await api.get('/admin/live-matches')
      setLiveMatches(response.data || [])
      success(`Found ${response.count} India matches (${response.allMatchesCount} total)`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const syncMatches = async () => {
    try {
      setSyncing(true)
      const body = selectedSeriesId ? { seriesId: selectedSeriesId } : {}
      const response = await api.post('/admin/sync-matches', body)
      success(`Synced ${response.data.synced} new, updated ${response.data.updated} matches`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const syncPlayers = async () => {
    if (!selectedSeriesId) {
      showError('Please select a series first')
      return
    }
    try {
      setSyncing(true)
      const response = await api.post('/admin/sync-players', {
        seriesId: selectedSeriesId,
        teamNames: ['india', 'pakistan', 'australia', 'england', 'south africa']
      })
      success(`Synced ${response.data.synced} new, updated ${response.data.updated} players`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const updateLiveScores = async () => {
    try {
      setSyncing(true)
      const response = await api.post('/admin/update-live-scores')
      success(`Updated ${response.data.updated} live matches`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Player search functions
  const searchPlayers = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      showError('Enter at least 2 characters to search')
      return
    }
    try {
      setSearching(true)
      const response = await api.get(`/admin/search-players?q=${encodeURIComponent(searchQuery)}`)
      setSearchResults(response.data || [])
      if (response.data?.length === 0) {
        showError('No players found')
      } else {
        success(`Found ${response.count} players`)
      }
    } catch (err) {
      showError(err.message)
    } finally {
      setSearching(false)
    }
  }

  const addPlayer = async (player) => {
    try {
      const response = await api.post('/admin/add-player', {
        playerId: player.id,
        team: player.country || 'UNK'
      })
      if (response.message === 'Player already exists in database') {
        showError('Player already exists')
      } else {
        success(`Added ${player.name}`)
      }
      // Refresh DB players if on that tab
      if (activeTab === 'database') {
        fetchDbPlayers()
      }
    } catch (err) {
      showError(err.message)
    }
  }

  const addTeamPlayersFromApi = async () => {
    if (!teamName) {
      showError('Enter a team name')
      return
    }
    try {
      setSyncing(true)
      const response = await api.post('/admin/add-team-players', {
        teamName,
        teamShortName: teamShortName || teamName.substring(0, 3).toUpperCase()
      })
      success(`Found ${response.data.found}, added ${response.data.added}, skipped ${response.data.skipped} players`)
      setTeamName('')
      setTeamShortName('')
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const fetchDbPlayers = async () => {
    try {
      setLoadingPlayers(true)
      const response = await api.get('/admin/players')
      setDbPlayers(response.data || [])
    } catch (err) {
      showError(err.message)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const deletePlayerFromDb = async (playerId, playerName) => {
    if (!confirm(`Delete ${playerName}?`)) return
    try {
      await api.delete(`/admin/players/${playerId}`)
      success(`Deleted ${playerName}`)
      fetchDbPlayers()
    } catch (err) {
      showError(err.message)
    }
  }

  useEffect(() => {
    if (activeTab === 'database' || activeTab === 'create-player') {
      fetchDbPlayers()
    }
    if (activeTab === 'matches' || activeTab === 'scorecard') {
      fetchDbMatches()
    }
  }, [activeTab])

  // Match management functions
  const fetchDbMatches = async () => {
    try {
      setLoadingMatches(true)
      const response = await api.get('/admin/matches')
      setDbMatches(response.data || [])
    } catch (err) {
      showError(err.message)
    } finally {
      setLoadingMatches(false)
    }
  }

  const createMatch = async () => {
    if (!newMatch.team1Name || !newMatch.team2Name || !newMatch.venue || !newMatch.matchDate) {
      showError('Please fill in all required fields')
      return
    }
    try {
      setSyncing(true)
      await api.post('/admin/create-match', newMatch)
      success('Match created successfully!')
      setNewMatch({
        team1Name: '',
        team1ShortName: '',
        team2Name: '',
        team2ShortName: '',
        venue: '',
        matchDate: '',
        matchTime: ''
      })
      fetchDbMatches()
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const updateMatchStatus = async (matchId, status) => {
    try {
      await api.patch(`/admin/matches/${matchId}/status`, { status })
      success(`Match status updated to ${status}`)
      fetchDbMatches()
    } catch (err) {
      showError(err.message)
    }
  }

  const deleteMatchFromDb = async (matchId, matchName) => {
    if (!confirm(`Delete match "${matchName}"?`)) return
    try {
      await api.delete(`/admin/matches/${matchId}`)
      success('Match deleted')
      fetchDbMatches()
    } catch (err) {
      showError(err.message)
    }
  }

  const calculatePoints = async (matchId) => {
    if (!confirm('Calculate fantasy points for this match? This will generate random test points for all fantasy teams.')) return
    try {
      setSyncing(true)
      const response = await api.post(`/admin/calculate-points/${matchId}`, {
        useApi: true // Try API first, fall back to random test points
      })
      success(`Points calculated for ${response.data.teamsUpdated} teams, ${response.data.usersUpdated || 0} users updated`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const recalculateUserStats = async () => {
    if (!confirm('Recalculate all user stats from their fantasy teams and predictions?')) return
    try {
      setSyncing(true)
      const response = await api.post('/admin/recalculate-user-stats')
      success(`Updated stats for ${response.data.updated} users`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="admin-page">
      <h1 className="mb-md">Admin Panel</h1>

      {/* Quick Actions */}
      <div className="card mb-md">
        <div className="card-header">Quick Actions</div>
        <div className="card-body">
          <div className="btn-group">
            <button
              className="btn btn-primary"
              onClick={recalculateUserStats}
              disabled={syncing}
            >
              {syncing ? 'Calculating...' : 'Recalculate All User Stats'}
            </button>
          </div>
          <p className="text-sm text-gray mt-sm">
            Use this to sync overall leaderboard if user stats are out of sync.
          </p>
        </div>
      </div>

      {/* API Status */}
      <div className="card mb-md">
        <div className="card-header">Cricket API Status</div>
        <div className="card-body">
          {apiStatus?.configured ? (
            <div className={`status-badge ${apiStatus.connected ? 'success' : 'error'}`}>
              {apiStatus.connected ? `Connected (${apiStatus.seriesCount} series)` : 'Not Connected'}
            </div>
          ) : (
            <div className="status-badge warning">
              API Key Not Configured - Manual Mode Active
            </div>
          )}
          {apiStatus?.configured && !apiStatus?.connected && apiStatus?.error && (
            <p className="text-sm text-danger mt-sm">
              Error: {apiStatus.error}
            </p>
          )}
          {apiStatus?.configured && !apiStatus?.connected && (
            <p className="text-sm text-gray mt-sm">
              The CricAPI free tier has 100 requests/day limit. You may have exceeded it, or the API key is invalid.
              You can still create matches and add players manually using the tabs below.
            </p>
          )}
          {!apiStatus?.configured && (
            <p className="text-sm text-gray mt-sm">
              Running in manual mode. Create matches, add players, and enter scorecards manually.
            </p>
          )}
        </div>
      </div>

      {/* Always show tabs - manual operations work without API */}
      <>
        {/* Tabs */}
        <div className="tabs mb-md">
            <button
              className={`tab ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              Matches
            </button>
            <button
              className={`tab ${activeTab === 'scorecard' ? 'active' : ''}`}
              onClick={() => setActiveTab('scorecard')}
            >
              Scorecard
            </button>
            <button
              className={`tab ${activeTab === 'database' ? 'active' : ''}`}
              onClick={() => setActiveTab('database')}
            >
              Players
            </button>
            <button
              className={`tab ${activeTab === 'create-player' ? 'active' : ''}`}
              onClick={() => setActiveTab('create-player')}
            >
              Add Player
            </button>
            <button
              className={`tab ${activeTab === 'players' ? 'active' : ''}`}
              onClick={() => setActiveTab('players')}
            >
              API Players
            </button>
            <button
              className={`tab ${activeTab === 'sync' ? 'active' : ''}`}
              onClick={() => setActiveTab('sync')}
            >
              API Sync
            </button>
          </div>

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <>
              {/* Fetch Data */}
              <div className="card mb-md">
                <div className="card-header">Fetch from API</div>
                <div className="card-body">
                  <div className="btn-group">
                    <button
                      className="btn btn-secondary"
                      onClick={fetchSeries}
                      disabled={syncing}
                    >
                      Get Series
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={fetchLiveMatches}
                      disabled={syncing}
                    >
                      Get Live Matches
                    </button>
                  </div>

                  {/* Series List */}
                  {series.length > 0 && (
                    <div className="mt-md">
                      <label className="form-label">Select Series:</label>
                      <select
                        className="form-input"
                        value={selectedSeriesId}
                        onChange={(e) => setSelectedSeriesId(e.target.value)}
                      >
                        <option value="">-- Select --</option>
                        {series.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Live Matches */}
                  {liveMatches.length > 0 && (
                    <div className="mt-md">
                      <h4>Live/Current Matches:</h4>
                      <div className="matches-list">
                        {liveMatches.map(m => (
                          <div key={m.id} className="match-item">
                            <div className="match-name">{m.name}</div>
                            <div className="match-status text-sm text-gray">
                              {m.status} | {m.venue}
                            </div>
                            <code className="text-xs">ID: {m.id}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sync Actions */}
              <div className="card mb-md">
                <div className="card-header">Sync to Database</div>
                <div className="card-body">
                  <div className="btn-group">
                    <button
                      className="btn btn-primary"
                      onClick={syncMatches}
                      disabled={syncing}
                    >
                      {syncing ? 'Syncing...' : 'Sync Matches'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={syncPlayers}
                      disabled={syncing || !selectedSeriesId}
                    >
                      {syncing ? 'Syncing...' : 'Sync Squad'}
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={updateLiveScores}
                      disabled={syncing}
                    >
                      Update Live Scores
                    </button>
                  </div>
                  {!selectedSeriesId && (
                    <p className="text-sm text-gray mt-sm">
                      Select a series above to sync squad
                    </p>
                  )}
                  <p className="text-sm text-gray mt-sm">
                    Note: If squad sync doesn't work, use "Add Players" tab to search and add players manually.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <>
              {/* Create Match */}
              <div className="card mb-md">
                <div className="card-header">Create Match Manually</div>
                <div className="card-body">
                  <p className="text-sm text-gray mb-md">
                    Create a match that isn't available in the API (e.g., NZ vs India)
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Team 1 Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., India"
                        value={newMatch.team1Name}
                        onChange={(e) => setNewMatch({ ...newMatch, team1Name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Short Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., IND"
                        value={newMatch.team1ShortName}
                        onChange={(e) => setNewMatch({ ...newMatch, team1ShortName: e.target.value.toUpperCase() })}
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Team 2 Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., New Zealand"
                        value={newMatch.team2Name}
                        onChange={(e) => setNewMatch({ ...newMatch, team2Name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Short Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., NZ"
                        value={newMatch.team2ShortName}
                        onChange={(e) => setNewMatch({ ...newMatch, team2ShortName: e.target.value.toUpperCase() })}
                        maxLength={5}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Venue *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., Eden Gardens, Kolkata"
                      value={newMatch.venue}
                      onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Match Date *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newMatch.matchDate}
                        onChange={(e) => setNewMatch({ ...newMatch, matchDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Match Time</label>
                      <input
                        type="time"
                        className="form-input"
                        value={newMatch.matchTime}
                        onChange={(e) => setNewMatch({ ...newMatch, matchTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={createMatch}
                    disabled={syncing}
                  >
                    {syncing ? 'Creating...' : 'Create Match'}
                  </button>
                </div>
              </div>

              {/* Matches in Database */}
              <div className="card mb-md">
                <div className="card-header">
                  Matches in Database ({dbMatches.length})
                  <button
                    className="btn btn-sm btn-secondary ml-auto"
                    onClick={fetchDbMatches}
                    disabled={loadingMatches}
                  >
                    Refresh
                  </button>
                </div>
                <div className="card-body">
                  {loadingMatches ? (
                    <Loading />
                  ) : dbMatches.length === 0 ? (
                    <p className="text-gray">No matches in database. Create one above or sync from API.</p>
                  ) : (
                    <div className="match-list">
                      {dbMatches.map(match => (
                        <div key={match._id} className="match-item">
                          <div className="match-info">
                            <div className="match-name">
                              {match.team1.name} vs {match.team2.name}
                            </div>
                            <div className="match-details text-sm text-gray">
                              {match.venue} | {new Date(match.matchDate).toLocaleDateString()}
                            </div>
                            <div className="match-status-row">
                              <span className={`status-badge ${match.status}`}>
                                {match.status}
                              </span>
                            </div>
                          </div>
                          <div className="match-actions">
                            <select
                              className="form-input form-input-sm"
                              value={match.status}
                              onChange={(e) => updateMatchStatus(match._id, e.target.value)}
                            >
                              <option value="upcoming">Upcoming</option>
                              <option value="live">Live</option>
                              <option value="completed">Completed</option>
                            </select>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => calculatePoints(match._id)}
                              disabled={syncing}
                              title="Calculate fantasy points for this match"
                            >
                              Calc Points
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteMatchFromDb(match._id, `${match.team1.name} vs ${match.team2.name}`)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Add Players Tab */}
          {activeTab === 'players' && (
            <>
              {/* Search Players */}
              <div className="card mb-md">
                <div className="card-header">Search Players in API</div>
                <div className="card-body">
                  <div className="search-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search player name (e.g., Virat, Rohit)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchPlayers()}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={searchPlayers}
                      disabled={searching}
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-md">
                      <h4>Search Results ({searchResults.length}):</h4>
                      <div className="player-list">
                        {searchResults.map(player => (
                          <div key={player.id} className="player-item">
                            <div className="player-info">
                              <div className="player-name">{player.name}</div>
                              <div className="player-details text-sm text-gray">
                                {player.country || 'Unknown'} | {player.role || 'Unknown Role'}
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => addPlayer(player)}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bulk Add by Team */}
              <div className="card mb-md">
                <div className="card-header">Bulk Add Players by Team</div>
                <div className="card-body">
                  <p className="text-sm text-gray mb-sm">
                    Search and add all players from a team (e.g., "India", "Australia")
                  </p>
                  <div className="form-group">
                    <label className="form-label">Team Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., India, Australia"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team Short Name (optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g., IND, AUS (auto-generated if empty)"
                      value={teamShortName}
                      onChange={(e) => setTeamShortName(e.target.value.toUpperCase())}
                      maxLength={5}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={addTeamPlayersFromApi}
                    disabled={syncing || !teamName}
                  >
                    {syncing ? 'Adding...' : 'Add Team Players'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Scorecard Tab */}
          {activeTab === 'scorecard' && (
            <>
              {selectedMatchForScorecard ? (
                <ScorecardEntry
                  matchId={selectedMatchForScorecard._id}
                  onClose={() => setSelectedMatchForScorecard(null)}
                />
              ) : (
                <div className="card mb-md">
                  <div className="card-header">Select Match for Scorecard Entry</div>
                  <div className="card-body">
                    {loadingMatches ? (
                      <Loading />
                    ) : dbMatches.length === 0 ? (
                      <p className="text-gray">No matches found. Create a match first.</p>
                    ) : (
                      <div className="match-list">
                        {dbMatches.map(match => (
                          <div key={match._id} className="match-item clickable" onClick={() => setSelectedMatchForScorecard(match)}>
                            <div className="match-info">
                              <div className="match-name">
                                {match.team1.name} vs {match.team2.name}
                              </div>
                              <div className="match-details text-sm text-gray">
                                {match.venue} | {new Date(match.matchDate).toLocaleDateString()}
                              </div>
                              <span className={`status-badge ${match.status}`}>
                                {match.status}
                              </span>
                            </div>
                            <div className="match-actions">
                              <button className="btn btn-primary">
                                Enter Scorecard
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Database Tab */}
          {activeTab === 'database' && (
            <div className="card mb-md">
              <div className="card-header">
                Players in Database ({dbPlayers.length})
                <button
                  className="btn btn-sm btn-secondary ml-auto"
                  onClick={fetchDbPlayers}
                  disabled={loadingPlayers}
                >
                  Refresh
                </button>
              </div>
              <div className="card-body">
                {loadingPlayers ? (
                  <Loading />
                ) : dbPlayers.length === 0 ? (
                  <p className="text-gray">No players in database. Use "Add Player" tab to add some.</p>
                ) : (
                  <div className="player-list">
                    {dbPlayers.map(player => (
                      <div key={player._id} className="player-item">
                        <div className="player-info">
                          <div className="player-name">{player.name}</div>
                          <div className="player-details text-sm text-gray">
                            {player.team} | {player.role} | {player.creditValue} credits
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => deletePlayerFromDb(player._id, player.name)}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Player Tab */}
          {activeTab === 'create-player' && (
            <CreatePlayerForm onSuccess={() => {
              if (activeTab === 'database') fetchDbPlayers()
              success('Player created successfully')
            }} />
          )}
      </>

      <style>{`
        .status-badge {
          display: inline-block;
          padding: var(--spacing-xs) var(--spacing-md);
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: 0.875rem;
        }
        .status-badge.success {
          background: rgba(46, 160, 67, 0.15);
          color: var(--success);
        }
        .status-badge.error {
          background: rgba(248, 81, 73, 0.15);
          color: var(--danger);
        }
        .status-badge.warning {
          background: rgba(210, 153, 34, 0.15);
          color: var(--warning);
        }
        .btn-group {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }
        code {
          background: var(--bg-tertiary);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .match-item {
          padding: var(--spacing-sm);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-sm);
          background: var(--bg-tertiary);
        }
        .match-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .admin-page .tabs {
          display: flex;
          gap: var(--spacing-xs);
          border-bottom: 2px solid var(--border-primary);
          padding-bottom: var(--spacing-xs);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .admin-page .tab {
          padding: var(--spacing-sm) var(--spacing-md);
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          white-space: nowrap;
        }
        .admin-page .tab.active {
          background: var(--primary);
          color: white;
        }
        .admin-page .tab:hover:not(.active) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .search-row {
          display: flex;
          gap: var(--spacing-sm);
        }
        .search-row .form-input {
          flex: 1;
        }
        .player-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .player-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-sm);
          background: var(--bg-tertiary);
        }
        .player-info {
          flex: 1;
        }
        .player-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .player-details {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .btn-sm {
          padding: var(--spacing-xs) var(--spacing-sm);
          font-size: 0.8rem;
        }
        .btn-danger {
          background: var(--danger);
          color: white;
        }
        .btn-danger:hover {
          background: var(--danger-light);
        }
        .form-group {
          margin-bottom: var(--spacing-sm);
        }
        .card-header {
          display: flex;
          align-items: center;
        }
        .ml-auto {
          margin-left: auto;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }
        .match-list {
          max-height: 500px;
          overflow-y: auto;
        }
        .match-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--spacing-md);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-sm);
          gap: var(--spacing-md);
          background: var(--bg-tertiary);
        }
        .match-info {
          flex: 1;
        }
        .match-name {
          font-weight: 600;
          margin-bottom: 4px;
          color: var(--text-primary);
        }
        .match-details {
          margin-bottom: 8px;
          color: var(--text-muted);
        }
        .match-status-row {
          margin-top: 4px;
        }
        .match-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          align-items: flex-end;
        }
        .form-input-sm {
          padding: 6px 10px;
          font-size: 0.8rem;
          background: var(--bg-secondary);
          border-color: var(--border-primary);
          color: var(--text-primary);
        }
        .status-badge.upcoming {
          background: rgba(46, 160, 67, 0.15);
          color: var(--success);
        }
        .status-badge.live {
          background: rgba(248, 81, 73, 0.15);
          color: var(--danger);
        }
        .status-badge.completed {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }
        .match-item.clickable {
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .match-item.clickable:hover {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  )
}
