import { colorOf } from '../colors.js'
import SharedIcon from './SharedIcon.jsx'
import { WEEKDAYS, dateKey, eventsOnDay, isSameDay, monthGrid, timeLabel } from '../dates.js'

const MAX_CHIPS = 3

export default function MonthView({ cursor, events, today, holidays, onSelect, onOpenDay, onAdd, onEdit }) {
  const weeks = monthGrid(cursor)

  return (
    <div className="month">
      <div className="month-head">
        {WEEKDAYS.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>
      <div className="month-body">
        {weeks.flat().map((day) => {
          const dayEvents = eventsOnDay(events, day)
          const classes = ['cell']
          if (day.getMonth() !== cursor.getMonth()) classes.push('outside')
          if (isSameDay(day, today)) classes.push('today')
          if (isSameDay(day, cursor)) classes.push('selected')

          return (
            <div key={day.toISOString()} className={classes.join(' ')} onClick={() => onSelect(day)}>
              <div className="cell-top">
                <button
                  type="button"
                  className="cell-num"
                  aria-label={`Open ${day.toDateString()}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDay(day)
                  }}
                >
                  {day.getDate()}
                </button>
                {onAdd && (
                  <button
                    type="button"
                    className="cell-add"
                    aria-label={`Add an event on ${day.toDateString()}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAdd(day)
                    }}
                  >
                    +
                  </button>
                )}
              </div>
              {(holidays[dateKey(day)] || []).map((holiday) => (
                <div key={holiday.title} className="holiday" title={holiday.name}>{holiday.title}</div>
              ))}
              {dayEvents.slice(0, MAX_CHIPS).map((event) => {
                const color = colorOf(event)
                return (
                  <button
                    key={event.id}
                    type="button"
                    className={event.invite ? 'chip invite' : 'chip'}
                    title={`${event.invite ? 'Invite: ' : ''}${event.title}: ${timeLabel(event, day).range}`}
                    style={{ backgroundColor: color.bg, color: color.text, borderLeftColor: color.edge }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(event)
                    }}
                  >
                    <span className="chip-time">{timeLabel(event, day).chip}</span>
                    <span className="chip-title">{event.mine === false && <SharedIcon />}{event.title}</span>
                  </button>
                )
              })}
              {dayEvents.length > MAX_CHIPS && (
                <span className="more">+{dayEvents.length - MAX_CHIPS} more</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
