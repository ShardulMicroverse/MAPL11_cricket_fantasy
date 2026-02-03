import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useState, useEffect } from 'react'
import logo from '../../pages/logo.svg'

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
                  '0 0 20px rgba(255, 179, 0, 0.25)',
                  '0 0 40px rgba(255, 179, 0, 0.35)',
                  '0 0 20px rgba(255, 179, 0, 0.25)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img src={logo} alt="MAPL11 Logo" width="24" height="24" />
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