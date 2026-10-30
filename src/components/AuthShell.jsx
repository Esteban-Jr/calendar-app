// The card every sign-in style screen sits in: logo, title, form, footer line.
function CalendarIcon() {
  return (
    <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
      <rect x="12" y="16" width="40" height="36" rx="7" fill="#fff" />
      <rect x="12" y="16" width="40" height="11" rx="5" fill="#cfe2ff" />
      <rect x="21" y="9" width="4.5" height="12" rx="2.25" fill="#fff" />
      <rect x="38.5" y="9" width="4.5" height="12" rx="2.25" fill="#fff" />
      <circle cx="23" cy="37" r="3.4" fill="#ffb3c7" />
      <circle cx="32" cy="37" r="3.4" fill="#b9e8cf" />
      <circle cx="41" cy="37" r="3.4" fill="#ffe08a" />
      <circle cx="27.5" cy="45" r="3.4" fill="#cdbbff" />
      <circle cx="36.5" cy="45" r="3.4" fill="#ffc9a3" />
    </svg>
  )
}

// Pass `onSubmit` when the card itself is the form. Screens that contain their own
// form (the code screens) leave it out, so forms are never nested.
export default function AuthShell({ title, subtitle, onSubmit, footer, children }) {
  const Card = onSubmit ? 'form' : 'div'
  return (
    <main className="page">
      <Card className="card login" onSubmit={onSubmit}>
        <div className="logo"><CalendarIcon /></div>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </Card>
    </main>
  )
}
