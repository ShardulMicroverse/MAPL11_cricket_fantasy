import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { teamService } from '../services/teamService'
import Loading from '../components/common/Loading'

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const sortAndRankTeams = (teams) => {
  return [...teams]
    .sort((a, b) => {
      const winsA = a.stats?.wins || 0
      const winsB = b.stats?.wins || 0
      if (winsB !== winsA) return winsB - winsA
      const pointsA = a.stats?.totalPoints || 0
      const pointsB = b.stats?.totalPoints || 0
      return pointsB - pointsA
    })
    .map((team, index) => ({ ...team, rank: index + 1 }))
}

// ─── Fireworks Canvas ─────────────────────────────────────────────────────────
function FireworksCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const rand = (a, b) => Math.random() * (b - a) + a
    const particles = [], rockets = []
    const PALETTES = [
      ['hsla(45,100%,75%,1)', 'hsla(38,100%,62%,1)', 'hsla(55,100%,85%,1)'],
      ['hsla(0,0%,100%,1)', 'hsla(210,100%,88%,1)', 'hsla(180,80%,85%,1)'],
      ['hsla(10,100%,68%,1)', 'hsla(25,100%,62%,1)', 'hsla(50,100%,72%,1)'],
      ['hsla(270,100%,78%,1)', 'hsla(300,100%,72%,1)', 'hsla(240,100%,80%,1)'],
    ]
    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color
        const angle = rand(0, Math.PI * 2), speed = rand(1.5, 7)
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed
        this.alpha = 1; this.decay = rand(0.013, 0.022); this.radius = rand(1.5, 3)
        this.gravity = 0.09; this.trail = []
      }
      update() {
        this.trail.push({ x: this.x, y: this.y, a: this.alpha })
        if (this.trail.length > 6) this.trail.shift()
        this.vy += this.gravity; this.x += this.vx; this.y += this.vy; this.vx *= 0.98; this.alpha -= this.decay
      }
      draw() {
        this.trail.forEach((p, i) => {
          ctx.beginPath(); ctx.arc(p.x, p.y, this.radius * (i / this.trail.length) * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = this.color.replace('1)', `${p.a * 0.3})`); ctx.fill()
        })
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = this.color.replace('1)', `${this.alpha})`); ctx.fill()
      }
    }
    const burst = (x, y) => {
      const palette = PALETTES[Math.floor(rand(0, PALETTES.length))]
      for (let i = 0; i < Math.floor(rand(55, 85)); i++)
        particles.push(new Particle(x, y, palette[Math.floor(rand(0, palette.length))]))
    }
    class Rocket {
      constructor() {
        this.x = rand(canvas.width * 0.08, canvas.width * 0.92); this.y = canvas.height + 5
        this.vy = rand(-13, -9); this.vx = rand(-1.5, 1.5)
        this.targetY = rand(canvas.height * 0.08, canvas.height * 0.5)
        this.exploded = false; this.trail = []; this.dead = false
      }
      update() {
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > 10) this.trail.shift()
        this.x += this.vx; this.y += this.vy; this.vy += 0.3
        if (!this.exploded && this.y <= this.targetY) { this.exploded = true; burst(this.x, this.y) }
        if (this.exploded && this.y > canvas.height + 60) this.dead = true
      }
      draw() {
        if (this.exploded) return
        this.trail.forEach((p, i) => {
          ctx.beginPath(); ctx.arc(p.x, p.y, (i / this.trail.length) * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(45,100%,82%,${i / this.trail.length})`; ctx.fill()
        })
        ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
      }
    }
    let lastLaunch = 0
    const loop = (ts) => {
      ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (ts - lastLaunch > 650) { rockets.push(new Rocket()); lastLaunch = ts }
      for (let i = rockets.length - 1; i >= 0; i--) { rockets[i].update(); rockets[i].draw(); if (rockets[i].dead) rockets.splice(i, 1) }
      for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].alpha <= 0) particles.splice(i, 1) }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }} />
}

// ─── Champion Team Card ───────────────────────────────────────────────────────
function ChampionTeamCard({ team }) {
  if (!team) return null
  const members = team.members || []

  return (
    <Link to={`/team/${team._id}`} style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20,
        background: 'linear-gradient(160deg, #0a0f1e 0%, #0d1a2e 50%, #0a0f1e 100%)',
        border: '1.5px solid rgba(255,215,0,0.3)',
        boxShadow: '0 8px 40px rgba(255,200,0,0.15), 0 2px 8px rgba(0,0,0,0.4)',
        minHeight: 220,
      }}>
        <FireworksCanvas />

        {/* Star field */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {[...Array(24)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
              borderRadius: '50%', background: 'white',
              opacity: Math.random() * 0.4 + 0.1,
              animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite alternate`,
            }} />
          ))}
        </div>

        {/* Gold glow orb */}
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)', pointerEvents: 'none',
          animation: 'glowPulse 2s ease-in-out infinite alternate',
        }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '20px 20px 16px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase',
                  color: '#FFD700', background: 'rgba(255,215,0,0.12)',
                  padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.25)',
                }}>🏆 #1 Champions</span>
              </div>
              <div style={{
                fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 900, lineHeight: 1.1,
                background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                maxWidth: 200,
              }}>{team.teamName}</div>
            </div>

            {/* Trophy */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                fontSize: 13, display: 'block', marginBottom: -4,
                filter: 'drop-shadow(0 0 6px rgba(255,200,0,0.7))',
                animation: 'crownBob 2s ease-in-out infinite alternate',
              }}>👑</div>
              <div style={{
                fontSize: 42,
                filter: 'drop-shadow(0 0 16px rgba(255,200,0,0.6))',
                animation: 'trophyFloat 2.5s ease-in-out infinite alternate',
              }}>🏆</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', marginBottom: 16,
            background: 'rgba(255,215,0,0.06)', borderRadius: 12,
            border: '1px solid rgba(255,215,0,0.12)', overflow: 'hidden',
          }}>
            {[
              { val: team.stats?.wins || 0, label: 'Wins' },
              { val: team.stats?.totalPoints || 0, label: 'Points' },
              { val: team.stats?.matchesPlayed || 0, label: 'Matches' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '10px 0',
                borderRight: i < 2 ? '1px solid rgba(255,215,0,0.1)' : 'none',
              }}>
                <div style={{
                  fontFamily: "'Georgia', serif", fontSize: 20, fontWeight: 900,
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>{s.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Members — full names */}
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase',
              color: 'rgba(255,215,0,0.5)', marginBottom: 10,
            }}>Squad</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {members.map((m, i) => {
                const name = m.userId?.displayName || m.displayName || 'Teammate'
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: `memberFadeIn 0.5s ease ${0.1 + i * 0.08}s both`,
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      background: i === 0
                        ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                      color: i === 0 ? '#3d2800' : 'rgba(255,255,255,0.7)',
                      border: i === 0 ? '1.5px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: i === 0 ? '0 0 10px rgba(255,200,0,0.35)' : 'none',
                    }}>{getInitials(name)}</div>

                    <div style={{
                      fontSize: 13, fontWeight: i === 0 ? 700 : 500,
                      color: i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.62)',
                    }}>{name}</div>

                    {i === 0 && (
                      <div style={{
                        marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                        color: '#FFD700', background: 'rgba(255,215,0,0.12)',
                        padding: '2px 7px', borderRadius: 5,
                        border: '1px solid rgba(255,215,0,0.2)',
                        letterSpacing: '0.1em', flexShrink: 0,
                      }}>★ CAPTAIN</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes glowPulse    { from { opacity:0.6; transform:translateX(-50%) scale(0.9)  } to { opacity:1; transform:translateX(-50%) scale(1.15) } }
          @keyframes crownBob     { from { transform:translateY(0) rotate(-8deg) } to { transform:translateY(-4px) rotate(8deg) } }
          @keyframes trophyFloat  { from { transform:translateY(0) rotate(-3deg) } to { transform:translateY(-5px) rotate(3deg) } }
          @keyframes starTwinkle  { from { opacity:0.1 } to { opacity:0.6 } }
          @keyframes memberFadeIn { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
        `}</style>
      </div>
    </Link>
  )
}

// ─── Main TeamsPage ───────────────────────────────────────────────────────────
export default function TeamsPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)

  useEffect(() => { fetchTeams() }, [page, search])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const res = await teamService.getAllPermanentTeams(page, 20, search)
      const sorted = sortAndRankTeams(res.data.teams || [])
      setTeams(sorted)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }

  // Show champion card only on page 1 with no active search
  const championTeam = page === 1 && !search ? teams[0] : null
  const restTeams = page === 1 && !search ? teams.slice(1) : teams

  return (
    <div className="teams-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>All Teams</h2>
        <Link to="/teams/leaderboard" className="header-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21V11"/>
            <path d="M12 21V7"/>
            <path d="M16 21V13"/>
          </svg>
        </Link>
      </div>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Search teams..." value={search} onChange={handleSearch} />
        {search && (
          <button className="clear-search" onClick={() => setSearch('')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <Loading message="Loading teams" />
      ) : teams.length === 0 ? (
        <div className="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No teams found</p>
          <span>{search ? 'Try a different search term' : 'Teams will appear here once formed'}</span>
        </div>
      ) : (
        <>
          {/* #1 Champion showcase */}
          {championTeam && <ChampionTeamCard team={championTeam} />}

          {/* Remaining teams */}
          {restTeams.length > 0 && (
            <div className="teams-list">
              {restTeams.map((team) => (
                <Link key={team._id} to={`/team/${team._id}`} className="team-list-item">
                  <div className="team-list-rank">#{team.rank}</div>
                  <div className="team-list-info">
                    <div className="team-list-name">{team.teamName}</div>
                    <div className="team-list-members">
                      {team.members?.slice(0, 4).map((m, i) => (
                        <div key={i} className="team-list-avatar">
                          {getInitials(m.userId?.displayName)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="team-list-stats">
                    <div className="team-list-points">{team.stats?.totalPoints || 0}</div>
                    <div className="team-list-meta">{team.stats?.wins || 0}W</div>
                  </div>
                  <svg className="team-list-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </button>
              <span className="pagination-info">Page {page} of {pagination.pages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}  const [pagination, setPagination] = useState(null)

  useEffect(() => {
    fetchTeams()
  }, [page, search])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const res = await teamService.getAllPermanentTeams(page, 20, search)
      const sorted = sortAndRankTeams(res.data.teams || [])
      setTeams(sorted)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2>All Teams</h2>
        <Link to="/teams/leaderboard" className="header-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 21V11"/>
            <path d="M12 21V7"/>
            <path d="M16 21V13"/>
          </svg>
        </Link>
      </div>

      <div className="search-bar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={handleSearch}
        />
        {search && (
          <button className="clear-search" onClick={() => setSearch('')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <Loading message="Loading teams" />
      ) : teams.length === 0 ? (
        <div className="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>No teams found</p>
          <span>{search ? 'Try a different search term' : 'Teams will appear here once formed'}</span>
        </div>
      ) : (
        <>
          <div className="teams-list">
            {teams.map((team) => (
              <Link key={team._id} to={`/team/${team._id}`} className="team-list-item">
                <div className="team-list-rank">#{team.rank}</div>
                <div className="team-list-info">
                  <div className="team-list-name">{team.teamName}</div>
                  <div className="team-list-members">
                    {team.members?.slice(0, 4).map((m, i) => (
                      <div key={i} className="team-list-avatar">
                        {getInitials(m.userId?.displayName)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="team-list-stats">
                  <div className="team-list-points">{team.stats?.totalPoints || 0}</div>
                  <div className="team-list-meta">{team.stats?.wins || 0}W</div>
                </div>
                <svg className="team-list-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
