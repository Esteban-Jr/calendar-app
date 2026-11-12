import { useEffect, useRef, useState } from 'react'

export const PULL_THRESHOLD = 64 // how far (after slowing down) you pull before letting go refreshes
const MAX_PULL = 140 // the furthest the page can be pulled down
const HOLD_AT = 80 // where the page waits while it refreshes
const RESISTANCE = 0.6 // the page moves a bit less than the finger
const DEADZONE = 8 // ignore tiny finger wobbles before deciding it's a pull
const MIN_SPIN = 600 // keep the spinner up long enough to be seen

// Is the finger on something that has its own scroll box that's not at the top?
// (Like the week grid scrolled down.) Then pulling down should scroll that box.
function insideScrolledBox(element) {
  for (let el = element; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true
  }
  return false
}

// "Pull down to refresh", like in a browser, for touch screens.
// Only starts when the page is at the very top, the finger moves mostly
// downwards, and no window (like Add event) is open.
// Returns how far the user has pulled (in px), whether a finger is pulling
// right now, and whether it's refreshing.
export default function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [dragging, setDragging] = useState(false) // finger down and pulling
  const latest = useRef(onRefresh)
  const busy = useRef(false)

  useEffect(() => {
    latest.current = onRefresh
  })

  useEffect(() => {
    let startY = null
    let startX = 0
    let pulling = false
    let distance = 0

    // Stop the browser's own pull-to-refresh (Chrome on Android), which would
    // reload the whole page on top of ours.
    const root = document.documentElement
    const before = root.style.overscrollBehaviorY
    root.style.overscrollBehaviorY = 'contain'

    function reset() {
      startY = null
      pulling = false
      distance = 0
    }

    function onStart(event) {
      if (busy.current || event.touches.length !== 1 || window.scrollY > 0) return
      if (event.target.closest?.('.backdrop') || insideScrolledBox(event.target)) return
      startY = event.touches[0].clientY
      startX = event.touches[0].clientX
      pulling = false
    }

    function onMove(event) {
      if (startY === null) return
      const dy = event.touches[0].clientY - startY
      const dx = event.touches[0].clientX - startX
      if (!pulling) {
        if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return
        // Sideways, upwards, or the page has scrolled: not a pull. Let it be.
        if (dy < 0 || Math.abs(dx) > Math.abs(dy) || window.scrollY > 0) {
          reset()
          return
        }
        pulling = true
        setDragging(true)
      }
      event.preventDefault() // no page bounce while pulling
      distance = Math.min(MAX_PULL, (dy - DEADZONE) * RESISTANCE)
      setPull(distance)
    }

    function onEnd() {
      if (startY === null) return
      const pulledEnough = pulling && distance >= PULL_THRESHOLD
      const wasPulling = pulling
      reset()
      setDragging(false)
      if (!wasPulling) return
      if (!pulledEnough) {
        setPull(0)
        return
      }
      busy.current = true
      setRefreshing(true)
      setPull(HOLD_AT)
      const wait = new Promise((resolve) => setTimeout(resolve, MIN_SPIN))
      Promise.all([Promise.resolve(latest.current()).catch(() => {}), wait]).finally(() => {
        busy.current = false
        setRefreshing(false)
        setPull(0)
      })
    }

    function onCancel() {
      if (startY === null) return
      reset()
      setDragging(false)
      if (!busy.current) setPull(0)
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false }) // so it can stop the bounce
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onCancel)
    return () => {
      root.style.overscrollBehaviorY = before
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
    }
  }, [])

  return { pull, dragging, refreshing }
}
