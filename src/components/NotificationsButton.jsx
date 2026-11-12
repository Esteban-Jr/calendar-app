function Bell() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

// The bell: opens the Notifications window. A red number shows unread ones.
export default function NotificationsButton({ unread, onClick }) {
  const label = unread ? `Notifications (${unread} unread)` : 'Notifications'
  return (
    <button type="button" className="pill bell" aria-label={label} title={label} onClick={onClick}>
      <Bell />
      {unread > 0 && <span className="count" aria-hidden="true">{unread}</span>}
    </button>
  )
}
