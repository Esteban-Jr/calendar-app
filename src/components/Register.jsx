import { useState } from 'react'
import { ApiError, errorMessages, register } from '../api.js'
import AuthShell from './AuthShell.jsx'
import PasswordField from './PasswordField.jsx'

// Step 1 of creating an account. The API emails a 6-digit code; step 2 is VerifyCode.
export default function Register({ onCodeSent, onSignIn }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setLoading(true)
    try {
      await register(username.trim(), email.trim(), password)
      onCodeSent(email.trim().toLowerCase())
    } catch (err) {
      setErrors(err instanceof ApiError && err.status === 403 && err.body?.detail ? [err.body.detail] : errorMessages(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="We'll email you a 6-digit code to confirm it's really you."
      onSubmit={handleSubmit}
      footer={<>Already have an account? <button type="button" className="inline-link" onClick={onSignIn}>Sign in</button></>}
    >
      <label className="field">
        <span>Username*</span>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
          placeholder="pick a username" autoComplete="username" autoCapitalize="none" maxLength={150} required />
      </label>

      <label className="field">
        <span>Email address*</span>
        <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com" autoComplete="email" autoCapitalize="none" required />
      </label>

      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" placeholder="at least 8 characters" />

      <ul className="error list" role="alert" aria-live="polite">
        {errors.map((message) => <li key={message}>{message}</li>)}
      </ul>

      <button className="btn" type="submit" disabled={loading}>
        {loading ? 'Sending code…' : 'Create account'}
      </button>
    </AuthShell>
  )
}
