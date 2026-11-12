import { useEffect, useState } from 'react'
import {
  acceptInvite, createEvent, declineInvite, deleteEvent, errorMessages, leaveEvent, updateEvent,
} from '../api.js'
import { CAKE, COLOR_KEYS } from '../colors.js'
import { toInputValue } from '../dates.js'

const REMINDERS = [
  ['', 'No reminder'],
  ['0', 'At the time of the event'],
  ['10', '10 minutes before'],
  ['30', '30 minutes before'],
  ['60', '1 hour before'],
  ['1440', '1 day before'],
]

// `event` is an existing event to edit, or null for a new one.
// `defaults` gives the start/end (Dates) and colour for a new event.
// `me` is the person logged in; an event someone else shared can only be viewed.
// Offline, every event can only be viewed. `friends` (usernames) are the people
// it can be shared with; `onOpenFriends` opens the Friends window.
export default function EventModal({ event, me, offline, friends = [], onOpenFriends, defaults, onClose, onSaved }) {
  const sharedWithMe = Boolean(event && me && event.owner_username !== me.username)
  // An invite I haven't answered yet (it's shown faded in the calendar).
  const invite = Boolean(event?.invite)
  const readOnly = sharedWithMe || offline

  const [title, setTitle] = useState(event?.title ?? '')
  const [start, setStart] = useState(toInputValue(new Date(event?.start ?? defaults.start)))
  const [end, setEnd] = useState(toInputValue(new Date(event?.end ?? defaults.end)))
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [reminder, setReminder] = useState(event?.reminder == null ? '' : String(event.reminder))
  const [color, setColor] = useState(event?.color ?? defaults.color)
  const [sharedWith, setSharedWith] = useState(event?.shared_with ?? [])
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reminderOptions = REMINDERS.some(([value]) => value === reminder)
    ? REMINDERS
    : [...REMINDERS, [reminder, `${reminder} minutes before`]]

  function toggleShare(name) {
    setSharedWith(sharedWith.includes(name) ? sharedWith.filter((n) => n !== name) : [...sharedWith, name])
  }

  // Friends first, then anyone it's already shared with who isn't on the list.
  const shareChoices = [...friends, ...sharedWith.filter((name) => !friends.includes(name))]

  async function handleSave(e) {
    e.preventDefault()
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (!(endDate > startDate)) {
      setErrors(['The end must be after the start.'])
      return
    }
    setErrors([])
    setSaving(true)
    const data = {
      title: title.trim(),
      description,
      location,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      reminder: reminder === '' ? null : Number(reminder),
      color,
      shared_with: sharedWith,
    }
    try {
      if (event) await updateEvent(event.id, data)
      else await createEvent(data)
      onSaved()
    } catch (err) {
      setErrors(errorMessages(err))
      setSaving(false)
    }
  }

  // An event someone shared with me: take it off my calendar (they're told).
  async function handleLeave() {
    setSaving(true)
    try {
      await leaveEvent(event.id)
      onSaved()
    } catch (err) {
      setErrors(errorMessages(err))
      setSaving(false)
      setConfirmingLeave(false)
    }
  }

  // An invite: accept puts it in my calendar, decline keeps it out. The owner is told either way.
  async function answerInvite(accept) {
    setSaving(true)
    try {
      await (accept ? acceptInvite(event.id) : declineInvite(event.id))
      onSaved()
    } catch (err) {
      setErrors(errorMessages(err))
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteEvent(event.id)
      onSaved()
    } catch (err) {
      setErrors(errorMessages(err))
      setSaving(false)
      setConfirmingDelete(false)
    }
  }

  const heading = invite ? 'Invite' : readOnly ? 'Event' : event ? 'Edit event' : 'New event'

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" role="dialog" aria-modal="true" aria-label={heading} onSubmit={handleSave}>
        <h2>{heading}</h2>

        {invite && (
          <p className="note">
            <b>{event.owner_username}</b> invited you. Accept to add it to your calendar.
          </p>
        )}
        {sharedWithMe && !invite && (
          <p className="note">
            Shared with you by <b>{event.owner_username}</b>. You can look at it, but only they can change it.
          </p>
        )}
        {offline && !sharedWithMe && (
          <p className="note">You're offline. You can look at this event, and change it once you're back online.</p>
        )}

        <fieldset className="plain" disabled={readOnly}>
          <label className="field">
            <span>Title*</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus={!readOnly} required />
          </label>

          <div className="row">
            <label className="field">
              <span>Starts*</span>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </label>
            <label className="field">
              <span>Ends*</span>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </label>
          </div>

          <label className="field">
            <span>Location</span>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
          </label>

          <label className="field">
            <span>Notes</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </label>

          <label className="field">
            <span>Reminder</span>
            <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
              {reminderOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="field">
            <span>Colour</span>
            <div className="swatches" role="radiogroup" aria-label="Colour">
              {COLOR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={color === key}
                  aria-label={CAKE[key].name}
                  title={CAKE[key].name}
                  className={color === key ? 'swatch on' : 'swatch'}
                  style={{ background: CAKE[key].bg, borderColor: CAKE[key].edge }}
                  onClick={() => setColor(key)}
                />
              ))}
            </div>
          </div>
        </fieldset>

        {readOnly ? (
          sharedWith.length > 0 && (
            <div className="field">
              <span>Shared with</span>
              <div className="people">
                {sharedWith.map((name) => <span key={name} className="person">{name}</span>)}
              </div>
            </div>
          )
        ) : (
          <div className="field">
            <span>Share with friends (they can view, not edit)</span>
            {shareChoices.length > 0 ? (
              <div className="people" role="group" aria-label="Share with">
                {shareChoices.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={sharedWith.includes(name) ? 'person pick on' : 'person pick'}
                    aria-pressed={sharedWith.includes(name)}
                    onClick={() => toggleShare(name)}
                  >
                    {sharedWith.includes(name) && <span aria-hidden="true">✓ </span>}
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted share-empty">
                You can share events with friends.{' '}
                <button type="button" className="link" onClick={onOpenFriends}>Add friends</button>
              </p>
            )}
          </div>
        )}

        <ul className="errors" role="alert">
          {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>

        <div className="modal-actions">
          {!readOnly && event && !confirmingDelete && (
            <button type="button" className="btn-text danger" onClick={() => setConfirmingDelete(true)} disabled={saving}>
              Delete
            </button>
          )}
          {!readOnly && event && confirmingDelete && (
            <span className="confirm">
              Delete this event?
              <button type="button" className="btn-text danger" onClick={handleDelete} disabled={saving}>Yes, delete</button>
              <button type="button" className="btn-text" onClick={() => setConfirmingDelete(false)}>No</button>
            </span>
          )}
          {invite && !offline && (
            <>
              <button type="button" className="btn-text" onClick={onClose}>Later</button>
              <span className="spacer" />
              <button type="button" className="btn-text" onClick={() => answerInvite(false)} disabled={saving}>
                Decline
              </button>
              <button type="button" className="btn small" onClick={() => answerInvite(true)} disabled={saving}>
                Accept
              </button>
            </>
          )}
          {invite && offline && <span className="muted">You can answer once you're back online.</span>}
          {sharedWithMe && !invite && !offline && !confirmingLeave && (
            <button type="button" className="btn-text danger" onClick={() => setConfirmingLeave(true)} disabled={saving}>
              Remove from my calendar
            </button>
          )}
          {sharedWithMe && !invite && !offline && confirmingLeave && (
            <span className="confirm">
              Remove it? {event.owner_username} will be told.
              <button type="button" className="btn-text danger" onClick={handleLeave} disabled={saving}>Yes, remove</button>
              <button type="button" className="btn-text" onClick={() => setConfirmingLeave(false)}>No</button>
            </span>
          )}
          {!(invite && !offline) && <span className="spacer" />}
          {!confirmingLeave && !(invite && !offline) && (
            <button type="button" className="btn-text" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
          )}
          {!readOnly && <button type="submit" className="btn small" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>}
        </div>
      </form>
    </div>
  )
}
