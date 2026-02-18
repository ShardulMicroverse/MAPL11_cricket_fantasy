import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'
import Loading from '../common/Loading'

export default function ScorecardEntry({ matchId, onClose }) {
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [match, setMatch] = useState(null)
  const [team1Players, setTeam1Players] = useState([])
  const [team2Players, setTeam2Players] = useState([])
  const [playerStats, setPlayerStats] = useState({})
  const [activeTeam, setActiveTeam] = useState('team1')
  const [matchStats, setMatchStats] = useState({
    totalScore: 0,
    powerplayScore: 0,
    fiftiesCount: 0
  })
  const [predictionAnswers, setPredictionAnswers] = useState({
    abhishekSharmaScore: '',
    indianTeamCatches: '',
    indiaScoreAbove230: '',
    manOfMatch: { playerId: '', playerName: '' },
    anyTeamAllOut: ''
  })

  useEffect(() => {
    fetchMatchPlayers()
  }, [matchId])

  const fetchMatchPlayers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/scorecard/${matchId}/players`)
      const data = response.data || response

      setMatch(data.match)
      setTeam1Players(data.team1Players || [])
      setTeam2Players(data.team2Players || [])

      // Load existing match stats for predictions
      if (data.match?.statsSnapshot) {
        setMatchStats({
          totalScore: data.match.statsSnapshot.totalScore || 0,
          powerplayScore: data.match.statsSnapshot.powerplayScore || 0,
          fiftiesCount: data.match.statsSnapshot.fiftiesCount || 0
        })
        const snap = data.match.statsSnapshot
        setPredictionAnswers({
          abhishekSharmaScore: snap.abhishekSharmaScore !== undefined && snap.abhishekSharmaScore !== null ? snap.abhishekSharmaScore : '',
          indianTeamCatches: snap.indianTeamCatches !== undefined && snap.indianTeamCatches !== null ? snap.indianTeamCatches : '',
          indiaScoreAbove230: snap.indiaScoreAbove230 || '',
          manOfMatch: snap.manOfMatch ? { playerId: snap.manOfMatch.playerId || '', playerName: snap.manOfMatch.playerName || '' } : { playerId: '', playerName: '' },
          anyTeamAllOut: snap.anyTeamAllOut || ''
        })
      }

      // Initialize stats from existing data
      const existingStats = {}
      ;[...data.team1Players, ...data.team2Players].forEach(player => {
        if (player.stats) {
          existingStats[player._id] = {
            batting: player.stats.batting || {},
            bowling: player.stats.bowling || {},
            fielding: player.stats.fielding || {},
            fantasyPoints: player.stats.fantasyPoints || 0,
            isManualPoints: player.stats.isManualPoints || false
          }
        } else {
          existingStats[player._id] = {
            batting: { runs: 0, ballsFaced: 0, fours: 0, sixes: 0, dots: 0, isOut: false, didBat: false },
            bowling: { overs: 0, maidens: 0, runsConceded: 0, wickets: 0, dots: 0, didBowl: false },
            fielding: { catches: 0, stumpings: 0, runOuts: 0, runOutAssists: 0 },
            fantasyPoints: 0,
            isManualPoints: false
          }
        }
      })
      setPlayerStats(existingStats)
    } catch (err) {
      showError(err.message || 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const updatePlayerStat = (playerId, category, field, value) => {
    setPlayerStats(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [category]: {
          ...prev[playerId]?.[category],
          [field]: value
        }
      }
    }))
  }

  const savePlayerStats = async (playerId) => {
    try {
      setSaving(true)
      const stats = playerStats[playerId]

      await api.post(`/admin/scorecard/${matchId}/player/${playerId}`, {
        batting: stats.batting,
        bowling: stats.bowling,
        fielding: stats.fielding,
        fantasyPoints: stats.fantasyPoints,
        isManualPoints: stats.isManualPoints
      })

      success('Player stats saved')
    } catch (err) {
      showError(err.message || 'Failed to save stats')
    } finally {
      setSaving(false)
    }
  }

  const saveAllStats = async () => {
    try {
      setSaving(true)
      const players = Object.entries(playerStats).map(([playerId, stats]) => ({
        playerId,
        ...stats
      }))

      const response = await api.post(`/admin/scorecard/${matchId}/bulk`, { players })
      success(`Saved ${response.data?.saved || 0} player stats`)
    } catch (err) {
      showError(err.message || 'Failed to save stats')
    } finally {
      setSaving(false)
    }
  }

  const calculatePoints = async () => {
    try {
      setSaving(true)
      const response = await api.post(`/admin/scorecard/${matchId}/calculate-points`, {
        updateMatchStats: true
      })
      success(`Updated ${response.data?.teamsUpdated || 0} fantasy teams`)
    } catch (err) {
      showError(err.message || 'Failed to calculate points')
    } finally {
      setSaving(false)
    }
  }

  const updateMatchStatsSnapshot = async () => {
    try {
      setSaving(true)

      // Calculate from entered stats
      let totalScore = 0, fiftiesCount = 0
      let maxSixes = 0, maxFours = 0, maxWickets = 0
      let mostSixes = null, mostFours = null, mostWickets = null

      const allPlayers = [...team1Players, ...team2Players]

      allPlayers.forEach(player => {
        const stats = playerStats[player._id]
        if (stats?.batting) {
          totalScore += stats.batting.runs || 0
          if ((stats.batting.runs || 0) >= 50) fiftiesCount++

          if ((stats.batting.sixes || 0) > maxSixes) {
            maxSixes = stats.batting.sixes
            mostSixes = { playerId: player._id, name: player.name, value: stats.batting.sixes }
          }
          if ((stats.batting.fours || 0) > maxFours) {
            maxFours = stats.batting.fours
            mostFours = { playerId: player._id, name: player.name, value: stats.batting.fours }
          }
        }
        if (stats?.bowling && (stats.bowling.wickets || 0) > maxWickets) {
          maxWickets = stats.bowling.wickets
          mostWickets = { playerId: player._id, name: player.name, value: stats.bowling.wickets }
        }
      })

      await api.post(`/admin/matches/${matchId}/stats`, {
        totalScore,
        powerplayScore: matchStats.powerplayScore || Math.round(totalScore * 0.3),
        fiftiesCount,
        mostSixes,
        mostFours,
        mostWickets,
        abhishekSharmaScore: predictionAnswers.abhishekSharmaScore !== '' ? Number(predictionAnswers.abhishekSharmaScore) : undefined,
        indianTeamCatches: predictionAnswers.indianTeamCatches !== '' ? Number(predictionAnswers.indianTeamCatches) : undefined,
        indiaScoreAbove230: predictionAnswers.indiaScoreAbove230 || undefined,
        manOfMatch: predictionAnswers.manOfMatch.playerId ? predictionAnswers.manOfMatch : undefined,
        anyTeamAllOut: predictionAnswers.anyTeamAllOut || undefined
      })

      success('Match stats updated')
    } catch (err) {
      showError(err.message || 'Failed to update match stats')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const currentPlayers = activeTeam === 'team1' ? team1Players : team2Players

  return (
    <div className="scorecard-entry">
      <div className="scorecard-header">
        <h2>
          Enter Scorecard: {match?.team1?.name} vs {match?.team2?.name}
        </h2>
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {/* Team Tabs */}
      <div className="team-tabs">
        <button
          className={`team-tab ${activeTeam === 'team1' ? 'active' : ''}`}
          onClick={() => setActiveTeam('team1')}
        >
          {match?.team1?.shortName || 'Team 1'} ({team1Players.length})
        </button>
        <button
          className={`team-tab ${activeTeam === 'team2' ? 'active' : ''}`}
          onClick={() => setActiveTeam('team2')}
        >
          {match?.team2?.shortName || 'Team 2'} ({team2Players.length})
        </button>
      </div>

      {/* Player Stats Entry */}
      <div className="players-grid">
        {currentPlayers.length === 0 ? (
          <p className="text-gray">No players found for this team. Add players first.</p>
        ) : (
          currentPlayers.map(player => (
            <div key={player._id} className="player-stats-card">
              <div className="player-header">
                <span className="player-name">{player.name}</span>
                <span className="player-role text-gray">{player.role}</span>
              </div>

              {/* Batting Stats */}
              <div className="stats-section">
                <div className="section-title">Batting</div>
                <div className="stats-row">
                  <label>
                    <span>Runs</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.batting?.runs || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'batting', 'runs', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Balls</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.batting?.ballsFaced || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'batting', 'ballsFaced', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>4s</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.batting?.fours || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'batting', 'fours', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>6s</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.batting?.sixes || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'batting', 'sixes', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playerStats[player._id]?.batting?.isOut || false}
                      onChange={(e) => updatePlayerStat(player._id, 'batting', 'isOut', e.target.checked)}
                    />
                    <span>Out</span>
                  </label>
                </div>
              </div>

              {/* Bowling Stats */}
              <div className="stats-section">
                <div className="section-title">Bowling</div>
                <div className="stats-row">
                  <label>
                    <span>Overs</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={playerStats[player._id]?.bowling?.overs || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'bowling', 'overs', parseFloat(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Runs</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.bowling?.runsConceded || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'bowling', 'runsConceded', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Wkts</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.bowling?.wickets || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'bowling', 'wickets', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Maidens</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.bowling?.maidens || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'bowling', 'maidens', parseInt(e.target.value) || 0)}
                    />
                  </label>
                </div>
              </div>

              {/* Fielding Stats */}
              <div className="stats-section">
                <div className="section-title">Fielding</div>
                <div className="stats-row">
                  <label>
                    <span>Catches</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.fielding?.catches || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'fielding', 'catches', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Stumpings</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.fielding?.stumpings || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'fielding', 'stumpings', parseInt(e.target.value) || 0)}
                    />
                  </label>
                  <label>
                    <span>Run Outs</span>
                    <input
                      type="number"
                      min="0"
                      value={playerStats[player._id]?.fielding?.runOuts || 0}
                      onChange={(e) => updatePlayerStat(player._id, 'fielding', 'runOuts', parseInt(e.target.value) || 0)}
                    />
                  </label>
                </div>
              </div>

              {/* Manual Points Override */}
              <div className="stats-section">
                <div className="section-title">Fantasy Points</div>
                <div className="stats-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={playerStats[player._id]?.isManualPoints || false}
                      onChange={(e) => {
                        setPlayerStats(prev => ({
                          ...prev,
                          [player._id]: {
                            ...prev[player._id],
                            isManualPoints: e.target.checked
                          }
                        }))
                      }}
                    />
                    <span>Manual</span>
                  </label>
                  <label>
                    <span>Points</span>
                    <input
                      type="number"
                      value={playerStats[player._id]?.fantasyPoints || 0}
                      onChange={(e) => {
                        setPlayerStats(prev => ({
                          ...prev,
                          [player._id]: {
                            ...prev[player._id],
                            fantasyPoints: parseInt(e.target.value) || 0
                          }
                        }))
                      }}
                      disabled={!playerStats[player._id]?.isManualPoints}
                    />
                  </label>
                </div>
              </div>

              <button
                className="btn btn-sm btn-primary save-player-btn"
                onClick={() => savePlayerStats(player._id)}
                disabled={saving}
              >
                Save
              </button>
            </div>
          ))
        )}
      </div>

      {/* Match Stats for Predictions */}
      <div className="match-stats-section">
        <h3>Match Stats (for Predictions)</h3>
        <div className="match-stats-row">
          <label>
            <span>Powerplay Score</span>
            <input
              type="number"
              min="0"
              value={matchStats.powerplayScore}
              onChange={(e) => setMatchStats(prev => ({ ...prev, powerplayScore: parseInt(e.target.value) || 0 }))}
            />
          </label>
        </div>

        <h3 style={{ marginTop: '1rem' }}>Bonus Question Answers (Correct Values)</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Fill in the correct answers before calculating fantasy points. Leave blank if not applicable.
        </p>
        <div className="match-stats-row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <label>
            <span>Abhishek Sharma Score</span>
            <input
              type="number"
              min="0"
              placeholder="Actual runs"
              value={predictionAnswers.abhishekSharmaScore}
              onChange={(e) => setPredictionAnswers(prev => ({ ...prev, abhishekSharmaScore: e.target.value }))}
            />
          </label>
          <label>
            <span>Indian Team Catches</span>
            <input
              type="number"
              min="0"
              placeholder="Total catches"
              value={predictionAnswers.indianTeamCatches}
              onChange={(e) => setPredictionAnswers(prev => ({ ...prev, indianTeamCatches: e.target.value }))}
            />
          </label>
          <label>
            <span>India Score Above 230?</span>
            <select
              value={predictionAnswers.indiaScoreAbove230}
              onChange={(e) => setPredictionAnswers(prev => ({ ...prev, indiaScoreAbove230: e.target.value }))}
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            <span>Any Team All Out?</span>
            <select
              value={predictionAnswers.anyTeamAllOut}
              onChange={(e) => setPredictionAnswers(prev => ({ ...prev, anyTeamAllOut: e.target.value }))}
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>
        <div className="match-stats-row" style={{ marginTop: '0.75rem' }}>
          <label style={{ flex: '1 1 100%' }}>
            <span>Man of the Match</span>
            <select
              value={predictionAnswers.manOfMatch.playerId}
              onChange={(e) => {
                const allPlayers = [...team1Players, ...team2Players]
                const player = allPlayers.find(p => p._id === e.target.value)
                setPredictionAnswers(prev => ({
                  ...prev,
                  manOfMatch: { playerId: e.target.value, playerName: player?.name || '' }
                }))
              }}
            >
              <option value="">Not set</option>
              {[...team1Players, ...team2Players].map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="btn btn-primary"
          onClick={saveAllStats}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Stats'}
        </button>
        <button
          className="btn btn-success"
          onClick={async () => {
            await updateMatchStatsSnapshot()
            await calculatePoints()
          }}
          disabled={saving}
        >
          {saving ? 'Calculating...' : 'Calculate Fantasy Points'}
        </button>
      </div>

      <style>{`
        .scorecard-entry {
          background: var(--bg-card);
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid var(--border-primary);
        }
        .scorecard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--border-primary);
        }
        .scorecard-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }
        .team-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        .team-tab {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          border: 2px solid var(--border-primary);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
          color: var(--text-secondary);
        }
        .team-tab:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        .team-tab.active {
          border-color: var(--primary);
          background: var(--primary);
          color: white;
        }
        .players-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }
        .player-stats-card {
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          background: var(--bg-tertiary);
        }
        .player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
          padding-bottom: var(--spacing-xs);
          border-bottom: 1px solid var(--border-primary);
        }
        .player-name {
          font-weight: 600;
          color: var(--text-primary);
        }
        .player-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .stats-section {
          margin-bottom: var(--spacing-xs);
        }
        .section-title {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .stats-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
        }
        .stats-row label {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stats-row label span {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .stats-row input[type="number"] {
          width: 60px;
          padding: 4px 6px;
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .stats-row input[type="number"]:focus {
          outline: none;
          border-color: var(--primary);
        }
        .stats-row input[type="number"]:disabled {
          background: var(--bg-primary);
          color: var(--text-muted);
        }
        .checkbox-label {
          flex-direction: row !important;
          align-items: center;
          gap: 4px !important;
        }
        .checkbox-label input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
        }
        .save-player-btn {
          width: 100%;
          margin-top: var(--spacing-sm);
        }
        .match-stats-section {
          background: var(--bg-tertiary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          border: 1px solid var(--border-primary);
        }
        .match-stats-section h3 {
          margin: 0 0 var(--spacing-sm) 0;
          font-size: 1rem;
          color: var(--accent);
        }
        .match-stats-row {
          display: flex;
          gap: var(--spacing-md);
        }
        .match-stats-row label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .match-stats-row label span {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .match-stats-row input {
          padding: 6px 10px;
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-sm);
          width: 100px;
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        .match-stats-row input:focus {
          outline: none;
          border-color: var(--primary);
        }
        .action-buttons {
          display: flex;
          gap: var(--spacing-md);
          justify-content: center;
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--border-primary);
        }
      `}</style>
    </div>
  )
}
