import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useState, useEffect } from 'react'

// Premium MAPL11 Logo SVG Component
const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cricket Ball */}
    <circle cx="18" cy="18" r="16" fill="url(#ballGradient)" />
    {/* Ball Seam */}
    <path
      d="M6 18c3-6 9-10 12-10s9 4 12 10c-3 6-9 10-12 10s-9-4-12-10z"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Seam stitches */}
    <path
      d="M8 14l1 1M10 12l1 1M12 10l1 1M14 9l1 0.5M22 9l-1 0.5M24 10l-1 1M26 12l-1 1M28 14l-1 1M8 22l1-1M10 24l1-1M12 26l1-1M14 27l1-0.5M22 27l-1-0.5M24 26l-1-1M26 24l-1-1M28 22l-1-1"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1"
      strokeLinecap="round"
    />
    {/* Shine */}
    <circle cx="12" cy="12" r="4" fill="url(#shine)" opacity="0.5" />
    <defs>
      <linearGradient id="ballGradient" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#34d399" />
        <stop offset="1" stopColor="#059669" />
      </linearGradient>
      <radialGradient id="shine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(4)">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
)

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.header
      className={`header ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="header-content">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/" className="header-logo">
            <motion.div
              className="logo-icon"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(16, 185, 129, 0.25)',
                  '0 0 40px rgba(16, 185, 129, 0.35)',
                  '0 0 20px rgba(16, 185, 129, 0.25)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Logo />
            </motion.div>
            <div className="logo-text">
              <span className="logo-title">MAPL11</span>
              <span className="logo-subtitle">Fantasy Cricket</span>
            </div>
          </Link>
        </motion.div>

        <div className="header-right">
          {user && (
            <motion.div
              className="header-avatar"
              onClick={() => navigate('/profile')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
            >
              <div className="avatar-placeholder">
                {getInitials(user.displayName)}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  )
}
