import { useCallback, useEffect, useRef, useState } from 'react'
import { listEvents } from './api.js'
import { formatTime } from './dates.js'
import { pushIsOn } from './push.js'
import { describeStart, dueReminders, loadFired, saveFired, showSystemNotification } from './reminders.js'

const MINUTE = 60 * 1000
const LOOK_AHEAD = 8 * 24 * 60 * MINUTE // reminders can be set up to 7 days before
const REFRESH_EVERY = 5 * MINUTE // re-read the upcoming events
const CHECK_EVERY = 15 * 1000 // look for reminders that have come due

// Keeps an eye on the next days of events and raises a reminder when one is due.
// Returns the banners to show and a way to dismiss them.
// `refreshKey` changes whenever events are saved, so edits are picked up straight away.
export default function useReminders({ me, refreshKey }) {
  const [banners, setBanners] = useState([])
  const upcoming = useRef([])
  // With push on, the server sends the phone notifications (even when the app
  // is closed), so the app only shows its own banner. Otherwise a reminder
  // pushed while the app was closed would pop up again when it's opened.
  const pushOn = useRef(false)

  const dismiss = useCallback((key) => {
    setBanners((list) => list.filter((banner) => banner.key !== key))
  }, [])

  useEffect(() => {
    if (!me) return undefined

    function check() {
      const now = Date.now()
      const fired = loadFired(now)
      const due = dueReminders(upcoming.current, now, fired, me.username)
      if (due.length === 0) return
      for (const { event, startMs, key } of due) {
        fired[key] = now
        const when = describeStart(startMs, now)
        const detail = [formatTime(event.start), event.location].filter(Boolean).join(' · ')
        setBanners((list) => [...list, { key, event, title: event.title, when, detail }])
        if (!pushOn.current) showSystemNotification(event.title, `${when} · ${detail}`, key)
      }
      saveFired(fired)
    }

    async function refresh() {
      try {
        const from = new Date(Date.now() - 5 * MINUTE)
        pushOn.current = await pushIsOn().catch(() => false)
        upcoming.current = await listEvents(from, new Date(Date.now() + LOOK_AHEAD))
        check()
      } catch {
        // offline or a hiccup: we keep what we had and try again later
      }
    }

    // Timers slow down in background tabs, so look again when the tab comes back.
    function onVisible() {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    const refreshTimer = setInterval(refresh, REFRESH_EVERY)
    const checkTimer = setInterval(check, CHECK_EVERY)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(refreshTimer)
      clearInterval(checkTimer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [me, refreshKey])

  return { banners, dismiss }
}
