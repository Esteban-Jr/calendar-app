// Every call to the Calendar API goes through this file.
import { getToken } from './auth.js'
import { saveEvents, savedEvents, saveValue, savedValue, setOffline } from './offline.js'

export class ApiError extends Error {
  constructor(status, body) {
    super(`API error ${status}`)
    this.status = status
    this.body = body
  }
}

async function readBody(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function login(username, password) {
  const response = await fetch('/api-auth/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await readBody(response)
  if (!response.ok) throw new ApiError(response.status, body)
  return body.token
}

// Calls that need no token: creating an account, emailed codes, password reset.
async function publicPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await readBody(response)
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}

export const register = (username, email, password) =>
  publicPost('/api/auth/register/', { username, email, password })
export const verifyCode = (email, code) => publicPost('/api/auth/verify/', { email, code }) // returns { token }
export const resendCode = (email) => publicPost('/api/auth/resend/', { email })
export const forgotPassword = (email) => publicPost('/api/auth/forgot/', { email })
export const resetPassword = (email, code, password) =>
  publicPost('/api/auth/reset/', { email, code, password })

// Called when the server says our token is no longer valid (401).
let onUnauthorized = () => {}
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

async function request(path, { method = 'GET', body, params } = {}) {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path
  let response
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${getToken()}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    setOffline(true) // the request never reached the server
    throw err
  }
  setOffline(false)
  if (response.status === 401) {
    onUnauthorized()
    throw new ApiError(401, null)
  }
  if (response.status === 204) return null
  const data = await readBody(response)
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}

// Read calls keep a copy of what they get. If the server can't be reached
// (no internet), they answer from that copy instead, when there is one.
async function withSavedCopy(load, save, saved) {
  try {
    const data = await load()
    save(data)
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err // the server answered: a real error
    const copy = saved()
    if (copy === null) throw err
    return copy
  }
}

// Events that overlap the range [start, end]. Dates are JavaScript Dates.
export const listEvents = (start, end) =>
  withSavedCopy(
    () => request('/api/events/', { params: { start: start.toISOString(), end: end.toISOString() } }),
    (list) => saveEvents(start, end, list),
    () => savedEvents(start, end),
  )

// Colombian public holidays for a year: [{ date: '2026-10-12', title, name }]
export const listHolidays = (year) =>
  withSavedCopy(
    () => request('/api/holidays/', { params: { year } }),
    (list) => saveValue(`holidays-${year}`, list),
    () => savedValue(`holidays-${year}`),
  )

// Me: { id, username, email, next_username_change } (null when I can change it now).
export const getMe = () =>
  withSavedCopy(
    () => request('/api/me/'),
    (me) => saveValue('me', me),
    () => savedValue('me'),
  )

// Change my username (once a week). Returns the new `me`.
export const updateMe = (data) => request('/api/me/', { method: 'PATCH', body: data })

// Friends: { friends, incoming, outgoing }, each a list of { id, username }.
// `id` is the friendship (or request) id used to accept or remove it.
export const getFriends = () =>
  withSavedCopy(
    () => request('/api/friends/'),
    (data) => saveValue('friends', data),
    () => savedValue('friends'),
  )
export const sendFriendRequest = (username) => request('/api/friends/', { method: 'POST', body: { username } })
export const acceptFriend = (id) => request(`/api/friends/${id}/accept/`, { method: 'POST' })
export const removeFriend = (id) => request(`/api/friends/${id}/`, { method: 'DELETE' })

// Notifications: { unread, notifications: [{ id, message, read, created, ... }] }.
export const getNotifications = () =>
  withSavedCopy(
    () => request('/api/notifications/'),
    (data) => saveValue('notifications', data),
    () => savedValue('notifications'),
  )
export const markNotificationsRead = () => request('/api/notifications/read/', { method: 'POST' })

// Take an event someone shared with me off my calendar (the owner is told).
export const leaveEvent = (id) => request(`/api/events/${id}/leave/`, { method: 'POST' })

// Invites: events shared with me that I haven't answered yet. They're not in
// my calendar until I accept. Accepting returns the event; the owner is told
// either way.
export const listInvites = () => request('/api/events/invites/')
export const acceptInvite = (id) => request(`/api/events/${id}/accept/`, { method: 'POST' })
export const declineInvite = (id) => request(`/api/events/${id}/decline/`, { method: 'POST' })
// Owner only: send a fresh invite to someone who declined.
export const inviteAgain = (id, username) =>
  request(`/api/events/${id}/invite-again/`, { method: 'POST', body: { username } })

// Push notifications (reminders while the app is closed).
export const getPushKey = () => request('/api/push/key/')
export const savePushSubscription = (subscription) =>
  request('/api/push/subscribe/', { method: 'POST', body: subscription })
export const deletePushSubscription = (endpoint) =>
  request('/api/push/unsubscribe/', { method: 'POST', body: { endpoint } })

export const createEvent = (data) => request('/api/events/', { method: 'POST', body: data })
export const updateEvent = (id, data) => request(`/api/events/${id}/`, { method: 'PATCH', body: data })
export const deleteEvent = (id) => request(`/api/events/${id}/`, { method: 'DELETE' })

const FIELD_LABELS = {
  shared_with: 'Share with',
  title: 'Title',
  start: 'Starts',
  end: 'Ends',
  reminder: 'Reminder',
  color: 'Colour',
  username: 'Username',
  email: 'Email',
  password: 'Password',
  code: 'Code',
}

function friendly(text) {
  const unknown = text.match(/username=(.+?) does not exist/)
  return unknown ? `There is no user called "${unknown[1]}".` : text
}

// Turn the API's error body into short readable sentences.
export function errorMessages(error) {
  if (!(error instanceof ApiError)) {
    return ["Can't reach the server. Check your connection and try again."]
  }
  if (error.status === 429) return ['Too many tries. Please wait a few minutes and try again.']
  if (error.status === 503 && error.body?.detail) return [error.body.detail]
  if (error.status === 403) return ["You don't have permission to do that."]
  if (error.status === 404) return ['That event no longer exists.']
  const body = error.body
  if (body && typeof body === 'object') {
    return Object.entries(body).map(([field, messages]) => {
      const text = friendly([].concat(messages).join(' '))
      if (field === 'non_field_errors' || field === 'detail') return text
      return `${FIELD_LABELS[field] || field}: ${text}`
    })
  }
  return ['Something went wrong on the server. Try again in a moment.']
}
