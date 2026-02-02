import { motion } from 'framer-motion'

const spinTransition = {
  repeat: Infinity,
  ease: 'linear',
  duration: 1
}

const pulseTransition = {
  repeat: Infinity,
  ease: 'easeInOut',
  duration: 1.5
}

export default function Loading({ fullScreen = false, message = 'Loading' }) {
  return (
    <motion.div
      className={`loading-container ${fullScreen ? 'full' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.08)',
          borderTopColor: '#10b981',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
        }}
        animate={{ rotate: 360 }}
        transition={spinTransition}
      />
      {message && (
        <motion.p
          className="loading-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
          transition={pulseTransition}
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  )
}

// Premium loading skeleton component
export function Skeleton({ width = '100%', height = 16, rounded = 'md', className = '' }) {
  const radiusMap = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  }

  return (
    <motion.div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: radiusMap[rounded] || rounded
      }}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
    />
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(15, 18, 25, 0.8)',
        borderRadius: 20,
        padding: 24,
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Skeleton width={48} height={48} rounded="lg" />
        <div style={{ flex: 1 }}>
          <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={60} rounded="lg" />
    </motion.div>
  )
}
