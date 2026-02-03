import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import logo from './logo.svg'

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
          <img src={logo} alt="MAPL11 Logo" width="120" height="120" />
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