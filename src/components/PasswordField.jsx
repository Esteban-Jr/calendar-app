import { useState } from 'react'

function EyeIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  )
}

// A password box with the show/hide eye. `autoComplete` is "current-password"
// when signing in and "new-password" when choosing one.
export default function PasswordField({ label = 'Password*', value, onChange, autoComplete, placeholder = 'your password' }) {
  const [shown, setShown] = useState(false)
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="eye"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
        >
          <EyeIcon off={!shown} />
        </button>
      </div>
    </label>
  )
}
