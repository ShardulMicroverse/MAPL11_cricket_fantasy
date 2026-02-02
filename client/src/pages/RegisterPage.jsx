import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

// MAPL11 Logo
const Logo = () => (
  <svg width="48" height="48" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="url(#ballGradientReg)" />
    <path
      d="M6 18c3-6 9-10 12-10s9 4 12 10c-3 6-9 10-12 10s-9-4-12-10z"
      stroke="#c9372c"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M8 14l1 1M10 12l1 1M12 10l1 1M14 9l1 0.5M22 9l-1 0.5M24 10l-1 1M26 12l-1 1M28 14l-1 1M8 22l1-1M10 24l1-1M12 26l1-1M14 27l1-0.5M22 27l-1-0.5M24 26l-1-1M26 24l-1-1M28 22l-1-1"
      stroke="#c9372c"
      strokeWidth="1"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="url(#shineReg)" opacity="0.4" />
    <defs>
      <linearGradient id="ballGradientReg" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3fb950" />
        <stop offset="1" stopColor="#238636" />
      </linearGradient>
      <radialGradient id="shineReg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(3)">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
)

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { error: showError, success } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await register(email, password, displayName)
      success('Account created successfully!')
      navigate('/')
    } catch (err) {
      showError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Logo />
          </div>
          <span className="auth-logo-text">MAPL11</span>
        </div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join the fantasy cricket league</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            required
            minLength={2}
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 6 chars)"
            required
            minLength={6}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
