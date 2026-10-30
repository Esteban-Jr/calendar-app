// Small date helpers. Weeks start on Monday.

const pad = (n) => String(n).padStart(2, '0')

// '2026-10-12': the key that holiday dates use.
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1)
}

export function startOfWeek(date) {
  const d = startOfDay(date)
  return addDays(d, -((d.getDay() + 6) % 7))
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Always six rows of seven days, so the grid keeps the same height.
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  )
}

// Events that touch a given day (a long event shows on every day it covers).
export function eventsOnDay(events, day) {
  const from = startOfDay(day).getTime()
  const to = addDays(startOfDay(day), 1).getTime()
  return events
    .filter((e) => new Date(e.start).getTime() < to && new Date(e.end).getTime() > from)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
}

// For <input type="datetime-local">: "2026-11-05T19:00" in the user's own time.
export function toInputValue(date) {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export const formatTime = (date) => time.format(new Date(date))
export const formatMonthYear = (date) => monthYear.format(date)
export const formatLongDate = (date) => longDate.format(date)

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ---------- Week and day views ----------

export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

export function weekDays(date) {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatWeekRange(date) {
  const days = weekDays(date)
  return `${dayMonth.format(days[0])} – ${dayMonthYear.format(days[6])}`
}

export function formatDuration(start, end) {
  const minutes = Math.round((new Date(end) - new Date(start)) / 60000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round((minutes / 60) * 10) / 10
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`
}

// Place one day's events on a 24-hour column. Events that overlap in time
// share a "cluster" and sit side by side: each gets a lane (0, 1, ...) and
// the number of lanes in its cluster. An event that runs past midnight is
// cut to the part that falls inside this day.
export function layoutDay(events, day) {
  const dayStart = startOfDay(day).getTime()
  const dayEnd = dayStart + DAY_MS
  const items = events
    .map((event) => ({
      event,
      start: Math.max(new Date(event.start).getTime(), dayStart),
      end: Math.min(new Date(event.end).getTime(), dayEnd),
    }))
    .filter((item) => item.end > item.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const placed = []
  let cluster = []
  let clusterEnd = -1

  function flush() {
    const laneEnds = []
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.start)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(item.end)
      } else {
        laneEnds[lane] = item.end
      }
      item.lane = lane
    }
    for (const item of cluster) item.lanes = laneEnds.length
    placed.push(...cluster)
    cluster = []
    clusterEnd = -1
  }

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) flush()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  if (cluster.length) flush()

  return placed.map((item) => ({ ...item, dayStart }))
}

// ---------- Events that cross midnight ----------

const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' })

// How to describe `event` on the given `day`.
//   chip  short text for a chip or a block ("10:00 PM", "until 2:00 AM")
//   range the time range for a list card ("9:30 AM – 10:00 AM")
//   note  an extra line when the event runs past midnight ("Ends 2:00 AM Fri"), else ''
export function timeLabel(event, day) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const startsToday = start >= dayStart
  const endsToday = end <= dayEnd
  const startWithDay = `${weekdayShort.format(start)} ${formatTime(start)}`
  const endWithDay = `${formatTime(end)} ${weekdayShort.format(end)}`

  if (startsToday && endsToday) {
    return { chip: formatTime(start), range: `${formatTime(start)} – ${formatTime(end)}`, note: '' }
  }
  if (startsToday) {
    return {
      chip: formatTime(start),
      range: `${formatTime(start)} – ${endWithDay}`,
      note: `Ends ${endWithDay}`,
    }
  }
  if (endsToday) {
    return { chip: `until ${formatTime(end)}`, range: `Until ${formatTime(end)}`, note: `Started ${startWithDay}` }
  }
  return { chip: 'All day', range: 'All day', note: `${startWithDay} – ${endWithDay}` }
}
