import { useEffect, useState } from 'react'
import { acceptInvite, declineInvite, errorMessages } from '../api.js'
import { formatTime } from '../dates.js'
import { enablePush, pushIsOn } from '../push.js'
import { notificationsSupported, showSystemNotification } from '../reminders.js'

// "5 min ago", "3 h ago", "yesterday", or a date.
function ago(iso) {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  if (hours < 48) return 'yesterday'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const dayDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

// "Sat 14 Nov · 7:00 PM"
function when(iso) {
  return `${dayDate.format(new Date(iso))} · ${formatTime(iso)}`
}

const ANSWERED = {
  accepted: '✓ You accepted. It’s in your calendar.',
  declined: 'You declined.',
  cancelled: 'This invite was cancelled.',
}

// An invite in the list: when the event is, and Accept / Decline while it's
// still waiting for an answer.
function Invite({ note, status, offline, onAnswer }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function answer(accept) {
    setBusy(true)
    setError('')
    try {
      await (accept ? acceptInvite(note.event) : declineInvite(note.event))
      onAnswer(note.event, accept ? 'accepted' : 'declined')
    } catch (err) {
      // e.g. the owner cancelled it a moment ago: load the latest instead.
      setError(errorMessages(err).join(' '))
      onAnswer(note.event, null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="invite">
      {note.event_start && <p className="invite-when">{when(note.event_start)}</p>}
      {status === 'waiting' ? (
        <div className="invite-actions">
          <button type="button" className="btn-text" disabled={busy || offline} onClick={() => answer(false)}>
            Decline
          </button>
          <button type="button" className="btn small" disabled={busy || offline} onClick={() => answer(true)}>
            Accept
          </button>
        </div>
      ) : (
        <p className={`invite-answer ${status}`}>{ANSWERED[status]}</p>
      )}
      {offline && status === 'waiting' && <p className="muted invite-note">You can answer once you're back online.</p>}
      {error && <p className="invite-error" role="alert">{error}</p>}
    </div>
  )
}

// Whether this device shows phone notifications, and a button to turn them on.
// (This used to be what the bell did on its own.)
function PhoneNotifications() {
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'))
  const [push, setPush] = useState(false)

  useEffect(() => {
    pushIsOn().then(setPush).catch(() => {})
  }, [permission])

  async function turnOn() {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      const on = await enablePush().catch(() => false)
      setPush(on)
      showSystemNotification('Notifications are on', 'Reminders and updates will pop up here.', 'notifications-on')
    }
  }

  let text
  if (permission === 'unsupported') {
    text = "This browser can't show phone notifications. On an iPhone, add the app to your Home Screen first. Reminders still appear inside the app."
  } else if (permission === 'denied') {
    text = 'Notifications are blocked for this app. Allow them in your phone or browser settings.'
  } else if (permission === 'granted') {
    text = push
      ? 'Phone notifications are on, also when the app is closed.'
      : 'Phone notifications are on while the app is open.'
  } else {
    text = 'Get reminders and updates as phone notifications, even when the app is closed.'
  }

  return (
    <section className="phone-notes">
      <p>{text}</p>
      {permission === 'default' && (
        <button type="button" className="btn small" onClick={turnOn}>Turn on</button>
      )}
    </section>
  )
}

// The Notifications window: what happened (e.g. "ben removed “Dinner” from
// their calendar"), newest first, and invites to answer. Opening it marks
// everything as read. `onAnswered` reloads the calendar after an answer.
export default function NotificationsModal({ data, offline, onOpened, onAnswered, onClose }) {
  const [unreadIds] = useState(() => new Set((data?.notifications ?? []).filter((n) => !n.read).map((n) => n.id)))
  // Answers given in this window, shown straight away: event id -> status.
  const [answers, setAnswers] = useState({})

  function answered(eventId, status) {
    if (status) setAnswers((previous) => ({ ...previous, [eventId]: status }))
    onAnswered()
  }

  useEffect(() => {
    if (unreadIds.size) onOpened() // mark read, but keep them highlighted while the window is open
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const notifications = data?.notifications ?? []

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal notifications" role="dialog" aria-modal="true" aria-label="Notifications">
        <h2>Notifications</h2>

        {notifications.length === 0 ? (
          <p className="muted">Nothing yet. Invites to your friends' events, and news about events you share, show up here.</p>
        ) : (
          <ul className="note-list">
            {notifications.map((n) => (
              <li key={n.id} className={unreadIds.has(n.id) ? 'unread' : ''}>
                <div className="note-body">
                  <span className="note-text">{n.message}</span>
                  {n.kind === 'invited' && (
                    <Invite
                      note={n}
                      status={answers[n.event] ?? n.invite_status}
                      offline={offline}
                      onAnswer={answered}
                    />
                  )}
                </div>
                <time dateTime={n.created}>{ago(n.created)}</time>
              </li>
            ))}
          </ul>
        )}

        <PhoneNotifications />

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn small" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
