// The small line at the bottom of every screen: name, year and links.
const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="footer">
      <span>© {YEAR} My Calendar · Made by Esteban :)</span>
      <nav aria-label="Links">
        <a href="/api/docs/">API docs</a>
        <a href="https://github.com/Esteban-Jr/calendar-app" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
    </footer>
  )
}
