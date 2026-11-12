import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { getFriends, getMe, getNotifications, listEvents, listHolidays, markNotificationsRead } from '../api.js'
import { pickLeastUsed } from '../colors.js'
import { isOffline, subscribeOffline } from '../offline.js'
import { enablePush } from '../push.js'
import {
  addDays, addMonths, formatLongDate, formatMonthYear, formatWeekRange, monthGrid, startOfDay,
  weekDays,
} from '../dates.js'
import Agenda from './Agenda.jsx'
import Footer from './Footer.jsx'
import FriendsButton from './FriendsButton.jsx'
import FriendsModal from './FriendsModal.jsx'
import DayView from './DayView.jsx'
import EventModal from './EventModal.jsx'
import MonthView from './MonthView.jsx'
import ReminderBanners from './ReminderBanners.jsx'
import NotificationsButton from './NotificationsButton.jsx'
import NotificationsModal from './NotificationsModal.jsx'
import PullIndicator from './PullIndicator.jsx'
import WeekView from './WeekView.jsx'
import usePullToRefresh from '../usePullToRefresh.js'
import useReminders from '../useReminders.js'
import '../calendar.css'

const LIVE_REFRESH_EVERY = 30 * 1000 // while the app is on screen

const VIEWS = [
  ['month', 'Month'],
  ['week', 'Week'],
  ['day', 'Day'],
]

const HOLIDAYS_KEY = 'calendar-show-holidays'

function readShowHolidays() {
  try {
    return localStorage.getItem(HOLIDAYS_KEY) !== 'off'
  } catch {
    return true
  }
}

// The app's logo (the white lion) on the blue rounded square.
function LogoMark() {
  return (
    <span className="mark" aria-hidden="true">
      <img src="/logo-lion.png" alt="" width="26" height="26" />
    </span>
  )
}

// Which dates each view needs from the API. The day view shows a week strip
// with a dot under every day that has events, so it loads the whole week.
function rangeFor(view, cursor) {
  if (view === 'month') {
    const weeks = monthGrid(cursor)
    return [weeks[0][0], addDays(weeks[5][6], 1)]
  }
  const days = weekDays(cursor)
  return [days[0], addDays(days[6], 1)]
}

function titleFor(view, cursor) {
  if (view === 'month') return formatMonthYear(cursor)
  if (view === 'week') return formatWeekRange(cursor)
  return formatLongDate(cursor)
}

