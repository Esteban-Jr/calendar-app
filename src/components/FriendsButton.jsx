function People() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7" />
    </svg>
  )
}

// Opens the Friends window. A small count shows requests waiting for an answer.
export default function FriendsButton({ waiting, onClick }) {
  const label = waiting ? `Friends (${waiting} waiting)` : 'Friends'
  return (
    <button type="button" className="pill friends-btn" aria-label={label} title={label} onClick={onClick}>
      <People />
      {waiting > 0 && <span className="count" aria-hidden="true">{waiting}</span>}
    </button>
  )
}
