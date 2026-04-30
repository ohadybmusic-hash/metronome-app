/** Canonical paths for main app tabs (shareable, back/forward friendly). */

export const APP_TAB_PATH = /** @type {const} */ ({
  metronome: '/metronome',
  tuner: '/tuner',
  setlists: '/setlists',
  practice: '/practice',
  synth: '/synth',
})

/** @typedef {keyof typeof APP_TAB_PATH} AppTabId */

const PATH_TO_TAB = {
  '/metronome': 'metronome',
  '/tuner': 'tuner',
  '/setlists': 'setlists',
  '/practice': 'practice',
  '/synth': 'synth',
}

/**
 * @param {string} pathname
 * @returns {AppTabId | null} `null` if pathname is not a known app tab (e.g. `/admin`).
 */
export function getTabFromPathname(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/'
  if (p === '/' || p === '/metronome') return 'metronome'
  const tab = PATH_TO_TAB[p]
  return tab ?? null
}

/**
 * @param {AppTabId} tab
 */
export function getPathForTab(tab) {
  return APP_TAB_PATH[tab] ?? APP_TAB_PATH.metronome
}

/** Paths handled by other {@link Routes} entries (not the main tab shell). */
export function isShellForeignPath(pathname) {
  const p = (pathname || '').replace(/\/+$/, '') || '/'
  return p.startsWith('/admin')
}
