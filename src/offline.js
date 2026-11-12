// A saved copy of what the API last sent, so the calendar can still be shown
// without internet (read-only). It lives in localStorage and is wiped when
// you sign out, so the next person on this device never sees it.
const KEY = 'calendar-offline'

// events: id -> event; ranges: [[start, end], ...] in ms, the dates the
// copy covers (so an empty day can be told apart from a day never loaded).
const EMPTY = { events: {}, ranges: [], values: {} }

function load() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return { ...EMPTY }
  }
}

function store(saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // Storage full or blocked: offline just won't have the latest copy.
  }
}

const overlaps = (event, start, end) => new Date(event.start) < end && new Date(event.end) > start

// The API sent every event in [start, end): replace that part of the copy,
// so events deleted on the server disappear from it too.
export function saveEvents(start, end, list) {
  const saved = load()
  for (const [id, event] of Object.entries(saved.events)) {
    if (overlaps(event, start, end)) delete saved.events[id]
  }
  for (const event of list) saved.events[event.id] = event
  saved.ranges = mergeRanges([...saved.ranges, [start.getTime(), end.getTime()]])
  store(saved)
}

// Join overlapping or touching ranges: [[1,5],[3,8],[9,10]] -> [[1,8],[9,10]]
function mergeRanges(ranges) {
  const merged = []
  for (const [s, e] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1]
    if (last && s <= last[1]) last[1] = Math.max(last[1], e)
    else merged.push([s, e])
  }
  return merged
}

// Saved events in [start, end), or null if those dates were never saved.
export function savedEvents(start, end) {
  const saved = load()
  const covered = saved.ranges.some(([s, e]) => s <= start.getTime() && e >= end.getTime())
  if (!covered) return null
  return Object.values(saved.events)
    .filter((event) => overlaps(event, start, end))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
}

// Anything else worth keeping: who I am, holidays per year.
export function saveValue(name, value) {
  const saved = load()
  saved.values[name] = value
  store(saved)
}

export const savedValue = (name) => load().values[name] ?? null

export function clearSaved() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}

// ---------- Are we offline? ----------
// True after a request fails to reach the server; false again after one
// succeeds or the phone says the connection is back.

let offline = typeof navigator !== 'undefined' && navigator.onLine === false
const listeners = new Set()

export function setOffline(value) {
  if (value === offline) return
  offline = value
  for (const listener of listeners) listener()
}

export const isOffline = () => offline

export function subscribeOffline(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setOffline(true))
  window.addEventListener('online', () => setOffline(false))
}
