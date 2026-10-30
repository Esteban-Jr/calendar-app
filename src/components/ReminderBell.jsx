import { useState } from 'react'
import { notificationsSupported, showSystemNotification } from '../reminders.js'

function Bell({ slash }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
      {slash && <path d="M4 4l16 16" />}
    </svg>
  )
}

// The button that asks the browser for permission to show notifications.
// Reminders always show inside the app; this adds system notifications.
export default function ReminderBell() {
  const [permission, setPermission] = useState(() => (notificationsSupported() ? Notification.permission : 'unsupported'))
  const [hint, setHint] = useState('')

  async function handleClick() {
    if (permission === 'unsupported') {
      setHint("This browser can't show system notifications. Reminders still appear inside the app. On an iPhone, add the app to your Home Screen first.")
    } else if (permission === 'denied') {
      setHint('Notifications are blocked for this site. Allow them in your browser settings to get system reminders. Reminders still appear inside the app.')
    } else if (permission === 'granted') {
      setHint('System notifications are on.')
    } else {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setHint('Notifications are on. Reminders will pop up while the app is open.')
        showSystemNotification('Reminders are on', 'You will be notified before your events.', 'reminders-on')
      } else {
        setHint('No problem. Reminders will still appear inside the app.')
      }
    }
  }

  const on = permission === 'granted'
  const label = on ? 'Notifications are on' : 'Turn on notifications'

  return (
    <span className="bell-wrap">
      <button type="button" className={on ? 'pill bell on' : 'pill bell'} aria-label={label} title={label} onClick={handleClick}>
        <Bell slash={permission === 'denied'} />
      </button>
      {hint && (
        <span className="bell-hint" role="status">
          {hint}
          <button type="button" className="btn-text" onClick={() => setHint('')}>OK</button>
        </span>
      )}
    </span>
  )
}
