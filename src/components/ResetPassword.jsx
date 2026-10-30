import { useState } from 'react'
import { forgotPassword, resetPassword } from '../api.js'
import AuthShell from './AuthShell.jsx'
import CodeEntry from './CodeEntry.jsx'
import PasswordField from './PasswordField.jsx'

export default function ResetPassword({ email, onDone, onBack }) {
  const [password, setPassword] = useState('')

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Enter the code from your email and your new password."
      footer={<button type="button" className="inline-link" onClick={onBack}>Back to sign in</button>}
    >
      <CodeEntry
        email={email}
        submitLabel="Change password"
        onSubmit={async (code) => {
          await resetPassword(email, code, password)
          onDone()
        }}
        onResend={() => forgotPassword(email)}
      >
        <PasswordField label="New password*" value={password} onChange={setPassword}
          autoComplete="new-password" placeholder="at least 8 characters" />
      </CodeEntry>
    </AuthShell>
  )
}
