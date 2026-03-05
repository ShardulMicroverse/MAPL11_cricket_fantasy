import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { leaderboardService } from '../services/leaderboardService'
import { matchService } from '../services/matchService'
import { useAuth } from '../hooks/useAuth'
import Loading from '../components/common/Loading'

const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

// ─── Fireworks Canvas ────────────────────────────────────────────────────────
function FireworksCanvas({ style = {} }) {
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
      ['hsla(0,0%,100%,1)', 'hsla(210,100%,88%,1)', 'hsla(180,100%,85%,1)'],
      ['hsla(10,100%,68%,1)', 'hsla(25,100%,62%,1)', 'hsla(50,100%,72%,1)'],
      ['hsla(270,100%,78%,1)', 'hsla(300,100%,72%,1)', 'hsla(240,100%,80%,1)'],
    ]
    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color
        const angle = rand(0, Math.PI * 2), speed = rand(2, 8)
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed
        this.alpha = 1; this.decay = rand(0.012, 0.022); this.radius = rand(1.5, 3.5)
        this.gravity = 0.1; this.trail = []
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
      for (let i = 0; i < Math.floor(rand(50, 90)); i++)
        particles.push(new Particle(x, y, palette[Math.floor(rand(0, palette.length))]))
    }
    class Rocket {
      constructor() {
        this.x = rand(canvas.width * 0.1, canvas.width * 0.9); this.y = canvas.height + 5
        this.vy = rand(-14, -10); this.vx = rand(-1.5, 1.5)
        this.targetY = rand(canvas.height * 0.1, canvas.height * 0.5)
        this.exploded = false; this.trail = []; this.dead = false
      }
      update() {
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > 10) this.trail.shift()
        this.x += this.vx; this.y += this.vy; this.vy += 0.32
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
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      if (ts - lastLaunch > 600) { rockets.push(new Rocket()); lastLaunch = ts }
      for (let i = rockets.length - 1; i >= 0; i--) { rockets[i].update(); rockets[i].draw(); if (rockets[i].dead) rockets.splice(i, 1) }
      for (let i = particles.length - 1; i >= 0; i--) { particles[i].update(); particles[i].draw(); if (particles[i].alpha <= 0) particles.splice(i, 1) }
      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: 'inherit', ...style }} />
}

