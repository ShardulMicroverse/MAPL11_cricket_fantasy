import { motion } from 'framer-motion'

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: -10
  }
}

const pageTransition = {
  type: 'tween',
  ease: [0.4, 0, 0.2, 1],
  duration: 0.3
}

// Main animated page wrapper
export default function AnimatedPage({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

// Staggered children animation
export function StaggerContainer({ children, className = '', staggerDelay = 0.05 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Stagger item
export function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 25
          }
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Fade in animation
export function FadeIn({ children, delay = 0, duration = 0.4, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// Slide up animation
export function SlideUp({ children, delay = 0, duration = 0.4, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
    >
      {children}
    </motion.div>
  )
}

// Scale in animation
export function ScaleIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay,
        type: 'spring',
        stiffness: 400,
        damping: 20
      }}
    >
      {children}
    </motion.div>
  )
}

// Animated card with hover effects
export function AnimatedCard({ children, className = '', onClick, delay = 0 }) {
  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

// Animated button
export function AnimatedButton({
  children,
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}) {
  return (
    <motion.button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  )
}

// List item animation
export function AnimatedListItem({ children, index = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.05,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }}
      whileHover={{ x: 4 }}
    >
      {children}
    </motion.div>
  )
}

// Counter animation
export function AnimatedCounter({ value, className = '' }) {
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {value}
    </motion.span>
  )
}

// Progress bar animation
export function AnimatedProgress({ value, max = 100, className = '' }) {
  const percentage = (value / max) * 100

  return (
    <div className={`progress-bar ${className}`} style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          background: 'linear-gradient(90deg, #10b981, #059669)',
          borderRadius: 9999
        }}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}
