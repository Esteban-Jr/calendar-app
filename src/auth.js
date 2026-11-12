import { clearSaved } from './offline.js'

// The login token lives in localStorage when "Remember me" is ticked
// (survives closing the browser) and in sessionStorage otherwise
// (gone when the tab closes).
const KEY = 'calendar-token'

function read(store) {
  try {
    return store.getItem(KEY)
  } catch {
    return null
  }
}

export function getToken() {
  return read(localStorage) || read(sessionStorage)
}

export function saveToken(token, remember) {
  clearToken()
  try {
    ;(remember ? localStorage : sessionStorage).setItem(KEY, token)
  } catch {
    // Storage blocked: the user stays signed in until they reload.
  }
}

export function clearToken() {
  clearSaved() // signing out also removes the offline copy of the calendar
  try {
    localStorage.removeItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing to clear
  }
}
