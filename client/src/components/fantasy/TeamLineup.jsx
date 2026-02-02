import { useState } from 'react'

export default function TeamLineup({ players, captain, viceCaptain, onClose }) {
  const [viewMode, setViewMode] = useState('field') // 'field' or 'list'

  // Group players by role
  const wicketKeepers = players.filter(p => p.role === 'Wicket-Keeper')
  const batsmen = players.filter(p => p.role === 'Batsman')
  const allRounders = players.filter(p => p.role === 'All-Rounder')
  const bowlers = players.filter(p => p.role === 'Bowler')

  const PlayerBadge = ({ player, size = 'normal' }) => {
    const isCaptain = player._id === captain
    const isViceCaptain = player._id === viceCaptain
    const sizeClass = size === 'small' ? 'player-badge-sm' : ''

    return (
      <div className={`player-badge ${sizeClass}`}>
        <div className="player-photo">
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
          <span className="photo-fallback" style={{ display: player.image ? 'none' : 'flex' }}>
            {player.name.charAt(0)}
          </span>
          {(isCaptain || isViceCaptain) && (
            <span className={`captain-badge ${isCaptain ? 'c' : 'vc'}`}>
              {isCaptain ? 'C' : 'VC'}
            </span>
          )}
        </div>
        <div className="player-badge-name">{player.shortName || player.name.split(' ').pop()}</div>
        <div className="player-badge-points">{player.creditValue} cr</div>
      </div>
    )
  }

  return (
    <div className="team-lineup-overlay">
      <div className="team-lineup-modal">
        {/* Header */}
        <div className="lineup-header">
          <h2>My Fantasy Team</h2>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'field' ? 'active' : ''}`}
              onClick={() => setViewMode('field')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <ellipse cx="12" cy="12" rx="3" ry="8"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
              </svg>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/>
                <line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/>
                <line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Field View */}
        {viewMode === 'field' && (
          <div className="field-view">
            <div className="cricket-field">
              {/* Pitch graphic */}
              <div className="pitch"></div>
              <div className="pitch-center"></div>

              {/* Wicket Keepers - Behind stumps */}
              <div className="field-row wk-row">
                {wicketKeepers.map(p => <PlayerBadge key={p._id} player={p} />)}
              </div>

              {/* Batsmen - Inner ring */}
              <div className="field-row bat-row">
                {batsmen.map(p => <PlayerBadge key={p._id} player={p} />)}
              </div>

              {/* All Rounders - Middle */}
              <div className="field-row ar-row">
                {allRounders.map(p => <PlayerBadge key={p._id} player={p} />)}
              </div>

              {/* Bowlers - Outer ring */}
              <div className="field-row bowl-row">
                {bowlers.map(p => <PlayerBadge key={p._id} player={p} />)}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="list-view">
            {/* Wicket Keepers */}
            {wicketKeepers.length > 0 && (
              <div className="role-section">
                <div className="role-header">
                  <span className="role-icon wk">WK</span>
                  <span className="role-title">Wicket-Keeper ({wicketKeepers.length})</span>
                </div>
                <div className="role-players">
                  {wicketKeepers.map(p => (
                    <div key={p._id} className="list-player">
                      <div className="list-player-photo">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="list-player-info">
                        <div className="list-player-name">
                          {p.name}
                          {p._id === captain && <span className="badge-c">C</span>}
                          {p._id === viceCaptain && <span className="badge-vc">VC</span>}
                        </div>
                        <div className="list-player-team">{p.team}</div>
                      </div>
                      <div className="list-player-credits">{p.creditValue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batsmen */}
            {batsmen.length > 0 && (
              <div className="role-section">
                <div className="role-header">
                  <span className="role-icon bat">BAT</span>
                  <span className="role-title">Batsmen ({batsmen.length})</span>
                </div>
                <div className="role-players">
                  {batsmen.map(p => (
                    <div key={p._id} className="list-player">
                      <div className="list-player-photo">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="list-player-info">
                        <div className="list-player-name">
                          {p.name}
                          {p._id === captain && <span className="badge-c">C</span>}
                          {p._id === viceCaptain && <span className="badge-vc">VC</span>}
                        </div>
                        <div className="list-player-team">{p.team}</div>
                      </div>
                      <div className="list-player-credits">{p.creditValue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Rounders */}
            {allRounders.length > 0 && (
              <div className="role-section">
                <div className="role-header">
                  <span className="role-icon ar">AR</span>
                  <span className="role-title">All-Rounders ({allRounders.length})</span>
                </div>
                <div className="role-players">
                  {allRounders.map(p => (
                    <div key={p._id} className="list-player">
                      <div className="list-player-photo">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="list-player-info">
                        <div className="list-player-name">
                          {p.name}
                          {p._id === captain && <span className="badge-c">C</span>}
                          {p._id === viceCaptain && <span className="badge-vc">VC</span>}
                        </div>
                        <div className="list-player-team">{p.team}</div>
                      </div>
                      <div className="list-player-credits">{p.creditValue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bowlers */}
            {bowlers.length > 0 && (
              <div className="role-section">
                <div className="role-header">
                  <span className="role-icon bowl">BOWL</span>
                  <span className="role-title">Bowlers ({bowlers.length})</span>
                </div>
                <div className="role-players">
                  {bowlers.map(p => (
                    <div key={p._id} className="list-player">
                      <div className="list-player-photo">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : (
                          <span>{p.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="list-player-info">
                        <div className="list-player-name">
                          {p.name}
                          {p._id === captain && <span className="badge-c">C</span>}
                          {p._id === viceCaptain && <span className="badge-vc">VC</span>}
                        </div>
                        <div className="list-player-team">{p.team}</div>
                      </div>
                      <div className="list-player-credits">{p.creditValue}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Credits */}
            <div className="total-credits">
              <span>Total Credits Used</span>
              <span className="credits-value">
                {players.reduce((sum, p) => sum + p.creditValue, 0).toFixed(1)} / 100
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .team-lineup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-md);
          animation: fadeIn 0.2s ease;
        }

        .team-lineup-modal {
          background: var(--white);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .lineup-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--gray-200);
          background: var(--primary-gradient);
          color: white;
        }

        .lineup-header h2 {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .view-toggle {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px;
          border-radius: var(--radius-md);
        }

        .toggle-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: rgba(255, 255, 255, 0.3);
          color: white;
        }

        .toggle-btn svg {
          width: 18px;
          height: 18px;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn svg {
          width: 18px;
          height: 18px;
        }

        /* Field View */
        .field-view {
          flex: 1;
          overflow: auto;
          padding: var(--spacing-md);
        }

        .cricket-field {
          background: linear-gradient(180deg, #2d5a27 0%, #1e4620 50%, #2d5a27 100%);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg) var(--spacing-sm);
          min-height: 450px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .cricket-field::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }

        .pitch {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 100px;
          background: #c9a86c;
          border-radius: 4px;
        }

        .pitch-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 20px;
          background: #8b6914;
        }

        .field-row {
          display: flex;
          justify-content: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }

        .wk-row { margin-top: var(--spacing-sm); }
        .bat-row { margin-top: var(--spacing-md); }
        .ar-row { margin-top: auto; }
        .bowl-row { margin-bottom: var(--spacing-sm); }

        .player-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 60px;
        }

        .player-photo {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          overflow: hidden;
          position: relative;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .player-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .captain-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 0.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .captain-badge.c {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #78350f;
        }

        .captain-badge.vc {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          color: white;
        }

        .player-badge-name {
          margin-top: 4px;
          font-size: 0.65rem;
          font-weight: 600;
          color: white;
          text-align: center;
          max-width: 60px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .player-badge-points {
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.8);
        }

        /* List View */
        .list-view {
          flex: 1;
          overflow: auto;
          padding: var(--spacing-md);
        }

        .role-section {
          margin-bottom: var(--spacing-md);
        }

        .role-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .role-icon {
          width: 36px;
          height: 24px;
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .role-icon.wk { background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); }
        .role-icon.bat { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .role-icon.ar { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .role-icon.bowl { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }

        .role-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--gray-700);
        }

        .role-players {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .list-player {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: var(--gray-50);
          border-radius: var(--radius-md);
        }

        .list-player-photo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--primary-gradient);
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
        }

        .list-player-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .list-player-info {
          flex: 1;
          min-width: 0;
        }

        .list-player-name {
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .badge-c, .badge-vc {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }

        .badge-c {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #78350f;
        }

        .badge-vc {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          color: white;
        }

        .list-player-team {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .list-player-credits {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--primary);
        }

        .total-credits {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--gray-100);
          border-radius: var(--radius-md);
          margin-top: var(--spacing-md);
          font-weight: 600;
        }

        .credits-value {
          color: var(--primary);
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  )
}
