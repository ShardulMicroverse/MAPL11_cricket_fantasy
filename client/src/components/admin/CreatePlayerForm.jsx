import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../hooks/useToast'

export default function CreatePlayerForm({ onSuccess }) {
  const { success, error: showError } = useToast()
  const [saving, setSaving] = useState(false)
  const [player, setPlayer] = useState({
    name: '',
    shortName: '',
    team: '',
    role: 'Batsman',
    creditValue: 8.5,
    battingStyle: '',
    bowlingStyle: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!player.name || !player.team || !player.role) {
      showError('Please fill in required fields: Name, Team, Role')
      return
    }

    try {
      setSaving(true)
      await api.post('/admin/create-player', player)
      success(`Created player: ${player.name}`)

      // Reset form
      setPlayer({
        name: '',
        shortName: '',
        team: '',
        role: 'Batsman',
        creditValue: 8.5,
        battingStyle: '',
        bowlingStyle: ''
      })

      if (onSuccess) onSuccess()
    } catch (err) {
      showError(err.message || 'Failed to create player')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card mb-md">
      <div className="card-header">Create Player Manually</div>
      <div className="card-body">
        <p className="text-sm text-gray mb-md">
          Add a player without using the API. Useful for manual data entry.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Player Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Virat Kohli"
                value={player.name}
                onChange={(e) => setPlayer({ ...player, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Short Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., V Kohli (auto-generated)"
                value={player.shortName}
                onChange={(e) => setPlayer({ ...player, shortName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Team (Short Name) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., IND, AUS, NZ"
                value={player.team}
                onChange={(e) => setPlayer({ ...player, team: e.target.value.toUpperCase() })}
                maxLength={5}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-input"
                value={player.role}
                onChange={(e) => setPlayer({ ...player, role: e.target.value })}
                required
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Credit Value</label>
              <input
                type="number"
                className="form-input"
                min="6"
                max="12"
                step="0.5"
                value={player.creditValue}
                onChange={(e) => setPlayer({ ...player, creditValue: parseFloat(e.target.value) || 8.5 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Batting Style</label>
              <select
                className="form-input"
                value={player.battingStyle}
                onChange={(e) => setPlayer({ ...player, battingStyle: e.target.value })}
              >
                <option value="">Not specified</option>
                <option value="Right-hand bat">Right-hand bat</option>
                <option value="Left-hand bat">Left-hand bat</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bowling Style</label>
            <select
              className="form-input"
              value={player.bowlingStyle}
              onChange={(e) => setPlayer({ ...player, bowlingStyle: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="Right-arm fast">Right-arm fast</option>
              <option value="Right-arm medium">Right-arm medium</option>
              <option value="Right-arm off-spin">Right-arm off-spin</option>
              <option value="Right-arm leg-spin">Right-arm leg-spin</option>
              <option value="Left-arm fast">Left-arm fast</option>
              <option value="Left-arm medium">Left-arm medium</option>
              <option value="Left-arm spin">Left-arm spin</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Creating...' : 'Create Player'}
          </button>
        </form>
      </div>

      <style>{`
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }
        .form-group {
          margin-bottom: var(--spacing-sm);
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
