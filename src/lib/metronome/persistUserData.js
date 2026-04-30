import { supabase } from '../supabaseClient.js'
import { buildUserDataDocument } from './userDataPayload.js'
import { writeUserDataContentCache } from './userDataLocalCache.js'

/**
 * Upserts the signed-in user's `user_data` row (metronome songs, prefs, practice, exercise log).
 */
export async function upsertMetronomeUserData({
  userId,
  songs,
  setlists,
  activeSongId,
  activeSetlistId,
  streakCount,
  lastPracticeDate,
  practiceTotals,
  exerciseProgressSnapshot,
}) {
  const data = buildUserDataDocument({
    songs,
    setlists,
    activeSongId,
    activeSetlistId,
    streakCount,
    lastPracticeDate,
    practiceTotals,
    exerciseProgressSnapshot,
  })

  await supabase.from('user_data').upsert(
    {
      user_id: userId,
      data,
    },
    { onConflict: 'user_id' },
  )
  writeUserDataContentCache(userId, data)
}
