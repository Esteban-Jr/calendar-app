// Calendar themes (#30). The look itself is in src/themes.css; this file
// switches between them. The chosen theme is saved on the account (so it
// follows me to every device) and on this device (so the app opens in it
// straight away, before the account has loaded).

const KEY = 'calendar-theme'

// id, name, and what the little preview in the Account window looks like.
// `bar` is the phone's status-bar colour for the theme.
export const THEMES = [
  { id: 'default', name: 'Default', swatch: 'linear-gradient(135deg, #ffe3ec, #e6f1ff 50%, #dccfff)', dot: '#2f6fed', bar: '#2f6fed' },
  { id: 'faith', name: 'Faith', swatch: 'radial-gradient(90% 80% at 50% 0%, #ffe096, #fdf8ee 60%, #f5e6c8)', dot: '#9a6414', bar: '#9a6414' },
]

const known = (id) => THEMES.some((theme) => theme.id === id)

export function savedTheme() {
  try {
    const id = localStorage.getItem(KEY)
    return known(id) ? id : 'default'
  } catch {
    return 'default'
  }
}

// Show a theme now, and remember it on this device.
export function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0]
  document.documentElement.dataset.theme = theme.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bar)
  try {
    localStorage.setItem(KEY, theme.id)
  } catch {
    // it just won't be remembered on this device
  }
  return theme.id
}

// Signing out: the next person on this device starts with the default look.
export function resetTheme() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing to remove
  }
  applyTheme('default')
}
