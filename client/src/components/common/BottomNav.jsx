import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    )
  },
  {
    to: '/matches',
    label: 'Matches',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12a4 4 0 0 0 8 0" />
        <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12a4 4 0 0 0 8 0" fill="var(--bg-primary)"/>
        <circle cx="12" cy="6" r="2" fill="var(--bg-primary)"/>
      </svg>
    )
  },
  {
    to: '/teams',
    label: 'Teams',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    to: '/leaderboard',
    label: 'Ranks',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="6" y="11" width="4" height="10" rx="1"/>
        <rect x="10" y="7" width="4" height="14" rx="1"/>
        <rect x="14" y="14" width="4" height="7" rx="1"/>
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="11" width="4" height="10" rx="1"/>
        <rect x="10" y="7" width="4" height="14" rx="1"/>
        <rect x="14" y="14" width="4" height="7" rx="1"/>
      </svg>
    )
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    activeIcon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )
  }
]

const NavItem = ({ item, isActive, index }) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: index * 0.05,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      style={{ position: 'relative' }}
    >
      <NavLink
        to={item.to}
        className={`nav-item ${isActive ? 'active' : ''}`}
      >
        <motion.div
          className="nav-icon"
          whileTap={{ scale: 0.85 }}
          animate={isActive ? { scale: 1.15 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isActive ? item.activeIcon : item.icon}
        </motion.div>
        <motion.span
          className="nav-label"
          animate={{
            opacity: isActive ? 1 : 0.7,
            y: isActive ? 0 : 2
          }}
          transition={{ duration: 0.2 }}
        >
          {item.label}
        </motion.span>
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="nav-indicator"
              layoutId="nav-indicator"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </AnimatePresence>
      </NavLink>
    </motion.div>
  )
}

export default function BottomNav() {
  const { user } = useAuth()
  const location = useLocation()

  // Don't show nav on login/register pages
  if (!user || ['/login', '/register'].includes(location.pathname)) {
    return null
  }

  return (
    <motion.nav
      className="bottom-nav"
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      transition={{
        delay: 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 25
      }}
    >
      {navItems.map((item, index) => {
        const isActive = location.pathname === item.to ||
          (item.to !== '/' && location.pathname.startsWith(item.to))

        return (
          <NavItem
            key={item.to}
            item={item}
            isActive={isActive}
            index={index}
          />
        )
      })}
    </motion.nav>
  )
}
