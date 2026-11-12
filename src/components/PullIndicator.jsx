import { PULL_THRESHOLD } from '../usePullToRefresh.js'

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </svg>
  )
}

// The round button that slides down from the top while you pull to refresh.
// The arrow turns as you pull and becomes a spinner while it loads.
export default function PullIndicator({ pull, dragging, refreshing }) {
  const ready = pull >= PULL_THRESHOLD
  const className = ['pull-indicator', !dragging && 'settle', refreshing && 'spinning', ready && 'ready'].filter(Boolean).join(' ')
  return (
    <>
      <div
        className={className}
        style={{
          transform: `translate(-50%, ${pull - 44}px) rotate(${refreshing ? 0 : (pull / PULL_THRESHOLD) * 270}deg)`,
          opacity: pull > 0 ? Math.min(1, pull / 30) : 0,
        }}
        aria-hidden="true"
      >
        <Arrow />
      </div>
      <p className="sr-only" role="status">{refreshing ? 'Refreshing your calendar…' : ''}</p>
    </>
  )
}
