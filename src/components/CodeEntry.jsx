import { useEffect, useState } from 'react'
import { errorMessages } from '../api.js'

// The 6-digit code box with a "send again" button that waits 60 seconds.
// `onSubmit(code)` does the real work; `onResend()` asks for a new code.
export default function CodeEntry({ email, onSubmit, onResend, children, submitLabel }) {
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState([])
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [wait, setWait] = useState(60)

  useEffect(() => {
    if (wait <= 0) return undefined
    const timer = setTimeout(() => setWait((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors([])
    setInfo('')
    setLoading(true)
    try {
      await onSubmit(code.replace(/\s/g, ''))
    } catch (err) {
      setErrors(errorMessages(err))
      setLoading(false)
    }
  }

  async function handleResend() {
    setErrors([])
    try {
      await onResend()
      setInfo('We sent a new code.')
      setWait(60)
    } catch (err) {
      setErrors(errorMessages(err))
    }
  }

  return (
    <>
      <p className="sent-to">Code sent to <b>{email}</b></p>

      <form id="code-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>6-digit code*</span>
          <input
            className="code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="······"
            autoFocus
            required
          />
        </label>

        {children}

        {info && <p className="success" role="status">{info}</p>}
        <ul className="error list" role="alert" aria-live="polite">
          {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>

        <button className="btn" type="submit" disabled={loading}>{loading ? 'Checking…' : submitLabel}</button>
      </form>

      <p className="auth-footer">
        Didn't get it?{' '}
        <button type="button" className="inline-link" onClick={handleResend} disabled={wait > 0}>
          {wait > 0 ? `Send again in ${wait}s` : 'Send again'}
        </button>
      </p>
    </>
  )
}
