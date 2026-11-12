import { colorOf } from '../colors.js'
import { dateKey, eventsOnDay, formatLongDate, timeLabel } from '../dates.js'

// The list of one day's events, as cards (the phone "day" layout).
export default function Agenda({ day, events, holidays, onEdit, onAdd }) {
  const dayEvents = eventsOnDay(events, day)

  return (
    <section className="agenda">
      <div className="agenda-head">
        <h2>{formatLongDate(day)}</h2>
        {onAdd && <button type="button" className="link" onClick={() => onAdd(day)}>+ Add event</button>}
      </div>
      {(holidays[dateKey(day)] || []).map((holiday) => (
        <div key={holiday.title} className="holiday-banner">
          <b>Holiday</b> {holiday.title} <span>({holiday.name})</span>
        </div>
      ))}
      {dayEvents.length === 0 && <p className="empty">Nothing planned for this day.</p>}
      {dayEvents.map((event) => {
        const color = colorOf(event)
        return (
          <button
            key={event.id}
            type="button"
            className="agenda-card"
            style={{ background: color.bg, color: color.text, borderLeftColor: color.edge }}
            onClick={() => onEdit(event)}
          >
            <span className="agenda-time">{timeLabel(event, day).range}</span>
            <span className="agenda-title">{event.title}</span>
            {timeLabel(event, day).note && <span className="agenda-place">{timeLabel(event, day).note}</span>}
            {event.location && <span className="agenda-place">{event.location}</span>}
            {event.mine === false && <span className="agenda-place">Shared by {event.owner_username}</span>}
          </button>
        )
      })}
    </section>
  )
}
