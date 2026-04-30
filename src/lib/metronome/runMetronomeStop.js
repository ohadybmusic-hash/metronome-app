import { supabase } from '../supabaseClient.js'
import { logPracticeSessionAndUpdateStreak } from './practiceSessionLog.js'
import { cancelMetronomeCountIn } from './metronomeCountIn.js'

/**
 * Stops the transport: count-in, interval, voice, practice log, pulse/refs.
 * Keeps the same `[]` callback semantics as the previous inline `stop` in `useMetronome`.
 */
export function runMetronomeStop({
  countInRef,
  setCountInActive,
  setCountInBeatsRemaining,
  timerIdRef,
  ctxRef,
  practiceSessionRef,
  authedUserId,
  bpmRef,
  lastPracticeDate,
  setStreakCount,
  setLastPracticeDate,
  isAnonymous,
  setGuestSyncPrompt,
  isPlayingRef,
  setIsPlaying,
  setPulse,
  pulseIndexRef,
  polyIndexRef,
  practiceRef,
}) {
  // Cancel count-in if active.
  cancelMetronomeCountIn({ countInRef, setCountInActive, setCountInBeatsRemaining })
  if (timerIdRef.current) {
    window.clearInterval(timerIdRef.current)
    timerIdRef.current = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }

  // Practice Log: record a session on stop (authed only).
  const ctx = ctxRef.current
  const startedAt = practiceSessionRef.current.startedAtAudioTime
  if (authedUserId && ctx && startedAt != null) {
    const durationSeconds = Math.max(0, Math.round(ctx.currentTime - startedAt))
    if (durationSeconds > 0) {
      const bpmNow = Math.round(bpmRef.current)
      void logPracticeSessionAndUpdateStreak({
        supabase,
        authedUserId,
        bpmNow,
        durationSeconds,
        lastPracticeDate,
        setStreakCount,
        setLastPracticeDate,
        isAnonymous,
        setGuestSyncPrompt,
      })
    }
  }
  practiceSessionRef.current.startedAtAudioTime = null
  practiceSessionRef.current.bpmAtStart = null

  isPlayingRef.current = false
  setIsPlaying(false)
  setPulse(0)
  pulseIndexRef.current = 0
  polyIndexRef.current = 0

  // Stop practice accumulation (but keep totals for the session).
  practiceRef.current.lastAudioTime = null
}
