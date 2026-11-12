import { useEffect, useState } from 'react'
import { setUnauthorizedHandler } from './api.js'
import Calendar from './components/Calendar.jsx'
import AuthFlow from './components/AuthFlow.jsx'
import { clearToken, getToken, saveToken } from './auth.js'
import { disablePush } from './push.js'

export default function App() {
  const [token, setToken] = useState(getToken)

  function handleLogin(newToken, remember) {
    saveToken(newToken, remember)
    setToken(newToken)
  }

  async function handleLogout() {
    await disablePush().catch(() => {}) // before the token is gone: telling the API needs it
    clearToken()
    setToken(null)
  }

  // If the server stops accepting our token, go back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(handleLogout)
  }, [])

  if (!token) return <AuthFlow onLogin={handleLogin} />
  return <Calendar onLogout={handleLogout} />
}
