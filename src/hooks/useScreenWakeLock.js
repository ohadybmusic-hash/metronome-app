import { useEffect, useRef } from 'react'

/**
 * Best-effort Screen Wake Lock while `active` (secure context, user permission).
 */
export function useScreenWakeLock(active) {
  const sentinelRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function request() {
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await s.release()
          return
        }
        sentinelRef.current = s
      } catch {
        // denied / unsupported
      }
    }

    async function release() {
      try {
        await sentinelRef.current?.release?.()
      } catch {
        // ignore
      } finally {
        sentinelRef.current = null
      }
    }

    if (active) request()
    else release()

    const onVis = () => {
      if (active && document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      release()
    }
  }, [active])
}
