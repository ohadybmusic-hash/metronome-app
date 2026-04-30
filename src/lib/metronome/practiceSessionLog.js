import { addUtcDays, toUtcDayString } from './engine.js'

/**
 * After stopping playback: insert `practice_sessions` row and update daily streak (UTC).
 * Swallows errors (same as in-hook behavior).
 */
export async function logPracticeSessionAndUpdateStreak({
  supabase,
  authedUserId,
  bpmNow,
  durationSeconds,
  lastPracticeDate,
  setStreakCount,
  setLastPracticeDate,
  isAnonymous,
  setGuestSyncPrompt,
}) {
  try {
    await supabase.from('practice_sessions').insert({
      user_id: authedUserId,
      bpm: bpmNow,
      duration_seconds: durationSeconds,
    })
    const today = toUtcDayString(new Date())
    const yesterday = addUtcDays(today, -1)
    setStreakCount((prev) => {
      const last = lastPracticeDate
      if (last === today) return prev
      if (last === yesterday) return prev + 1
      return 1
    })
    setLastPracticeDate((prev) => (prev === today ? prev : today))
    if (isAnonymous) {
      setGuestSyncPrompt('Create a permanent account to sync your data across devices.')
    }
  } catch {
    // ignore logging failures
  }
}
