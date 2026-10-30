// Reminders that have come due, shown inside the app until dismissed.
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

export default function ReminderBanners({ banners, onDismiss, onView }) {
  if (banners.length === 0) return null
  return (
    <div className="banners" role="region" aria-label="Reminders" aria-live="polite">
      {banners.slice(0, 3).map((banner) => (
        <div key={banner.key} className="reminder">
          <span className="reminder-icon"><BellIcon /></span>
          <div className="reminder-text">
            <b>{banner.title}</b>
            <span>{banner.when}</span>
            <span>{banner.detail}</span>
          </div>
          <div className="reminder-actions">
            <button type="button" className="btn-text" onClick={() => { onView(banner.event); onDismiss(banner.key) }}>View</button>
            <button type="button" className="btn-text" onClick={() => onDismiss(banner.key)}>Dismiss</button>
          </div>
        </div>
      ))}
      {banners.length > 3 && <p className="banners-more">+{banners.length - 3} more reminders</p>}
    </div>
  )
}
