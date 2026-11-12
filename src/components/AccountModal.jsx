import { useEffect, useState } from 'react'
import { errorMessages, updateMe } from '../api.js'
import { formatTime } from '../dates.js'

const dayDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// "Thu 19 Nov at 1:31 PM"
function when(iso) {
  return `${dayDate.format(new Date(iso))} at ${formatTime(iso)}`
}

// The round button in the top bar with my first initial. Opens the Account window.
export function AccountButton({ me, onClick }) {
  const initial = (me?.username ?? '?').charAt(0).toUpperCase()
  return (
    <button type="button" className="pill account-btn" aria-label="Account" title="Account" onClick={onClick}>
      <span aria-hidden="true">{initial}</span>
    </button>
  )
}

// The Account window: my username (and changing it, once a week), my email,
// and signing out. `onChanged` gets the updated `me` after a rename.
export default function AccountModal({ me, offline, onChanged, onLogout, onClose }) {
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState(me?.username ?? '')
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const waitUntil = me?.next_username_change // null: I can change it now

  function startEditing() {
    setUsername(me.username)
    setErrors([])
    setNotice('')
    setEditing(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErrors([])
    try {
      const updated = await updateMe({ username: username.trim() })
      onChanged(updated)
      setEditing(false)
      setNotice(`Your username is now ${updated.username}. Use it next time you sign in.`)
    } catch (err) {
      setErrors(errorMessages(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal account" role="dialog" aria-modal="true" aria-label="Account">
        <h2>Account</h2>

        {editing ? (
          <form className="account-edit" onSubmit={save}>
            <label className="field">
              <span>New username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={150}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
              />
            </label>
            <p className="muted account-hint">
              Letters, numbers and @ . + - _ only. You can change it once a week, and your friends will be told.
            </p>
            <ul className="errors" role="alert">
              {errors.map((message) => <li key={message}>{message}</li>)}
            </ul>
            <div className="account-edit-actions">
              <button type="button" className="btn-text" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn small" disabled={saving || !username.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <div className="account-row">
            <div>
              <span className="account-label">Username</span>
              <b className="account-value">{me?.username}</b>
            </div>
            {!waitUntil && (
              <button type="button" className="btn-text" disabled={offline || !me} onClick={startEditing}>Change</button>
            )}
          </div>
        )}
        {notice && <p className="account-notice" role="status">{notice}</p>}
        {!editing && waitUntil && (
          <p className="muted account-hint">You can change your username again on {when(waitUntil)}.</p>
        )}
        {!editing && offline && !waitUntil && (
          <p className="muted account-hint">You can change it once you're back online.</p>
        )}

        {me?.email && (
          <div className="account-row">
            <div>
              <span className="account-label">Email</span>
              <span className="account-value">{me.email}</span>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-text danger" onClick={onLogout}>Sign out</button>
          <span className="spacer" />
          <button type="button" className="btn small" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
