import { useState } from 'react'
import { ApiError, login } from '../api.js'
import AuthShell from './AuthShell.jsx'
import PasswordField from './PasswordField.jsx'

function messageFor(error) {
  if (error instanceof ApiError) {
    // The API answers 400 when the username or password is wrong.
    if (error.status === 400) return 'Wrong username or password.'
    if (error.status === 429) return 'Too many attempts. Please wait a while and try again.'
    return 'Something went wrong on the server. Try again in a moment.'
  }
  return "Can't reach the server. Check your connection and try again."
}

export default function Login({ onLogin, onForgot, onSignup, notice }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const token = await login(username.trim(), password)
      onLogin(token, remember)
    } catch (err) {
      setError(messageFor(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Sign in to see your events, holidays and everything you've shared."
      onSubmit={handleSubmit}
      footer={<>Don't have an account? <button type="button" className="inline-link" onClick={onSignup}>Sign up</button></>}
    >
      {notice && <p className="success" role="status">{notice}</p>}

      <label className="field">
        <span>Username*</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your username"
          autoComplete="username"
          autoCapitalize="none"
          required
        />
      </label>

      <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />

      <div className="login-options">
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Remember me</span>
        </label>
        <button type="button" className="inline-link small" onClick={onForgot}>Forgot password?</button>
      </div>

      <p className="error" role="alert" aria-live="polite">{error}</p>

      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </AuthShell>
  )
}
