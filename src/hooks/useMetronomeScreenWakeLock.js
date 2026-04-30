import { useEffect } from 'react'

/**
 * Best-effort screen wake lock while the metronome is playing (re-acquires on tab visible).
 */
export function useMetronomeScreenWakeLock(isPlaying) {
  useEffect(() => {
    let cancelled = false
    let sentinel = null

    async function request() {
      if (typeof navigator === 'undefined') return
      if (!('wakeLock' in navigator)) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          sentinel = null
          return
        }
        sentinel.addEventListener?.('release', () => {
          // noop; best-effort
        })
      } catch {
        // ignore (unsupported / denied / not in secure context)
      }
    }

    async function release() {
      try {
        await sentinel?.release?.()
      } catch {
        // ignore
      } finally {
        sentinel = null
      }
    }

    if (isPlaying) request()
    else release()

    const onVis = () => {
      if (!isPlaying) return
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      release()
    }
  }, [isPlaying])
}
