import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import './index.css'
import './themes.css'
import App from './App.jsx'
import { applyTheme, savedTheme } from './theme.js'

// The theme this device last used, before anything is drawn (no flash of the default look).
applyTheme(savedTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// The service worker lets phones show notifications, makes the app installable
// and lets it open offline. Only in the built app: during development it would
// keep serving old copies of files you have just changed.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => r.unregister()))
  }
}
