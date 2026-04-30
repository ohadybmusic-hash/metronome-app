import { useEffect } from 'react'

/**
 * Re-prime and rescheduling after bfcache / focus / tab visible (pairs with `syncAudioAfterInterruption`).
 */
export function useMetronomeInterruptionResync(syncAudioAfterInterruption) {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return

    const onVis = () => {
      if (document.visibilityState === 'visible') syncAudioAfterInterruption()
    }
    const onPageShow = (e) => {
      if (e.persisted) syncAudioAfterInterruption()
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') syncAudioAfterInterruption()
    }

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onFocus)
    }
  }, [syncAudioAfterInterruption])
}
