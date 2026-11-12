import { useEffect, useState } from 'react'
import { acceptFriend, errorMessages, removeFriend, sendFriendRequest } from '../api.js'

// The API words its friend errors as whole sentences under "username", so
// show those as they are instead of "Username: ...".
function messages(err) {
  const own = err?.body?.username
  return own ? [].concat(own) : errorMessages(err)
}

// The Friends window: add people by username, answer requests, remove friends.
// `data` is { friends, incoming, outgoing } from the API; `onChanged` reloads it.
export default function FriendsModal({ data, offline, onChanged, onClose }) {
  const [username, setUsername] = useState('')
  const [notice, setNotice] = useState('')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(null) // the friend about to be removed

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Run one change, then reload the lists.
  async function act(change, success) {
    setBusy(true)
    setErrors([])
    setNotice('')
    try {
      await change()
      setNotice(success)
      setConfirming(null)
      await onChanged()
    } catch (err) {
      setErrors(messages(err))
    } finally {
      setBusy(false)
    }
  }

  function handleSend(e) {
    e.preventDefault()
    const name = username.trim()
    if (!name) return
    act(async () => {
      const result = await sendFriendRequest(name)
      setUsername('')
      return result
    }, `Request sent to ${name}. You can share events once they accept.`)
  }

  const { friends = [], incoming = [], outgoing = [] } = data || {}
  const nothing = !friends.length && !incoming.length && !outgoing.length

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal friends" role="dialog" aria-modal="true" aria-label="Friends">
        <h2>Friends</h2>

        {offline ? (
          <p className="note">You're offline. You can see your friends, and make changes once you're back online.</p>
        ) : (
          <form className="share-add" onSubmit={handleSend}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="their username"
              autoCapitalize="none"
              autoComplete="off"
              aria-label="Username to add as a friend"
            />
            <button type="submit" className="pill" disabled={busy || !username.trim()}>Add</button>
          </form>
        )}

        {notice && <p className="friends-notice" role="status">{notice}</p>}
        <ul className="errors" role="alert">
          {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>

        {incoming.length > 0 && (
          <section className="friend-group">
            <h3>Requests</h3>
            {incoming.map((person) => (
              <div key={person.id} className="friend-row">
                <span>{person.username}</span>
                {!offline && (
                  <>
                    <button type="button" className="btn-text" disabled={busy}
                      onClick={() => act(() => removeFriend(person.id), `Declined ${person.username}.`)}>
                      Decline
                    </button>
                    <button type="button" className="btn small" disabled={busy}
                      onClick={() => act(() => acceptFriend(person.id), `You and ${person.username} are now friends.`)}>
                      Accept
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="friend-group">
          <h3>Your friends</h3>
          {friends.length === 0 && (
            <p className="muted">{nothing ? 'No friends yet. Add someone by their username, and you can share events once they accept.' : 'No friends yet.'}</p>
          )}
          {friends.map((person) =>
            confirming === person.id ? (
              <div key={person.id} className="friend-row confirm">
                <span>Remove {person.username}? Events you share with each other stop being shared.</span>
                <button type="button" className="btn-text" onClick={() => setConfirming(null)}>No</button>
                <button type="button" className="btn-text danger" disabled={busy}
                  onClick={() => act(() => removeFriend(person.id), `Removed ${person.username}.`)}>
                  Yes, remove
                </button>
              </div>
            ) : (
              <div key={person.id} className="friend-row">
                <span>{person.username}</span>
                {!offline && (
                  <button type="button" className="btn-text danger" onClick={() => setConfirming(person.id)}>Remove</button>
                )}
              </div>
            ),
          )}
        </section>

        {outgoing.length > 0 && (
          <section className="friend-group">
            <h3>Waiting for them to accept</h3>
            {outgoing.map((person) => (
              <div key={person.id} className="friend-row">
                <span>{person.username}</span>
                {!offline && (
                  <button type="button" className="btn-text" disabled={busy}
                    onClick={() => act(() => removeFriend(person.id), `Cancelled the request to ${person.username}.`)}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="modal-actions">
          <span className="spacer" />
          <button type="button" className="btn small" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
