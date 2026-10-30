import { useState } from 'react'
import ForgotPassword from './ForgotPassword.jsx'
import Login from './Login.jsx'
import Register from './Register.jsx'
import ResetPassword from './ResetPassword.jsx'
import VerifyCode from './VerifyCode.jsx'

// All the screens you see while signed out, and how they lead to each other.
export default function AuthFlow({ onLogin }) {
  const [screen, setScreen] = useState('login')
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')

  const go = (name) => {
    setNotice('')
    setScreen(name)
  }

  if (screen === 'register') {
    return (
      <Register
        onCodeSent={(address) => { setEmail(address); go('verify') }}
        onSignIn={() => go('login')}
      />
    )
  }
  if (screen === 'verify') {
    return <VerifyCode email={email} onVerified={(token) => onLogin(token, true)} onBack={() => go('register')} />
  }
  if (screen === 'forgot') {
    return (
      <ForgotPassword
        onCodeSent={(address) => { setEmail(address); go('reset') }}
        onBack={() => go('login')}
      />
    )
  }
  if (screen === 'reset') {
    return (
      <ResetPassword
        email={email}
        onDone={() => { setScreen('login'); setNotice('Your password was changed. Sign in with your new password.') }}
        onBack={() => go('login')}
      />
    )
  }
  return <Login onLogin={onLogin} onForgot={() => go('forgot')} onSignup={() => go('register')} notice={notice} />
}