// ─── Top 3 Podium ─────────────────────────────────────────────────────────────
function TopPodium({ entries, isTeam }) {
  if (!entries || entries.length === 0) return null
  const top = entries.slice(0, Math.min(3, entries.length))
  const [first, second, third] = top

  const getName = (e) => e?.displayName || e?.teamName || e?.name || 'Unknown'
  const getPoints = (e) => e?.totalPoints || e?.points || 0

  const PodiumCard = ({ entry, rank, height, delay, glowColor, crownEmoji }) => {
    if (!entry) return <div style={{ flex: 1 }} />
    const isTop = rank === 1
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: `podiumRise 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
      }}>
        {/* Crown / medal */}
        <div style={{
          fontSize: isTop ? 28 : 22, marginBottom: 6,
          filter: `drop-shadow(0 0 8px ${glowColor})`,
          animation: isTop ? 'crownFloat 2s ease-in-out infinite alternate' : 'none',
        }}>{crownEmoji}</div>

        {/* Avatar bubble */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div style={{
            width: isTop ? 72 : 56, height: isTop ? 72 : 56,
            borderRadius: '50%',
            background: rank === 1
              ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
              : rank === 2
              ? 'linear-gradient(135deg, #E8E8E8, #9E9E9E)'
              : 'linear-gradient(135deg, #CD7F32, #8B4513)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: isTop ? 22 : 17, fontWeight: 900,
            color: rank === 1 ? '#3d2800' : rank === 2 ? '#1a1a1a' : '#2d1a00',
            boxShadow: `0 0 0 ${isTop ? 3 : 2}px ${glowColor}66, 0 0 ${isTop ? 24 : 14}px ${glowColor}55`,
            animation: isTop ? 'avatarGlow 2s ease-in-out infinite alternate' : 'none',
          }}>
            {getInitials(getName(entry))}
          </div>
          {/* Rank badge */}
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: rank === 1 ? 'linear-gradient(135deg,#FFD700,#FFA500)' : rank === 2 ? 'linear-gradient(135deg,#C0C0C0,#888)' : 'linear-gradient(135deg,#CD7F32,#8B4513)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 900,
            color: rank === 1 ? '#3d2800' : '#fff',
            border: '2px solid rgba(0,0,0,0.3)',
          }}>{rank}</div>
        </div>

        {/* Name */}
        <div style={{
          fontSize: isTop ? 13 : 11, fontWeight: 700,
          color: rank === 1 ? '#FFD700' : rank === 2 ? '#C8C8C8' : '#CD8B4A',
          textAlign: 'center', maxWidth: 90, lineHeight: 1.2,
          marginBottom: 4, letterSpacing: '0.02em',
          textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%',
        }}>{getName(entry)}</div>

        {/* Points */}
        <div style={{
          fontSize: isTop ? 16 : 13, fontWeight: 900,
          color: 'rgba(255,255,255,0.95)',
          fontFamily: "'Georgia', serif",
          marginBottom: 8,
        }}>{getPoints(entry).toLocaleString()}<span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginLeft: 3 }}>pts</span></div>

        {/* Podium block */}
        <div style={{
          width: '100%', height: height, borderRadius: '10px 10px 0 0',
          background: rank === 1
            ? 'linear-gradient(180deg, rgba(255,215,0,0.3) 0%, rgba(255,140,0,0.15) 100%)'
            : rank === 2
            ? 'linear-gradient(180deg, rgba(200,200,200,0.2) 0%, rgba(150,150,150,0.08) 100%)'
            : 'linear-gradient(180deg, rgba(205,127,50,0.2) 0%, rgba(139,69,19,0.08) 100%)',
          border: `1px solid ${glowColor}33`,
          borderBottom: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `inset 0 2px 12px ${glowColor}22`,
        }}>
          <div style={{ fontSize: isTop ? 22 : 16, opacity: 0.4 }}>
            {rank === 1 ? '🏆' : rank === 2 ? '🥈' : '🥉'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: '20px 20px 0 0',
      background: 'linear-gradient(180deg, #0a0f1e 0%, #0d1628 60%, #0a1020 100%)',
      border: '1px solid rgba(255,215,0,0.12)',
      borderBottom: 'none',
      padding: '24px 16px 0',
      marginBottom: 0,
    }}>
      <FireworksCanvas />

      {/* Stars bg */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[...Array(30)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
            borderRadius: '50%', background: 'white',
            opacity: Math.random() * 0.5 + 0.1,
            animation: `starTwinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite alternate`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Georgia', serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.35em', textTransform: 'uppercase',
            color: 'rgba(255,215,0,0.6)', marginBottom: 4,
          }}>🏆 Hall of Fame</div>
          <div style={{
            fontFamily: "'Georgia', serif", fontSize: 22, fontWeight: 900,
            background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Top Players</div>
        </div>

        {/* Podium layout: 2nd | 1st | 3rd */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 0 }}>
          <PodiumCard entry={second} rank={2} height={60} delay={0.2} glowColor="#C0C0C0" crownEmoji="🥈" />
          <PodiumCard entry={first}  rank={1} height={90} delay={0.1} glowColor="#FFD700" crownEmoji="👑" />
          <PodiumCard entry={third}  rank={3} height={44} delay={0.3} glowColor="#CD7F32" crownEmoji="🥉" />
        </div>
      </div>

      <style>{`
        @keyframes podiumRise { from { opacity:0; transform:translateY(24px) scale(0.9) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes crownFloat { from { transform:translateY(0) rotate(-5deg) } to { transform:translateY(-5px) rotate(5deg) } }
        @keyframes avatarGlow { from { box-shadow:0 0 0 3px rgba(255,215,0,0.3),0 0 20px rgba(255,200,0,0.3) } to { box-shadow:0 0 0 5px rgba(255,215,0,0.6),0 0 36px rgba(255,200,0,0.6) } }
        @keyframes starTwinkle { from { opacity:0.1 } to { opacity:0.7 } }
      `}</style>
    </div>
  )
}

// ─── Main LeaderboardPage ─────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { matchId } = useParams()
  const { user } = useAuth()
  const [tab, setTab] = useState('individual')
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (matchId) {
          const [matchRes, myRankRes] = await Promise.all([
            matchService.getMatch(matchId),
            leaderboardService.getMyRank(matchId)
          ])
          setMatch(matchRes.data?.data || matchRes.data)
          setMyRank(myRankRes.data?.data || myRankRes.data)
        }
        const leaderboardRes = matchId
          ? tab === 'individual'
            ? await leaderboardService.getIndividualMatchLeaderboard(matchId)
            : await leaderboardService.getTeamMatchLeaderboard(matchId)
          : await leaderboardService.getOverallIndividualLeaderboard()
        const resData = leaderboardRes.data?.data || leaderboardRes.data
        setLeaderboard(resData?.entries || resData || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId, tab])

  const isCurrentUser = (entry) => entry.userId === user?._id

  return (
    <div className="leaderboard-page" style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #060c18 0%, #0a1020 100%)',
    }}>

      {/* ── Header ── */}
      <div style={{
        padding: '20px 20px 16px',
        background: 'linear-gradient(180deg, #0a0f1e 0%, transparent 100%)',
      }}>
        <div style={{
          fontFamily: "'Georgia', serif", fontSize: 10, fontWeight: 700,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          color: 'rgba(255,215,0,0.5)', marginBottom: 4,
        }}>Rankings</div>
        <h1 style={{
          margin: 0, fontFamily: "'Georgia', serif", fontWeight: 900, fontSize: 28,
          background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>Leaderboard</h1>
      </div>

      {/* ── Match Header ── */}
      {match && (
        <div style={{
          margin: '0 16px 16px',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: '0 auto 6px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em',
              }}>{match.team1?.shortName || match.team1?.name?.substring(0, 3)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                {match.team1?.name || match.team1}
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.2em', padding: '6px 10px',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            }}>VS</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: '0 auto 6px',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em',
              }}>{match.team2?.shortName || match.team2?.name?.substring(0, 3)}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                {match.team2?.name || match.team2}
              </div>
            </div>
          </div>
          {match.venue && (
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              📍 {match.venue}
            </div>
          )}
        </div>
      )}

      {/* ── My Rank Card ── */}
      {myRank?.rank && (
        <div style={{
          margin: '0 16px 16px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,140,0,0.06) 100%)',
          borderRadius: 16,
          border: '1px solid rgba(255,215,0,0.25)',
          boxShadow: '0 4px 24px rgba(255,200,0,0.08)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', marginBottom: 2 }}>YOUR RANK</div>
            <div style={{
              fontFamily: "'Georgia', serif", fontSize: 36, fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>#{myRank.rank}</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,215,0,0.15)' }} />
          <div style={{ flex: 1, display: 'flex', gap: 16, justifyContent: 'space-around' }}>
            {[
              { val: myRank.totalPoints || 0, label: 'Total' },
              { val: myRank.fantasyPoints || 0, label: 'Fantasy' },
              { val: myRank.predictionPoints || 0, label: 'Predict' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.95)', fontFamily: "'Georgia', serif" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {matchId && (
        <div style={{
          display: 'flex', margin: '0 16px 16px',
          background: 'rgba(255,255,255,0.04)', borderRadius: 12,
          padding: 4, border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {['individual', 'team'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13, letterSpacing: '0.05em',
              transition: 'all 0.2s ease',
              background: tab === t ? 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,140,0,0.12))' : 'transparent',
              color: tab === t ? '#FFD700' : 'rgba(255,255,255,0.4)',
              boxShadow: tab === t ? 'inset 0 1px 0 rgba(255,215,0,0.15)' : 'none',
            }}>
              {t === 'individual' ? '👤 Individual' : '👥 Team'}
            </button>
          ))}
        </div>
      )}

      {/* ── Leaderboard ── */}
      {loading ? <Loading /> : (
        <div>
          {leaderboard.length > 0 ? (
            <>
              {/* Top 3 Podium */}
              <div style={{ padding: '0 16px' }}>
                <TopPodium entries={leaderboard} isTeam={tab === 'team'} />
              </div>

              {/* Rest of list */}
              <div style={{
                margin: '0 16px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderTop: 'none',
                borderRadius: '0 0 20px 20px',
                overflow: 'hidden',
              }}>
                {leaderboard.slice(3).map((entry, index) => {
                  const rank = entry.rank || index + 4
                  const isMine = isCurrentUser(entry)
                  const name = entry.displayName || entry.teamName || entry.name || 'Unknown'
                  const pts = entry.totalPoints || entry.points || 0

                  return (
                    <div key={entry.userId || entry.teamId || index} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isMine
                        ? 'linear-gradient(90deg, rgba(255,215,0,0.08) 0%, transparent 100%)'
                        : 'transparent',
                      transition: 'background 0.2s',
                      animation: `listFadeIn 0.4s ease ${(index % 10) * 0.04}s both`,
                    }}>
                      {/* Rank */}
                      <div style={{
                        width: 32, textAlign: 'center', flexShrink: 0,
                        fontSize: 13, fontWeight: 700,
                        color: isMine ? '#FFD700' : 'rgba(255,255,255,0.25)',
                      }}>#{rank}</div>

                      {/* Avatar */}
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: isMine
                          ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
                          : 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800,
                        color: isMine ? '#3d2800' : 'rgba(255,255,255,0.7)',
                        border: isMine ? '2px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isMine ? '0 0 12px rgba(255,200,0,0.3)' : 'none',
                      }}>{getInitials(name)}</div>

                      {/* Name + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: isMine ? 700 : 600,
                          color: isMine ? '#FFD700' : 'rgba(255,255,255,0.85)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {name}
                          {isMine && <span style={{
                            marginLeft: 6, fontSize: 9, fontWeight: 700,
                            background: 'rgba(255,215,0,0.2)', color: '#FFD700',
                            padding: '2px 6px', borderRadius: 4, letterSpacing: '0.1em',
                            verticalAlign: 'middle',
                          }}>YOU</span>}
                        </div>
                        {entry.members && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                            {entry.members.map(m => m.displayName || m.name).slice(0, 3).join(' · ')}
                            {entry.members.length > 3 && ' …'}
                          </div>
                        )}
                      </div>

                      {/* Points */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 16, fontWeight: 900, fontFamily: "'Georgia', serif",
                          color: isMine ? '#FFD700' : 'rgba(255,255,255,0.9)',
                        }}>{pts.toLocaleString()}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>PTS</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              margin: '32px 16px', padding: 40,
              background: 'rgba(255,255,255,0.02)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>
                {tab === 'team' ? '👥' : '🏏'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                {tab === 'team' ? 'No teams yet' : 'No entries yet'}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>
                {tab === 'team' ? 'Teams are formed when 4 users join' : 'Create a fantasy team to participate'}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes listFadeIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
      `}</style>
    </div>
  )
}
