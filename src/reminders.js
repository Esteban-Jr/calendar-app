// Working out which reminders are due, and how to word them.
// The functions here are pure (no browser needed), so they are easy to test.

const MINUTE = 60 * 1000
const GRACE = 5 * MINUTE // still worth showing for a few minutes after the start
const KEEP = 2 * 24 * 60 * MINUTE // forget fired reminders after two days

// Reminders that should be shown now: my own events with a reminder, whose
// reminder time has come, that have not started more than a few minutes ago,
// and that have not been shown yet.
export function dueReminders(events, nowMs, fired, username) {
  return events
    .filter((event) => event.reminder != null && event.owner_username === username)
    .map((event) => {
      const startMs = new Date(event.start).getTime()
      return { event, startMs, key: `${event.id}|${event.start}|${event.reminder}`, at: startMs - event.reminder * MINUTE }
    })
    .filter((r) => r.at <= nowMs && nowMs < r.startMs + GRACE && !(r.key in fired))
}

export function describeStart(startMs, nowMs) {
  const minutes = Math.round((startMs - nowMs) / MINUTE)
  if (minutes <= -1) return `Started ${-minutes} min ago`
  if (minutes < 1) return 'Starting now'
  if (minutes < 60) return `Starts in ${minutes} min`
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return `Starts in ${hours} ${hours === 1 ? 'hr' : 'hrs'}${rest ? ` ${rest} min` : ''}`
  }
  const days = Math.round(minutes / (24 * 60))
  return `Starts in ${days} day${days === 1 ? '' : 's'}`
}

// ---------- Remembering what was already shown (survives a reload) ----------

const FIRED_KEY = 'calendar-fired-reminders'

export function loadFired(nowMs = Date.now()) {
  try {
    const all = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    return Object.fromEntries(Object.entries(all).filter(([, at]) => nowMs - at < KEEP))
  } catch {
    return {}
  }
}

export function saveFired(fired) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
  } catch {
    // not remembered: a reminder might show again after a reload
  }
}

// ---------- System notification (needs the user's permission) ----------

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function showSystemNotification(title, body, tag) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const options = { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' }
  try {
    // Phones only allow notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration?.showNotification) {
      await registration.showNotification(title, options)
      return
    }
    new Notification(title, options)
  } catch {
    // The in-app banner still shows.
  }
}
