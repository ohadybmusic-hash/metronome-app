import { useEffect } from 'react'

/**
 * Unmount: stop interval, clear playing flag, null panner, optionally `close()` on owned context.
 */
export function useMetronomeAudioUnmount({
  getAudioContext,
  ctxRef,
  pannerRef,
  audioPrimedForCtxRef,
  timerIdRef,
  isPlayingRef,
  setIsPlaying,
}) {
  useEffect(() => {
    return () => {
      if (timerIdRef.current) window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
      isPlayingRef.current = false
      setIsPlaying(false)

      const ctx = ctxRef.current
      ctxRef.current = null
      pannerRef.current = null
      audioPrimedForCtxRef.current = null

      // App passes a shared AudioContext (Tuner + metronome). Never close() it here — on
      // React 18 Strict Mode or any remount, close() would leave a dead context in
      // getSharedAudioContext() and sound would fail until a full page reload. Only close
      // when this hook created its own context (no getAudioContext option).
      const shared = typeof getAudioContext === 'function'
      if (shared) return
      if (ctx && typeof ctx.close === 'function') ctx.close()
    }
    // Only re-bind cleanup when the shared-context option changes (matches prior `useMetronome` effect).
  }, [getAudioContext])
}
