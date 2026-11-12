// Push notifications: reminders that arrive even when the app is closed.
// The phone's push service (Apple, Google, Mozilla) gives this device an
// address; the API keeps it and sends reminders there when they're due.
import { deletePushSubscription, getPushKey, savePushSubscription } from './api.js'

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// The public key arrives as base64url text; the browser wants raw bytes.
function keyBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

// Needs notification permission first. Returns true if push is on.
// Safe to call often: it reuses the existing subscription and re-saves it
// (so the API also learns who is signed in on this device now).
export async function enablePush() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false // no service worker (e.g. during development)
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const { key } = await getPushKey()
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) })
  }
  await savePushSubscription(subscription.toJSON())
  return true
}

// True when the server can push to this device. The server then sends the
// phone notifications for reminders, so the app must not send its own too.
export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration()
  return Boolean(await registration?.pushManager.getSubscription())
}

// Signing out: stop pushes to this device. Call it while still signed in,
// since telling the API needs the login token.
export async function disablePush() {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  try {
    await deletePushSubscription(subscription.endpoint)
  } catch {
    // Offline or token already gone: the device is still unsubscribed below,
    // and the server forgets the address the next time it tries to use it.
  }
  await subscription.unsubscribe()
}
