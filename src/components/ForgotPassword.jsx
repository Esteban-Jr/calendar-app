import { useState } from 'react'
import { errorMessages, forgotPassword } from '../api.js'
import AuthShell from './AuthShell.jsx'

export default function ForgotPassword({ onCodeSent, onBack }) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      onCodeSent(email.trim().toLowerCase())
    } catch (err) {
      setErrors(errorMessages(err))
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send a 6-digit code to choose a new one."
      onSubmit={handleSubmit}
      footer={<>Remembered it? <button type="button" className="inline-link" onClick={onBack}>Sign in</button></>}
    >
      <label className="field">
        <span>Email address*</span>
        <input type="text" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com" autoComplete="email" autoCapitalize="none" required />
      </label>

      <ul className="error list" role="alert" aria-live="polite">
        {errors.map((message) => <li key={message}>{message}</li>)}
      </ul>

      <button className="btn" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send code'}</button>
    </AuthShell>
  )
}
