import { resendCode, verifyCode } from '../api.js'
import CodeEntry from './CodeEntry.jsx'
import AuthShell from './AuthShell.jsx'

// Step 2 of creating an account: the right code creates it and signs you in.
export default function VerifyCode({ email, onVerified, onBack }) {
  return (
    <AuthShell
      title="Check your email"
      subtitle="Type the code we sent to finish creating your account."
      footer={<button type="button" className="inline-link" onClick={onBack}>Use a different email</button>}
    >
      <CodeEntry
        email={email}
        submitLabel="Confirm and sign in"
        onSubmit={async (code) => {
          const { token } = await verifyCode(email, code)
          onVerified(token)
        }}
        onResend={() => resendCode(email)}
      />
    </AuthShell>
  )
}
