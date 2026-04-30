import { useEffect, useState } from 'react'
import { clamp } from '../lib/clamp.js'

/**
 * Live low-latency beat index within the measure (0-based), from scheduled audio callbacks.
 */
export function useLiveBeatIndex(met) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    return met.events.onScheduledBeat((evt) => {
      const beats = Math.max(1, met.pulsesPerMeasure || 1)
      const i = clamp(Number(evt?.pulseIndex ?? 0), 0, beats - 1)
      setIdx(i)
    })
  }, [met, met.events, met.pulsesPerMeasure])

  return idx
}
