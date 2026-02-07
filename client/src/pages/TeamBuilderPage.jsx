import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchService } from '../services/matchService'
import { fantasyService } from '../services/fantasyService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

// Team composition rules (matching backend)
const TEAM_RULES = {
  TOTAL_PLAYERS: 11,
  MAX_CREDITS: 100,
  ROLE_REQUIREMENTS: {
    'Wicket-Keeper': { min: 1, max: 11, label: 'WK' },
    'Batsman': { min: 2, max: 11, label: 'BAT' },
    'All-Rounder': { min: 1, max: 11, label: 'AR' },
    'Bowler': { min: 2, max: 11, label: 'BOWL' }
  },
  MAX_PLAYERS_PER_TEAM: 7
}

export default function TeamBuilderPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [captain, setCaptain] = useState(null)
  const [viceCaptain, setViceCaptain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [step, setStep] = useState(1)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, playersRes, teamRes] = await Promise.all([
          matchService.getMatch(matchId),
          matchService.getMatchPlayers(matchId),
          fantasyService.getFantasyTeam(matchId)
        ])
        setMatch(matchRes.data)
        setPlayers(playersRes.data || [])

        if (teamRes.data) {
          const existingPlayers = teamRes.data.players.map(p => p.playerId._id || p.playerId)
          setSelectedPlayers(existingPlayers)
          const captainPlayer = teamRes.data.players.find(p => p.isCaptain)
          const vcPlayer = teamRes.data.players.find(p => p.isViceCaptain)
          if (captainPlayer) setCaptain(captainPlayer.playerId._id || captainPlayer.playerId)
          if (vcPlayer) setViceCaptain(vcPlayer.playerId._id || vcPlayer.playerId)
        }
      } catch (error) {
        showError('Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId])

  const filteredPlayers = useMemo(() => {
    if (filter === 'all') return players
    return players.filter(p => p.role === filter)
  }, [players, filter])

  const selectedPlayerObjects = useMemo(() => {
    return players.filter(p => selectedPlayers.includes(p._id))
  }, [players, selectedPlayers])

  const usedCredits = useMemo(() => {
    return selectedPlayerObjects.reduce((sum, p) => sum + p.creditValue, 0)
  }, [selectedPlayerObjects])

  const remainingCredits = TEAM_RULES.MAX_CREDITS - usedCredits

  // Calculate role counts
  const roleCounts = useMemo(() => {
    const counts = {}
    Object.keys(TEAM_RULES.ROLE_REQUIREMENTS).forEach(role => {
      counts[role] = 0
    })
    selectedPlayerObjects.forEach(p => {
      if (counts[p.role] !== undefined) {
        counts[p.role]++
      }
    })
    return counts
  }, [selectedPlayerObjects])

  // Calculate team counts (for max 7 per team validation)
  const teamCounts = useMemo(() => {
    const counts = {}
    selectedPlayerObjects.forEach(p => {
      counts[p.team] = (counts[p.team] || 0) + 1
    })
    return counts
  }, [selectedPlayerObjects])

  // Check if a player can be selected
  const canSelectPlayer = (player) => {
    // Already selected - can always toggle off
    if (selectedPlayers.includes(player._id)) return true

    // Team is full
    if (selectedPlayers.length >= TEAM_RULES.TOTAL_PLAYERS) return false

    // Not enough credits
    if (player.creditValue > remainingCredits) return false

    // Role max reached
    const roleConfig = TEAM_RULES.ROLE_REQUIREMENTS[player.role]
    if (roleConfig && roleCounts[player.role] >= roleConfig.max) return false

    // Team max reached (7 from one team)
    if ((teamCounts[player.team] || 0) >= TEAM_RULES.MAX_PLAYERS_PER_TEAM) return false

    return true
  }

  // Get reason why player can't be selected
  const getDisabledReason = (player) => {
    if (selectedPlayers.includes(player._id)) return null

    if (selectedPlayers.length >= TEAM_RULES.TOTAL_PLAYERS) {
      return 'Team is full'
    }

    if (player.creditValue > remainingCredits) {
      return 'Not enough credits'
    }

    const roleConfig = TEAM_RULES.ROLE_REQUIREMENTS[player.role]
    if (roleConfig && roleCounts[player.role] >= roleConfig.max) {
      return `Max ${roleConfig.max} ${player.role}s allowed`
    }

    if ((teamCounts[player.team] || 0) >= TEAM_RULES.MAX_PLAYERS_PER_TEAM) {
      return `Max ${TEAM_RULES.MAX_PLAYERS_PER_TEAM} from ${player.team}`
    }

    return null
  }

  const togglePlayer = (playerId) => {
    const player = players.find(p => p._id === playerId)
    if (!player) return

    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        // Deselect
        if (captain === playerId) setCaptain(null)
        if (viceCaptain === playerId) setViceCaptain(null)
        return prev.filter(id => id !== playerId)
      } else {
        // Check if can select
        if (!canSelectPlayer(player)) {
          const reason = getDisabledReason(player)
          if (reason) showError(reason)
          return prev
        }
        return [...prev, playerId]
      }
    })
  }

  const handleContinue = () => {
    // Validate total players
    if (selectedPlayers.length !== TEAM_RULES.TOTAL_PLAYERS) {
      showError(`Please select ${TEAM_RULES.TOTAL_PLAYERS} players`)
      return
    }

    // Validate role minimums
    for (const [role, config] of Object.entries(TEAM_RULES.ROLE_REQUIREMENTS)) {
      const count = roleCounts[role] || 0
      if (count < config.min) {
        showError(`Select at least ${config.min} ${role}(s)`)
        return
      }
    }

    setStep(2)
  }

  const handleSave = async () => {
    if (!captain || !viceCaptain) {
      showError('Please select captain and vice-captain')
      return
    }

    setSaving(true)
    try {
      await fantasyService.createOrUpdateTeam(matchId, {
        players: selectedPlayers,
        captainId: captain,
        viceCaptainId: viceCaptain
      })
      success('Team saved successfully!')
      navigate(`/match/${matchId}`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (!match) return <div className="empty-state-card"><p>Match not found</p></div>

  return (
    <div className="team-builder-page">
      {/* Credit Counter */}
      <div className="credit-counter">
        <div>
          <div className="credit-value">{selectedPlayers.length}/{TEAM_RULES.TOTAL_PLAYERS}</div>
          <div className="credit-label">Players</div>
        </div>
        <div>
          <div className="credit-value">{remainingCredits.toFixed(1)}</div>
          <div className="credit-label">Credits Left</div>
        </div>
      </div>

      {/* Role Count Display */}
      <div className="role-counter">
        {Object.entries(TEAM_RULES.ROLE_REQUIREMENTS).map(([role, config]) => {
          const count = roleCounts[role] || 0
          const isMinMet = count >= config.min
          const isMaxReached = count >= config.max

          return (
            <div
              key={role}
              className={`role-box ${isMaxReached ? 'max-reached' : ''} ${isMinMet ? 'min-met' : 'min-pending'}`}
            >
              <div className="role-label">{config.label}</div>
              <div className="role-count">{count}</div>
              <div className="role-range">{config.min}-{config.max}</div>
            </div>
          )
        })}
      </div>

      {step === 1 ? (
        <>
          {/* Role Filter */}
          {/* Role Filter */}
<div className="tabs">
  {['all', 'Wicket-Keeper', 'Batsman', 'All-Rounder', 'Bowler'].map(role => (
    <button
      key={role}
      className={`tab ${filter === role ? 'active' : ''}`}
      onClick={() => setFilter(role)}
    >
      {role === 'all' ? 'All' : TEAM_RULES.ROLE_REQUIREMENTS[role]?.label || role}
    </button>
  ))}
</div>

          {/* Players List */}
          <div className="players-list">
            {filteredPlayers.map(player => {
              const isSelected = selectedPlayers.includes(player._id)
              const canSelect = canSelectPlayer(player)
              const disabledReason = getDisabledReason(player)

              return (
                <div
                  key={player._id}
                  className={`player-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                  onClick={() => canSelect && togglePlayer(player._id)}
                  title={disabledReason || ''}
                >
                  <div className="player-avatar">
                    {player.image ? (
                      <img
                        src={player.image}
                        alt={player.name}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <span style={{ display: player.image ? 'none' : 'flex' }}>
                      {player.name.charAt(0)}
                    </span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-meta">
                      <span className="player-team">{player.team}</span>
                      <span className="player-role">{player.role}</span>
                    </div>
                  </div>
                  <div className="player-credits">{player.creditValue}</div>
                  {isSelected && (
                    <div className="player-check">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--success)">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleContinue}
            disabled={selectedPlayers.length !== TEAM_RULES.TOTAL_PLAYERS}
          >
            Continue ({selectedPlayers.length}/{TEAM_RULES.TOTAL_PLAYERS})
          </button>
        </>
      ) : (
        <>
          {/* Captain Selection */}
          <div className="card mb-3">
            <div className="card-header">Select Captain & Vice-Captain</div>
            <div className="card-body">
              <p className="text-sm text-muted mb-3">
                Captain gets 2x points, Vice-captain gets 1.5x points
              </p>

              <div className="captain-selection-list">
                {selectedPlayerObjects.map(player => (
                  <div key={player._id} className="captain-row">
                    <div className="captain-player">
                      <div className="captain-avatar">
                        {player.image ? (
                          <img src={player.image} alt={player.name} />
                        ) : (
                          <span>{player.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="captain-info">
                        <div className="captain-name">{player.name}</div>
                        <div className="captain-role">{player.role}</div>
                      </div>
                    </div>
                    <div className="captain-buttons">
                      <button
                        className={`captain-btn ${captain === player._id ? 'active captain' : ''}`}
                        onClick={() => {
                          if (viceCaptain === player._id) setViceCaptain(null)
                          setCaptain(captain === player._id ? null : player._id)
                        }}
                      >
                        C
                      </button>
                      <button
                        className={`captain-btn ${viceCaptain === player._id ? 'active vice' : ''}`}
                        onClick={() => {
                          if (captain === player._id) setCaptain(null)
                          setViceCaptain(viceCaptain === player._id ? null : player._id)
                        }}
                      >
                        VC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleSave}
              disabled={saving || !captain || !viceCaptain}
            >
              {saving ? 'Saving...' : 'Save Team'}
            </button>
          </div>
        </>
      )}

      <style>{`
        .role-counter {
          display: flex;
          justify-content: space-between;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm);
          background: var(--bg-card);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }
        .role-box {
          flex: 1;
          text-align: center;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          background: var(--bg-tertiary);
          border: 2px solid transparent;
          transition: var(--transition-fast);
        }
        .role-box.min-pending {
          border-color: var(--warning);
        }
        .role-box.min-met {
          border-color: var(--success);
        }
        .role-box.max-reached {
          border-color: var(--error);
          opacity: 0.7;
        }
        .role-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .role-count {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .role-range {
          font-size: 0.6rem;
          color: var(--text-muted);
        }
        .player-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .player-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        }
        .player-avatar span {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-primary);
        }
        .player-check {
          margin-left: var(--spacing-sm);
          display: flex;
          align-items: center;
        }
        .captain-selection-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .captain-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .captain-player {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .captain-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--bg-card);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .captain-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .captain-avatar span {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .captain-info {
          min-width: 0;
        }
        .captain-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .captain-role {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .captain-buttons {
          display: flex;
          gap: var(--spacing-sm);
        }
        .captain-btn {
          width: 32px;
          height: 32px;
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-full);
          background: var(--bg-card);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.7rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .captain-btn:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        .captain-btn.active.captain {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .captain-btn.active.vice {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
      `}</style>
    </div>
  )
}
