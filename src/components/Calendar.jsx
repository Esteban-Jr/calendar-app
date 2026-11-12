import { useEffect, useMemo, useRef, useState } from 'react'
import { getMe, listEvents, listHolidays } from '../api.js'
import { pickLeastUsed } from '../colors.js'
import {
  addDays, addMonths, formatLongDate, formatMonthYear, formatWeekRange, monthGrid, startOfDay,
  weekDays,
} from '../dates.js'
import Agenda from './Agenda.jsx'
import Footer from './Footer.jsx'
import DayView from './DayView.jsx'
import EventModal from './EventModal.jsx'
import MonthView from './MonthView.jsx'
import ReminderBanners from './ReminderBanners.jsx'
import ReminderBell from './ReminderBell.jsx'
import WeekView from './WeekView.jsx'
import useReminders from '../useReminders.js'
import '../calendar.css'

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

function LogoMark() {
  return (
    <span className="mark" aria-hidden="true">
      <svg viewBox="0 0 64 64" width="22" height="22">
        <rect x="12" y="16" width="40" height="36" rx="7" fill="#fff" />
        <rect x="12" y="16" width="40" height="11" rx="5" fill="#cfe2ff" />
        <circle cx="23" cy="38" r="3.6" fill="#ffb3c7" />
        <circle cx="32" cy="38" r="3.6" fill="#b9e8cf" />
        <circle cx="41" cy="38" r="3.6" fill="#ffe08a" />
      </svg>
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

  const [from, to] = rangeFor(view, cursor)
  const rangeStart = from.getTime()
  const rangeEnd = to.getTime()

  useEffect(() => {
    let cancelled = false
    listEvents(new Date(rangeStart), new Date(rangeEnd))
      .then((data) => {
        if (cancelled) return
        setEvents(data)
        setLoadError('')
      })
      .catch((err) => {
        if (!cancelled && err.status !== 401) {
          setLoadError("Couldn't load your events. Check your connection and try again.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [rangeStart, rangeEnd, reloadKey])

  useEffect(() => {
    getMe().then(setMe).catch(() => {}) // a 401 is handled globally; anything else just means no "shared" marks
  }, [])

  // Mark events that belong to somebody else (shared with me).
  const shownEvents = useMemo(
    () => events.map((event) => ({ ...event, mine: !me || event.owner_username === me.username })),
    [events, me],
  )

  const { banners, dismiss } = useReminders({ me, refreshKey: reloadKey })

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
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    setModal({ defaults: { start, end, color: pickLeastUsed(shownEvents) } })
  }

  function openDay(day) {
    setCursor(startOfDay(day))
    setView('day')
  }

  const edit = (event) => setModal({ event })
  const unit = { month: 'month', week: 'week', day: 'day' }[view]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><LogoMark /> <span className="brand-name">My Calendar</span></div>
        <div className="top-actions">
          <ReminderBell />
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
          <button type="button" className="btn small" onClick={() => openNew(cursor)}>+ Add event</button>
        </div>

        {loadError && <p className="banner" role="alert">{loadError}</p>}
        {showHolidays && holidayError && (
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
              onAdd={openNew}
              onEdit={edit}
            />
            <Agenda day={cursor} events={shownEvents} holidays={holidays} onAdd={openNew} onEdit={edit} />
          </>
        )}

        {view === 'week' && (
          <WeekView
            cursor={cursor}
            events={shownEvents}
            today={today}
            now={now}
            holidays={holidays}
            onAddAt={openNew}
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
            onAdd={openNew}
            onEdit={edit}
          />
        )}
      </main>

      <Footer />

      <button type="button" className="fab" aria-label="Add event" onClick={() => openNew(cursor)}>+</button>

      <ReminderBanners banners={banners} onDismiss={dismiss} onView={(event) => setModal({ event })} />

      {modal && (
        <EventModal
          event={modal.event ?? null}
          me={me}
          defaults={modal.defaults}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            setReloadKey((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}
