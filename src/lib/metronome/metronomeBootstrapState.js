import { readGuestMetronomeData } from './guestData.js'

/**
 * Local/guest storage → the same fields the metronome hook sets when `!authedUserId`.
 */
export function getBootstrapStateForGuest() {
  const g = readGuestMetronomeData()
  return {
    songs: g.songs,
    setlists: g.setlists,
    activeSongId: String(g.prefs?.activeSongId || ''),
    activeSetlistId: String(g.prefs?.activeSetlistId || ''),
  }
}

/**
 * `user_data.data` JSON → songs/setlists/prefs/streak + raw exercise progress for normalization.
 */
export function getBootstrapStateFromUserDataContent(content) {
  const c = content && typeof content === 'object' ? content : {}
  return {
    songs: Array.isArray(c.songs) ? c.songs : [],
    setlists: Array.isArray(c.setlists) ? c.setlists : [],
    activeSongId: String(c?.prefs?.activeSongId || ''),
    activeSetlistId: String(c?.prefs?.activeSetlistId || ''),
    streakCount: Math.max(0, Math.floor(Number(c?.streak?.streak_count) || 0)),
    lastPracticeDate: c?.streak?.last_practice_date || null,
    exerciseProgressRaw: c?.exerciseProgress,
  }
}
