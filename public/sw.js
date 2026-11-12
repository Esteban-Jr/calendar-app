// The service worker. It:
// (1) keeps a copy of the app's own files, so the app opens without internet
//     (your events come from a separate saved copy, see src/offline.js);
// (2) lets phones show notifications, and tapping one brings the app forward.
// API calls (/api/...) are never cached here: they always go to the server.

const CACHE = 'calendar-app-v1'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/apple-touch-icon.png']

// The scripts, styles and fonts a page uses. Their names change on every
// build, so read them from the page (and its stylesheet) itself.
async function filesUsedBy(html) {
  const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  for (const css of files.filter((f) => f.endsWith('.css'))) {
    const text = await (await fetch(css)).text()
    files.push(...[...text.matchAll(/url\((\/assets\/[^)]+\.woff2)\)/g)].map((m) => m[1]))
  }
  return [...new Set(files)]
}

// Save this version of the app, and drop files only older versions used.
async function saveAppFiles(html) {
  const cache = await caches.open(CACHE)
  const files = await filesUsedBy(html)
  await cache.addAll(files)
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname
    if (path.startsWith('/assets/') && !files.includes(path)) await cache.delete(request)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      await cache.addAll(SHELL)
      await saveAppFiles(await (await cache.match('/')).text())
      await self.skipWaiting()
    })(),
  )
})

// Remove copies made by older versions of this file.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const SERVER_ONLY = ['/api/', '/api-auth/', '/admin/', '/static/']

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin) return
  if (SERVER_ONLY.some((prefix) => url.pathname.startsWith(prefix))) return

  // Opening the app: try the server first (so updates show up straight away),
  // and keep that copy; with no internet, use the saved page.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            // A new deploy shows up here: keep the page and its new files.
            const copy = response.clone()
            event.waitUntil(
              copy.text().then(async (html) => {
                const cache = await caches.open(CACHE)
                await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html' } }))
                await saveAppFiles(html)
              }).catch(() => {}),
            )
          }
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Scripts, styles, fonts, icons: the saved copy if there is one (built files
  // never change under the same name), otherwise download and save it.
  event.respondWith(
    caches.match(event.request).then(
      (saved) =>
        saved ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return response
        }),
    ),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow('/')
    }),
  )
})
