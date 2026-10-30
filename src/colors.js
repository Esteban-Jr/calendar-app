// The cake colours. The keys must match EVENT_COLORS in the API (events/models.py).
//   bg   = the pastel fill      edge = the stronger stripe on the left
//   text = dark text that stays readable on the fill
export const CAKE = {
  strawberry: { name: 'Strawberry', bg: '#ffd3df', edge: '#f08aa8', text: '#6b1d36' },
  peach:      { name: 'Peach',      bg: '#ffdcc2', edge: '#f2a56d', text: '#6b3410' },
  vanilla:    { name: 'Vanilla',    bg: '#fff3bf', edge: '#e8c94f', text: '#5c4a05' },
  pistachio:  { name: 'Pistachio',  bg: '#e0f2c3', edge: '#9dcf63', text: '#35520e' },
  mint:       { name: 'Mint',       bg: '#c8f3e1', edge: '#5fcfa2', text: '#0e5a3f' },
  blueberry:  { name: 'Blueberry',  bg: '#cbdfff', edge: '#6f9df0', text: '#173f8a' },
  lavender:   { name: 'Lavender',   bg: '#e1d4ff', edge: '#a98af0', text: '#3f2390' },
  bubblegum:  { name: 'Bubblegum',  bg: '#ffd0f0', edge: '#ee86cd', text: '#6e1a58' },
}

export const COLOR_KEYS = Object.keys(CAKE)

export function colorOf(event) {
  return CAKE[event.color] || CAKE.blueberry
}

// When the user doesn't choose a colour: take the colour(s) used least in
// the events we know about, and pick one of those at random.
export function pickLeastUsed(events) {
  const counts = Object.fromEntries(COLOR_KEYS.map((key) => [key, 0]))
  for (const event of events) {
    if (event.color in counts) counts[event.color] += 1
  }
  const fewest = Math.min(...Object.values(counts))
  const candidates = COLOR_KEYS.filter((key) => counts[key] === fewest)
  return candidates[Math.floor(Math.random() * candidates.length)]
}
