import { useEffect, useRef } from 'react'
import { colorOf } from '../colors.js'
import SharedIcon from './SharedIcon.jsx'
import {
  HOUR_MS, WEEKDAYS, dateKey, eventsOnDay, isSameDay, layoutDay, timeLabel, weekDays,
} from '../dates.js'

export const HOUR_PX = 56
const HOURS = Array.from({ length: 24 }, (_, h) => h)

function hourLabel(h) {
  if (h === 0) return ''
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${((h + 11) % 12) + 1} ${suffix}`
}

export default function WeekView({ cursor, events, today, now, holidays, onAddAt, onEdit, onOpenDay }) {
  const days = weekDays(cursor)
  const scroller = useRef(null)
  const weekKey = days[0].getTime()
  const anyHoliday = days.some((day) => holidays[dateKey(day)])

  // Start the scroll a little before the working day, or near "now" this week.
  useEffect(() => {
    const showsToday = days.some((d) => isSameDay(d, new Date()))
    const hour = showsToday ? Math.max(new Date().getHours() - 1, 0) : 7
    if (scroller.current) scroller.current.scrollTop = Math.max(hour * HOUR_PX - 14, 0)
  }, [weekKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSlotClick(day, event) {
    const y = event.clientY - event.currentTarget.getBoundingClientRect().top
    onAddAt(day, Math.min(Math.max(Math.floor(y / HOUR_PX), 0), 23))
  }

  return (
    <div className="week">
      <div className="week-inner">
        <div className="week-head">
          <div />
          {days.map((day, i) => (
            <button
              key={day.getTime()}
              type="button"
              className={isSameDay(day, today) ? 'week-day today' : 'week-day'}
              onClick={() => onOpenDay(day)}
            >
              <span>{WEEKDAYS[i]}</span>
              <b>{day.getDate()}</b>
            </button>
          ))}
        </div>

        {anyHoliday && (
          <div className="week-allday">
            <div className="allday-label">Holiday</div>
            {days.map((day) => (
              <div key={day.getTime()} className="allday-cell">
                {(holidays[dateKey(day)] || []).map((holiday) => (
                  <div key={holiday.title} className="holiday" title={holiday.name}>{holiday.title}</div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="week-scroll" ref={scroller}>
          <div className="week-grid" style={{ height: 24 * HOUR_PX }}>
            <div className="hours">
              {HOURS.map((h) => (
                <span key={h} style={{ top: h * HOUR_PX }}>{hourLabel(h)}</span>
              ))}
            </div>

            {days.map((day) => {
              const placed = layoutDay(eventsOnDay(events, day), day)
              const isToday = isSameDay(day, now)
              return (
                <div
                  key={day.getTime()}
                  className={isToday ? 'week-col today' : 'week-col'}
                  onClick={(e) => handleSlotClick(day, e)}
                >
                  {placed.map(({ event, start, end, lane, lanes, dayStart }) => {
                    const color = colorOf(event)
                    const height = Math.max(((end - start) / HOUR_MS) * HOUR_PX - 2, 20)
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className="block"
                        title={`${event.title}: ${timeLabel(event, day).range}`}
                        style={{
                          top: ((start - dayStart) / HOUR_MS) * HOUR_PX,
                          height,
                          // How many whole 12px title lines fit (used on phones).
                          '--lines': Math.max(Math.floor((height - 4) / 12), 1),
                          left: `calc(${(lane / lanes) * 100}% + 2px)`,
                          width: `calc(${100 / lanes}% - 4px)`,
                          background: color.bg,
                          color: color.text,
                          borderLeftColor: color.edge,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(event)
                        }}
                      >
                        <b>{event.mine === false && <SharedIcon />}{event.title}</b>
                        <span>{timeLabel(event, day).chip}</span>
                      </button>
                    )
                  })}
                  {isToday && (
                    <div className="now" style={{ top: ((now.getTime() - dayStartOf(now)) / HOUR_MS) * HOUR_PX }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function dayStartOf(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}
