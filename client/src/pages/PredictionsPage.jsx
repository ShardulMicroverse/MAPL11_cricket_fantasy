import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { predictionService } from '../services/predictionService'
import { matchService } from '../services/matchService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

export default function PredictionsPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [match, setMatch] = useState(null)
  const [options, setOptions] = useState(null)
  const [predictions, setPredictions] = useState({
    totalScore: { answer: '' },
    mostSixes: { answer: '', answerName: '' },
    mostFours: { answer: '', answerName: '' },
    mostWickets: { answer: '', answerName: '' },
    powerplayScore: { answer: '' },
    fiftiesCount: { answer: '' },
    abhishekSharmaScore: { answer: '' },
    indianTeamCatches: { answer: '' },
    indiaScoreAbove230: { answer: '' },
    manOfMatch: { answer: '', answerName: '' },
    anyTeamAllOut: { answer: '' }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, optionsRes, existingRes] = await Promise.all([
          matchService.getMatch(matchId),
          predictionService.getPredictionOptions(matchId),
          predictionService.getPredictions(matchId)
        ])
        setMatch(matchRes.data)
        setOptions(optionsRes.data)

        // Load existing predictions if any
        if (existingRes.data?.predictions) {
          setPredictions(existingRes.data.predictions)
        }
      } catch (error) {
        showError('Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId])

  const updatePrediction = (field, value, name = '') => {
    setPredictions(prev => ({
      ...prev,
      [field]: { answer: value, answerName: name }
    }))
  }

  const handleSubmit = async () => {
    // Validate at least one field is answered
    const allFields = ['totalScore', 'mostSixes', 'mostFours', 'mostWickets', 'powerplayScore', 'fiftiesCount', 'abhishekSharmaScore', 'indianTeamCatches', 'indiaScoreAbove230', 'manOfMatch', 'anyTeamAllOut']
    const hasAtLeastOne = allFields.some(f => predictions[f]?.answer !== '' && predictions[f]?.answer !== null && predictions[f]?.answer !== undefined)
    if (!hasAtLeastOne) {
      showError('Please answer at least one prediction question')
      return
    }

    setSaving(true)
    try {
      await predictionService.submitPredictions(matchId, predictions)
      success('Predictions saved!')
      navigate(`/match/${matchId}`)
    } catch (err) {
      showError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (!match) return <div className="empty-state">Match not found</div>

  // Fix: access nested data structure correctly
  const allPlayers = options?.data?.allPlayers || options?.allPlayers || []

  return (
    <div className="predictions-page">
      <h1 className="mb-md">Match Predictions</h1>
      <p className="text-gray text-sm mb-md">
        {match.team1.name} vs {match.team2.name}
      </p>

      <p className="text-gray text-sm mb-md" style={{ fontStyle: 'italic' }}>
        All questions are optional. Answer as many as you like.
      </p>

      <div className="card mb-md">
        <div className="card-body">
          {/* Total Score */}
          <div className="prediction-item">
            <label className="form-label">
              Total Match Runs (first + second innings)
              <span className="points-badge">+150 / -10</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 320"
              value={predictions.totalScore.answer}
              onChange={(e) => updatePrediction('totalScore', parseInt(e.target.value) || '')}
            />
          </div>

          {/* Powerplay Score */}
          <div className="prediction-item">
            <label className="form-label">
              Total Powerplay Runs (India powerplay runs)
              <span className="points-badge">+35 / -10</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 90"
              value={predictions.powerplayScore.answer}
              onChange={(e) => updatePrediction('powerplayScore', parseInt(e.target.value) || '')}
            />
          </div>

          {/* Fifties Count */}
          <div className="prediction-item">
            <label className="form-label">
              Number of 50+ Scores
              <span className="points-badge">+30 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.fiftiesCount.answer}
              onChange={(e) => updatePrediction('fiftiesCount', parseInt(e.target.value))}
            >
              <option value="">Select</option>
              {[0, 1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Most Sixes */}
          <div className="prediction-item">
            <label className="form-label">
              Player with Most Sixes
              <span className="points-badge">+40 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.mostSixes.answer}
              onChange={(e) => {
                const player = allPlayers.find(p => p._id === e.target.value)
                updatePrediction('mostSixes', e.target.value, player?.name || '')
              }}
            >
              <option value="">Select Player</option>
              {allPlayers.map(player => (
                <option key={player._id} value={player._id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>
          </div>

          {/* Most Fours */}
          <div className="prediction-item">
            <label className="form-label">
              Player with Most Fours
              <span className="points-badge">+40 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.mostFours.answer}
              onChange={(e) => {
                const player = allPlayers.find(p => p._id === e.target.value)
                updatePrediction('mostFours', e.target.value, player?.name || '')
              }}
            >
              <option value="">Select Player</option>
              {allPlayers.map(player => (
                <option key={player._id} value={player._id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>
          </div>

          {/* Most Wickets */}
          <div className="prediction-item">
            <label className="form-label">
              Player with Most Wickets
              <span className="points-badge">+40 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.mostWickets.answer}
              onChange={(e) => {
                const player = allPlayers.find(p => p._id === e.target.value)
                updatePrediction('mostWickets', e.target.value, player?.name || '')
              }}
            >
              <option value="">Select Player</option>
              {allPlayers.filter(p => p.role === 'Bowler' || p.role === 'All-Rounder').map(player => (
                <option key={player._id} value={player._id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bonus Prediction Questions */}
      <div className="card mb-md">
        <div className="card-body">
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Bonus Questions
          </h3>

          {/* Abhishek Sharma Score */}
          <div className="prediction-item">
            <label className="form-label">
              Score by Abhishek Sharma
              <span className="points-badge">+150 / ±10 buffer / -10</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 45 (leave blank to skip)"
              value={predictions.abhishekSharmaScore.answer}
              onChange={(e) => updatePrediction('abhishekSharmaScore', e.target.value === '' ? '' : parseInt(e.target.value))}
            />
          </div>

          {/* Indian Team Catches */}
          <div className="prediction-item">
            <label className="form-label">
              Number of catches taken by Indian team
              <span className="points-badge">+150 / -10</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g., 5 (leave blank to skip)"
              value={predictions.indianTeamCatches.answer}
              onChange={(e) => updatePrediction('indianTeamCatches', e.target.value === '' ? '' : parseInt(e.target.value))}
            />
          </div>

          {/* India Score Above 230 */}
          <div className="prediction-item">
            <label className="form-label">
              Will the score be above 230 in Indian innings?
              <span className="points-badge">+150 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.indiaScoreAbove230.answer}
              onChange={(e) => updatePrediction('indiaScoreAbove230', e.target.value)}
            >
              <option value="">Skip this question</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Man of the Match */}
          <div className="prediction-item">
            <label className="form-label">
              Who will get Man of the Match?
              <span className="points-badge">+150 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.manOfMatch.answer}
              onChange={(e) => {
                const player = allPlayers.find(p => p._id === e.target.value)
                updatePrediction('manOfMatch', e.target.value, player?.name || '')
              }}
            >
              <option value="">Skip this question</option>
              {allPlayers.map(player => (
                <option key={player._id} value={player._id}>
                  {player.name} ({player.team})
                </option>
              ))}
            </select>
          </div>

          {/* Any Team All Out */}
          <div className="prediction-item">
            <label className="form-label">
              Will any team be all out?
              <span className="points-badge">+150 / -10</span>
            </label>
            <select
              className="form-input"
              value={predictions.anyTeamAllOut.answer}
              onChange={(e) => updatePrediction('anyTeamAllOut', e.target.value)}
            >
              <option value="">Skip this question</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Predictions'}
      </button>

      <style>{`
        .prediction-item {
          margin-bottom: var(--spacing-lg);
        }
        .points-badge {
          display: inline-block;
          margin-left: var(--spacing-sm);
          padding: 2px 6px;
          background: var(--gray-100);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--gray-600);
        }
      `}</style>
    </div>
  )
}
