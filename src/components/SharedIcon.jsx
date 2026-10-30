// A small "two people" mark for events that someone else shared with me.
export default function SharedIcon() {
  return (
    <svg className="shared-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Shared with you">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.2c2.7 0 4.5 2 4.5 4.8" />
    </svg>
  )
}
