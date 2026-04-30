import { useCallback, useRef } from 'react'

/**
 * Single {@link AudioContext} for metronome, tuner, and synth lab (iOS wakes audio reliably on one graph).
 */
export function useSharedAudioContext() {
  const sharedAudioContextRef = useRef(null)

  const getSharedAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null
    const C = window.AudioContext || window.webkitAudioContext
    if (sharedAudioContextRef.current?.state === 'closed') {
      sharedAudioContextRef.current = null
    }
    if (!sharedAudioContextRef.current) {
      try {
        sharedAudioContextRef.current = new C({ latencyHint: 'interactive' })
      } catch {
        sharedAudioContextRef.current = new C()
      }
    }
    return sharedAudioContextRef.current
  }, [])

  return { getSharedAudioContext, sharedAudioContextRef }
}
