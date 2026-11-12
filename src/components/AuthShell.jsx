import Footer from './Footer.jsx'

// The card every sign-in style screen sits in: logo, title, form, footer line.
function LionLogo() {
  return <img src="/logo-lion.png" alt="" width="56" height="56" />
}

// Pass `onSubmit` when the card itself is the form. Screens that contain their own
// form (the code screens) leave it out, so forms are never nested.
export default function AuthShell({ title, subtitle, onSubmit, footer, children }) {
  const Card = onSubmit ? 'form' : 'div'
  return (
    <main className="page">
      <Card className="card login" onSubmit={onSubmit}>
        <div className="logo"><LionLogo /></div>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </Card>
      <Footer />
    </main>
  )
}
