import { colorOf } from '../colors.js'
import {
  WEEKDAYS, dateKey, eventsOnDay, formatDuration, formatLongDate, isSameDay, timeLabel, weekDays,
} from '../dates.js'

// The phone layout from the design: a week strip, then the day's cards.
export default function DayView({ cursor, events, today, holidays, onSelect, onAdd, onEdit }) {
  const days = weekDays(cursor)
  const dayEvents = eventsOnDay(events, cursor)

  return (
    <div className="dayview">
      <div className="strip">
        {days.map((day, i) => {
          const classes = ['strip-day']
          if (isSameDay(day, cursor)) classes.push('on')
          if (isSameDay(day, today)) classes.push('today')
          return (
            <button key={day.getTime()} type="button" className={classes.join(' ')} onClick={() => onSelect(day)}>
              <span>{WEEKDAYS[i]}</span>
              <b>{day.getDate()}</b>
              <i className={
                eventsOnDay(events, day).length ? 'dot' : holidays[dateKey(day)] ? 'dot gold' : 'dot none'
              }
              />
            </button>
          )
        })}
      </div>

      <div className="day-head">
        <h2>{formatLongDate(cursor)}</h2>
        {onAdd && <button type="button" className="link" onClick={() => onAdd(cursor)}>+ Add event</button>}
      </div>

      {(holidays[dateKey(cursor)] || []).map((holiday) => (
        <div key={holiday.title} className="holiday-banner">
          <b>Holiday</b> {holiday.title} <span>({holiday.name})</span>
        </div>
      ))}

      {dayEvents.length === 0 && <p className="empty">Nothing planned for this day.</p>}

      {dayEvents.map((event) => {
        const color = colorOf(event)
        return (
          <div key={event.id} className="day-row">
            <div className="day-time">
              <b>{timeLabel(event, cursor).chip}</b>
              <span>{formatDuration(event.start, event.end)}</span>
            </div>
            <button
              type="button"
              className={event.invite ? 'day-card invite' : 'day-card'}
              style={{ backgroundColor: color.bg, color: color.text, borderLeftColor: color.edge }}
              onClick={() => onEdit(event)}
            >
              <b>{event.title}</b>
              {timeLabel(event, cursor).note && <span>{timeLabel(event, cursor).note}</span>}
              {event.location && <span>{event.location}</span>}
              {event.invite ? (
                <span className="invite-tag">Invite from {event.owner_username} · tap to answer</span>
              ) : (
                event.mine === false && <span>Shared by {event.owner_username}</span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
