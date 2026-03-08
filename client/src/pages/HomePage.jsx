import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { matchService } from '../services/matchService'
import { teamService } from '../services/teamService'
import Loading from '../components/common/Loading'
import MatchCard from '../components/match/MatchCard'

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// ─── Fireworks Canvas ─────────────────────────────────────────────────────────
function FireworksCanvas({ fullScreen = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width = fullScreen ? window.innerWidth : canvas.offsetWidth
      canvas.height = fullScreen ? window.innerHeight : canvas.offsetHeight
    }
    resize()
    if (fullScreen) window.addEventListener('resize', resize)

    const rand = (a, b) => Math.random() * (b - a) + a
    const particles = [], rockets = []

    const PALETTES = [
      ['hsla(45,100%,75%,1)',  'hsla(38,100%,62%,1)',  'hsla(55,100%,85%,1)'],
      ['hsla(0,0%,100%,1)',   'hsla(210,100%,88%,1)',  'hsla(180,80%,85%,1)'],
      ['hsla(10,100%,68%,1)', 'hsla(25,100%,62%,1)',   'hsla(50,100%,72%,1)'],
      ['hsla(120,80%,65%,1)', 'hsla(140,90%,55%,1)',   'hsla(100,80%,70%,1)'],
      ['hsla(270,100%,78%,1)','hsla(300,100%,72%,1)',  'hsla(240,100%,80%,1)'],
      ['hsla(0,100%,68%,1)',  'hsla(15,100%,65%,1)',   'hsla(355,100%,72%,1)'],
    ]

    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color
        const angle = rand(0, Math.PI * 2), speed = rand(2, 9)
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed
        this.alpha = 1; this.decay = rand(0.01, 0.02); this.radius = rand(2, 4)
        this.gravity = 0.1; this.trail = []
      }
      update() {
        this.trail.push({ x: this.x, y: this.y, a: this.alpha })
        if (this.trail.length > 7) this.trail.shift()
        this.vy += this.gravity; this.x += this.vx; this.y += this.vy; this.vx *= 0.98; this.alpha -= this.decay
      }
      draw() {
        this.trail.forEach((p, i) => {
          ctx.beginPath(); ctx.arc(p.x, p.y, this.radius * (i / this.trail.length) * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = this.color.replace('1)', `${p.a * 0.35})`); ctx.fill()
        })
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
        ctx.fillStyle = this.color.replace('1)', `${this.alpha})`); ctx.fill()
      }
    }

    const burst = (x, y) => {
      const palette = PALETTES[Math.floor(rand(0, PALETTES.length))]
      const count = Math.floor(rand(80, 130))
      for (let i = 0; i < count; i++)
        particles.push(new Particle(x, y, palette[Math.floor(rand(0, palette.length))]))
    }

    class Rocket {
      constructor() {
        this.x = rand(canvas.width * 0.05, canvas.width * 0.95)
        this.y = canvas.height + 5
        this.vy = rand(-16, -11); this.vx = rand(-2, 2)
        this.targetY = rand(canvas.height * 0.05, canvas.height * 0.45)
        this.exploded = false; this.trail = []; this.dead = false
      }
      update() {
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > 12) this.trail.shift()
        this.x += this.vx; this.y += this.vy; this.vy += 0.32
        if (!this.exploded && this.y <= this.targetY) { this.exploded = true; burst(this.x, this.y) }
        if (this.exploded && this.y > canvas.height + 60) this.dead = true
      }
      draw() {
        if (this.exploded) return
        this.trail.forEach((p, i) => {
          ctx.beginPath(); ctx.arc(p.x, p.y, (i / this.trail.length) * 3, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(45,100%,82%,${i / this.trail.length})`; ctx.fill()
        })
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()
      }
    }

    let lastLaunch = 0
    const loop = (ts) => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (ts - lastLaunch > 280) { rockets.push(new Rocket()); lastLaunch = ts }
      for (let i = rockets.length - 1; i >= 0; i--) { rockets[i].update(); rockets[i].draw(); if (rockets[i].dead) rockets.splice(i, 1) }
      for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].alpha <= 0) particles.splice(i, 1) }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animId); if (fullScreen) window.removeEventListener('resize', resize) }
  }, [fullScreen])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit' }} />
}

// ─── Win Celebration Splash ───────────────────────────────────────────────────
function WinSplash({ onDismiss }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 80)
    const t2 = setTimeout(() => setPhase('exit'), 5500)
    const t3 = setTimeout(onDismiss, 6200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDismiss])

  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(ellipse at 50% 55%, #061428 0%, #000408 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', overflow: 'hidden',
      transition: 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)',
      opacity: phase === 'exit' ? 0 : phase === 'visible' ? 1 : 0,
    }}>
      <FireworksCanvas fullScreen />

      {/* Tricolor light beams */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: 0, left: '50%',
            width: 2, height: '80%',
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${-105 + i * 30}deg)`,
            background: `linear-gradient(to top, ${['#FF9500','#ffffff','#138808','#FFD700','#FF9500','#138808','#ffffff','#FFD700'][i]}55, transparent)`,
            animation: `beamSway ${2.5 + i * 0.15}s ease-in-out ${i * 0.1}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 28px', userSelect: 'none' }}>

        {/* Radial glow orb */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 460, height: 460, borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,153,0,0.2) 0%, rgba(19,136,8,0.14) 40%, transparent 72%)',
          filter: 'blur(28px)',
          animation: 'bigGlow 1.8s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }} />

        {/* Flags + trophy */}
        <div style={{
          fontSize: 50, letterSpacing: 8, marginBottom: 12,
          animation: 'bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.2s both',
          filter: 'drop-shadow(0 0 14px rgba(255,153,0,0.65))',
        }}>🇮🇳 🏆 🇮🇳</div>

        {/* INDIA */}
        <div style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: 'clamp(60px, 18vw, 118px)',
          fontWeight: 900, lineHeight: 0.88, letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #FF9500 0%, #FFD700 30%, #ffffff 55%, #138808 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          animation: 'bounceIn 0.85s cubic-bezier(0.34,1.56,0.64,1) 0.38s both',
        }}>INDIA</div>

        {/* WON THE */}
        <div style={{
          fontFamily: "'Georgia', serif",
          fontSize: 'clamp(22px, 6.5vw, 48px)',
          fontWeight: 800, lineHeight: 1.1, marginTop: 6,
          color: 'rgba(255,255,255,0.88)',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          animation: 'bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.55s both',
        }}>WON THE</div>

        {/* WORLD CUP! */}
        <div style={{
          fontFamily: "'Georgia', serif",
          fontSize: 'clamp(46px, 13vw, 100px)',
          fontWeight: 900, lineHeight: 0.95, letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 35%, #FFE55C 65%, #FFD700 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          filter: 'drop-shadow(0 0 44px rgba(255,215,0,0.75))',
          animation: 'bounceIn 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.7s both',
        }}>WORLD CUP!</div>

        {/* Celebration row */}
        <div style={{
          fontSize: 34, letterSpacing: 6, marginTop: 18,
          animation: 'fadeSlideUp 0.6s ease 1.1s both',
          filter: 'drop-shadow(0 0 8px rgba(255,200,0,0.5))',
        }}>🥇 🎉 🏏 🎉 🥇</div>

        {/* Tagline */}
        <div style={{
          marginTop: 16,
          fontFamily: "'Georgia', serif",
          fontSize: 'clamp(13px, 3.2vw, 18px)',
          color: 'rgba(255,255,255,0.78)',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          animation: 'fadeSlideUp 0.6s ease 1.4s both',
        }}>Champions of the World 🌍</div>

        {/* Tap hint */}
        <div style={{
          marginTop: 38, fontSize: 12,
          color: 'rgba(255,255,255,0.28)',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          animation: 'fadeSlideUp 0.6s ease 2.2s both',
        }}>Tap anywhere to continue</div>
      </div>

      <style>{`
        @keyframes bounceIn    { from { opacity:0; transform:scale(0.3) translateY(40px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bigGlow     { from { opacity:0.5; transform:translate(-50%,-50%) scale(0.88) } to { opacity:1; transform:translate(-50%,-50%) scale(1.12) } }
        @keyframes beamSway    { from { opacity:0.15 } to { opacity:0.55 } }
      `}</style>
    </div>
  )
}

// ─── Main HomePage ─────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth()
  const [liveMatches, setLiveMatches] = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [myTeam, setMyTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveRes, upcomingRes, teamRes] = await Promise.all([
          matchService.getLiveMatches(),
          matchService.getUpcomingMatches(),
          teamService.getMyPermanentTeam().catch(() => ({ data: null }))
        ])
        setLiveMatches(liveRes.data || [])
        setUpcomingMatches(upcomingRes.data || [])
        setMyTeam(teamRes.data || null)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <Loading fullScreen message="Loading matches" />

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <>
      {showSplash && <WinSplash onDismiss={() => setShowSplash(false)} />}

      <div className="home-page">
        {/* Hero Welcome Section */}
        <div className="welcome-hero">
          <div className="welcome-content">
            <span className="welcome-greeting">{getGreeting()}</span>
            <h1 className="welcome-name">{user?.displayName || 'Champion'}</h1>
            <p className="welcome-subtitle">Ready to play fantasy cricket?</p>
          </div>
          <div className="welcome-avatar">
            <div className="avatar-large">{getInitials(user?.displayName)}</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-value">{user?.stats?.matchesPlayed || 0}</span>
              <span className="stat-label">Matches</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/><rect x="6" y="3" width="12" height="10" rx="2"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-value">{user?.stats?.bestRank ? `#${user.stats.bestRank}` : '-'}</span>
              <span className="stat-label">Best Rank</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-value">{myTeam?.stats?.wins || 0}</span>
              <span className="stat-label">Wins</span>
            </div>
          </div>
        </div>

        {/* My Permanent Team Card */}
        <section className="team-section">
          {myTeam ? (
            <div className="team-card-display">
              <div className="team-card-header">
                <div className="team-info">
                  <h3 className="team-name">{myTeam.teamName}</h3>
                  <span className="team-rank">
                    {myTeam.stats?.totalPoints > 0 ? `Rank #${myTeam.rank || '-'}` : 'New Team'}
                  </span>
                </div>
                <Link to="/my-team" className="team-view-btn">
                  View
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              </div>
              {myTeam.fixture?.opponentName && (
                <div className="team-fixture-info">
                  <span className="fixture-vs">VS</span>
                  <span className="opponent-name">{myTeam.fixture.opponentName}</span>
                  {myTeam.fixture.opponent && (
                    <span className="opponent-stats">
                      {myTeam.fixture.opponent.stats?.wins || 0}W - {myTeam.fixture.opponent.stats?.matchesPlayed || 0}M
                    </span>
                  )}
                </div>
              )}
              <div className="team-members-row">
                {myTeam.members?.map((member, i) => (
                  <div key={i} className="team-member-avatar" title={member.userId?.displayName || 'Teammate'}>
                    {getInitials(member.userId?.displayName)}
                  </div>
                ))}
              </div>
              <div className="team-stats-row">
                <div className="team-stat">
                  <span className="team-stat-value">{myTeam.stats?.totalPoints || 0}</span>
                  <span className="team-stat-label">Total Pts</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat-value">{myTeam.stats?.matchesPlayed || 0}</span>
                  <span className="team-stat-label">Matches</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat-value">{myTeam.stats?.wins || 0}</span>
                  <span className="team-stat-label">Wins</span>
                </div>
                <div className="team-stat">
                  <span className="team-stat-value">
                    {myTeam.stats?.matchesPlayed > 0
                      ? `${Math.round((myTeam.stats.wins / myTeam.stats.matchesPlayed) * 100)}%`
                      : '0%'}
                  </span>
                  <span className="team-stat-label">Win Rate</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="team-card-empty">
              <div className="team-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h4>Join a Team!</h4>
              <p>Get matched with 3 other players for team competitions</p>
              <Link to="/teams/join" className="btn btn-primary">Join Random Team</Link>
            </div>
          )}
        </section>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <section className="matches-section">
            <div className="section-header">
              <h3 className="section-title">
                <span className="live-indicator"><span className="live-dot"></span>LIVE</span> Matches
              </h3>
            </div>
            <div className="matches-list">
              {liveMatches.map(match => <MatchCard key={match._id} match={match} />)}
            </div>
          </section>
        )}

        {/* Upcoming Matches */}
        <section className="matches-section">
          <div className="section-header">
            <h3 className="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="section-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Upcoming Matches
            </h3>
            {upcomingMatches.length > 3 && (
              <Link to="/matches" className="see-all-link">
                See All
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            )}
          </div>
          {upcomingMatches.length > 0 ? (
            <div className="matches-list">
              {upcomingMatches.slice(0, 3).map(match => <MatchCard key={match._id} match={match} />)}
            </div>
          ) : (
            <div className="empty-state-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p>No upcoming matches scheduled</p>
              <span>Check back later for new matches</span>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <Link to="/matches" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/><circle cx="12" cy="6" r="1.5"/>
              </svg>
            </div>
            <span>All Matches</span>
          </Link>
          <Link to="/leaderboard" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 21V11"/><path d="M12 21V7"/><path d="M16 21V13"/><circle cx="12" cy="4" r="2"/>
              </svg>
            </div>
            <span>Leaderboard</span>
          </Link>
          <Link to="/profile" className="action-card">
            <div className="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span>My Profile</span>
          </Link>
        </section>
      </div>
    </>
  )
}