export default function Calendar({ onLogout }) {
  const [view, setView] = useState(() => (window.innerWidth < 760 ? 'day' : 'month'))
  const [today] = useState(() => startOfDay(new Date()))
  const [cursor, setCursor] = useState(today) // the day we are looking at
  const [now, setNow] = useState(() => new Date())
  const [events, setEvents] = useState([])
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [modal, setModal] = useState(null) // { event } to edit, { defaults } for a new one
  const [showHolidays, setShowHolidays] = useState(readShowHolidays)
  const [holidayYears, setHolidayYears] = useState({}) // year -> list from the API
  const [holidayError, setHolidayError] = useState(false)
  const requestedYears = useRef(new Set())
  const [me, setMe] = useState(null) // { id, username } of the person logged in
  // Offline the calendar shows the saved copy and can't be changed.
  const offline = useSyncExternalStore(subscribeOffline, isOffline)
  const wasOffline = useRef(offline)

  // Back online: load everything fresh from the server.
  useEffect(() => {
    if (wasOffline.current && !offline) setReloadKey((n) => n + 1)
    wasOffline.current = offline
  }, [offline])

  const [from, to] = rangeFor(view, cursor)
  const rangeStart = from.getTime()
  const rangeEnd = to.getTime()

  // Loads the events for the dates on screen. Resolves to true if they changed.
  // Each load gets a number, so an older, slower answer (for dates you've
  // already moved away from) never replaces a newer one.
  const eventsRequest = useRef(0)
  const lastEvents = useRef('')
  function loadEvents() {
    const id = ++eventsRequest.current
    return listEvents(new Date(rangeStart), new Date(rangeEnd))
      .then((data) => {
        if (id !== eventsRequest.current) return false
        setLoadError('')
        const json = JSON.stringify(data)
        if (json === lastEvents.current) return false // nothing new: don't redraw
        lastEvents.current = json
        setEvents(data)
        return true
      })
      .catch((err) => {
        if (id !== eventsRequest.current || err.status === 401) return false
        setLoadError(
          isOffline()
            ? "You're offline, and these dates haven't been saved on this device yet."
            : "Couldn't load your events. Check your connection and try again.",
        )
        return false
      })
  }

  // Load again when the dates on screen change or something was saved.
  useEffect(() => {
    loadEvents()
  }, [rangeStart, rangeEnd, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps -- loadEvents only uses these

  useEffect(() => {
    getMe().then(setMe).catch(() => {}) // a 401 is handled globally; anything else just means no "shared" marks
    // Notifications already allowed on this device: make sure the server can push
    // reminders here (and knows it's this person signed in now).
    enablePush().catch(() => {})
  }, [])

  // Friends and friend requests ({ friends, incoming, outgoing }).
  const [friendData, setFriendData] = useState(null)
  const [showFriends, setShowFriends] = useState(false)
  const loadFriends = () => getFriends().then(setFriendData).catch(() => {})

  useEffect(() => {
    loadFriends()
  }, [reloadKey])

  // Notifications ({ unread, notifications }).
  const [noteData, setNoteData] = useState(null)
  const [showNotes, setShowNotes] = useState(false)
  const loadNotes = () => getNotifications().then(setNoteData).catch(() => {})

  useEffect(() => {
    loadNotes()
  }, [reloadKey])

  // ---------- Keeping the screen up to date ----------
  // Other people can send friend requests, share events or notify you while
  // the app is open, so everything is loaded again: every so often while the
  // app is on screen, when it comes back to the front, when the internet comes
  // back, when a phone notification arrives, and when you pull down.
  const [remindersKey, setRemindersKey] = useState(0)
  const lastRefresh = useRef(0)
  async function refreshAll() {
    lastRefresh.current = Date.now()
    const [eventsChanged] = await Promise.all([loadEvents(), loadFriends(), loadNotes()])
    if (eventsChanged) setRemindersKey((n) => n + 1) // a new event may need a reminder soon
  }

  const latestRefresh = useRef(refreshAll)
  useEffect(() => {
    latestRefresh.current = refreshAll
  })

  useEffect(() => {
    const onScreen = () => document.visibilityState === 'visible'
    // Coming back to the front can fire several of these at once: refresh once.
    const refreshNow = () => {
      if (onScreen() && Date.now() - lastRefresh.current > 2000) latestRefresh.current()
    }
    const timer = setInterval(() => onScreen() && latestRefresh.current(), LIVE_REFRESH_EVERY)
    const fromServiceWorker = (event) => event.data?.type === 'refresh' && latestRefresh.current()

    document.addEventListener('visibilitychange', refreshNow)
    window.addEventListener('focus', refreshNow)
    window.addEventListener('pageshow', refreshNow)
    window.addEventListener('online', refreshNow)
    navigator.serviceWorker?.addEventListener('message', fromServiceWorker)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshNow)
      window.removeEventListener('focus', refreshNow)
      window.removeEventListener('pageshow', refreshNow)
      window.removeEventListener('online', refreshNow)
      navigator.serviceWorker?.removeEventListener('message', fromServiceWorker)
    }
  }, [])

  const { pull, dragging, refreshing } = usePullToRefresh(refreshAll)
  // While pulling, the whole page slides down with the finger, leaving room
  // for the spinner above it. It moves with `top`, not `transform`: a
  // transformed box would drag the buttons pinned to the screen (like Friends
  // on phones) along with it.
  const pageShift = pull > 0 ? { top: `${pull}px` } : undefined

  function markNotesRead() {
    markNotificationsRead()
      .then(() => setNoteData((data) => data && { ...data, unread: 0, notifications: data.notifications.map((n) => ({ ...n, read: true })) }))
      .catch(() => {})
  }

  // Mark events that belong to somebody else (shared with me).
  const shownEvents = useMemo(
    () => events.map((event) => ({ ...event, mine: !me || event.owner_username === me.username })),
    [events, me],
  )

  const { banners, dismiss } = useReminders({ me, refreshKey: `${reloadKey}-${remindersKey}` })

  // Holidays come one year at a time. A month grid can reach into the next or
  // previous year, so load every year the screen touches, once each.
  const firstYear = from.getFullYear()
  const lastYear = new Date(rangeEnd - 1).getFullYear()

  useEffect(() => {
    if (!showHolidays) return
    for (let year = firstYear; year <= lastYear; year++) {
      if (requestedYears.current.has(year)) continue
      requestedYears.current.add(year)
      listHolidays(year)
        .then((list) => {
          setHolidayYears((previous) => ({ ...previous, [year]: list }))
          setHolidayError(false)
        })
        .catch((err) => {
          requestedYears.current.delete(year) // try again next time
          if (err.status !== 401) setHolidayError(true)
        })
    }
  }, [firstYear, lastYear, showHolidays])

  // date -> holidays on that date, e.g. '2026-10-12' -> [{ title, name }]
  const holidays = useMemo(() => {
    const byDate = {}
    if (!showHolidays) return byDate
    for (const list of Object.values(holidayYears)) {
      for (const holiday of list) (byDate[holiday.date] ||= []).push(holiday)
    }
    return byDate
  }, [holidayYears, showHolidays])

  function toggleHolidays() {
    const next = !showHolidays
    setShowHolidays(next)
    try {
      localStorage.setItem(HOLIDAYS_KEY, next ? 'on' : 'off')
    } catch {
      // the choice just won't be remembered
    }
  }

  // Keeps the "now" line in the week view moving.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  function step(direction) {
    if (view === 'month') {
      const next = addMonths(cursor, direction)
      const sameAsToday = next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear()
      setCursor(sameAsToday ? today : next)
    } else {
      setCursor(addDays(cursor, direction * (view === 'week' ? 7 : 1)))
    }
  }

  function openNew(day, hour = 9) {
    if (offline) return
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    setModal({ defaults: { start, end, color: pickLeastUsed(shownEvents) } })
  }

  function openDay(day) {
    setCursor(startOfDay(day))
    setView('day')
  }

  const edit = (event) => setModal({ event })
  // Offline the views hide their "+ Add event" buttons (they get no onAdd).
  const addIfOnline = offline ? undefined : openNew
  const unit = { month: 'month', week: 'week', day: 'day' }[view]

  return (
    <div className="app">
      <PullIndicator pull={pull} dragging={dragging} refreshing={refreshing} />
      <div className={dragging ? 'pull-shift' : 'pull-shift settle'} style={pageShift}>
        <header className="topbar">
          <div className="brand"><LogoMark /> <span className="brand-name">My Calendar</span></div>
          <div className="top-actions">
            <FriendsButton waiting={friendData?.incoming.length ?? 0} onClick={() => setShowFriends(true)} />
            <NotificationsButton unread={noteData?.unread ?? 0} onClick={() => setShowNotes(true)} />
            <button type="button" className={showHolidays ? 'pill holiday-toggle on' : 'pill holiday-toggle'} aria-pressed={showHolidays} onClick={toggleHolidays}>
              Holidays
            </button>
            <button type="button" className="btn-text" onClick={onLogout}>Sign out</button>
          </div>
        </header>

        <main className="shell">
          <div className="toolbar">
            <div className="nav">
              <button type="button" className="icon-btn" aria-label={`Previous ${unit}`} onClick={() => step(-1)}>‹</button>
              <button type="button" className="icon-btn" aria-label={`Next ${unit}`} onClick={() => step(1)}>›</button>
              <button type="button" className="pill" onClick={() => setCursor(today)}>Today</button>
            </div>
            <h1 className="title">{titleFor(view, cursor)}</h1>
            <div className="switch" role="tablist" aria-label="View">
              {VIEWS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={view === key ? 'on' : ''}
                  onClick={() => setView(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {!offline && <button type="button" className="btn small" onClick={() => openNew(cursor)}>+ Add event</button>}
          </div>

          {offline && (
            <p className="banner offline" role="status">
              You're offline. Showing your saved calendar; adding and editing will work again when you're back online.
            </p>
          )}
          {loadError && <p className="banner" role="alert">{loadError}</p>}
          {showHolidays && holidayError && !offline && (
            <p className="banner" role="status">Couldn't load the holidays right now. Your events are fine.</p>
          )}

          {view === 'month' && (
            <>
              <MonthView
                cursor={cursor}
                events={shownEvents}
                today={today}
                holidays={holidays}
                onSelect={setCursor}
                onOpenDay={openDay}
                onAdd={addIfOnline}
                onEdit={edit}
              />
              <Agenda day={cursor} events={shownEvents} holidays={holidays} onAdd={addIfOnline} onEdit={edit} />
            </>
          )}

          {view === 'week' && (
            <WeekView
              cursor={cursor}
              events={shownEvents}
              today={today}
              now={now}
              holidays={holidays}
              onAddAt={addIfOnline}
              onEdit={edit}
              onOpenDay={openDay}
            />
          )}

          {view === 'day' && (
            <DayView
              cursor={cursor}
              events={shownEvents}
              today={today}
              holidays={holidays}
              onSelect={setCursor}
              onAdd={addIfOnline}
              onEdit={edit}
            />
          )}
        </main>

        <Footer />
      </div>

      {!offline && <button type="button" className="fab" aria-label="Add event" onClick={() => openNew(cursor)}>+</button>}

      <ReminderBanners banners={banners} onDismiss={dismiss} onView={(event) => setModal({ event })} />

      {modal && (
        <EventModal
          event={modal.event ?? null}
          me={me}
          offline={offline}
          friends={(friendData?.friends ?? []).map((friend) => friend.username)}
          onOpenFriends={() => {
            setModal(null)
            setShowFriends(true)
          }}
          defaults={modal.defaults}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            setReloadKey((n) => n + 1)
          }}
        />
      )}

      {showNotes && (
        <NotificationsModal
          data={noteData}
          offline={offline}
          onOpened={markNotesRead}
          // Accepting puts the event in the calendar: load everything again.
          onAnswered={() => setReloadKey((n) => n + 1)}
          onClose={() => setShowNotes(false)}
        />
      )}

      {showFriends && (
        <FriendsModal
          data={friendData}
          offline={offline}
          // Reloads friends and events (removing a friend can remove shared events).
          onChanged={() => setReloadKey((n) => n + 1)}
          onClose={() => setShowFriends(false)}
        />
      )}
    </div>
  )
}
