import { getBootstrapStateFromUserDataContent } from './metronomeBootstrapState.js'

const CACHE_KEY_PREFIX = 'metronome.userData.v1.'

/** @param {string} userId */
function keyFor(userId) {
  return `${CACHE_KEY_PREFIX}${userId}`
}

/**
 * Caches the last known `user_data.data` JSON so the metronome can render before
 * the network request finishes (SWR: show cache, revalidate in background).
 * @param {string} userId
 * @param {unknown} dataContent — the `row.data` object (songs, prefs, …)
 */
export function writeUserDataContentCache(userId, dataContent) {
  if (!userId) return
  try {
    window.localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ v: 1, t: Date.now(), data: dataContent }),
    )
  } catch {
    // Quota or private mode: ignore
  }
}

/** @param {string} userId */
export function readMetronomeBootstrapFromUserDataCache(userId) {
  if (!userId || typeof window === 'undefined' || !window.localStorage) return null
  let raw
  try {
    raw = window.localStorage.getItem(keyFor(userId))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) return null
    return getBootstrapStateFromUserDataContent(parsed.data)
  } catch {
    return null
  }
}
