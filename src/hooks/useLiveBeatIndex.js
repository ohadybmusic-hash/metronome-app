import { useEffect, useRef, useState } from 'react'
import { clamp } from '../lib/clamp.js'

/**
 * Live low-latency beat index within the measure (0-based), from scheduled audio callbacks.
 *
 * `onScheduledBeat` fires at *schedule* time — up to a full lookahead window (~160 ms) before the
 * click is audible. Setting state immediately would light the visualizer ahead of the sound, so we
 * defer each update with a timer aligned to `evt.when` on the AudioContext clock (same technique as
 * the floating HUD and the flash overlay), keeping the highlight in sync with what you hear.
 */
export function useLiveBeatIndex(met) {
  const [idx, setIdx] = useState(0)
  const getAudioTimeRef = useRef(met?.audioClock?.getAudioTime)
  useEffect(() => {
    getAudioTimeRef.current = met?.audioClock?.getAudioTime
  })

  useEffect(() => {
    const timers = new Set()
    const unsub = met.events.onScheduledBeat((evt) => {
      const beats = Math.max(1, met.pulsesPerMeasure || 1)
      const i = clamp(Number(evt?.pulseIndex ?? 0), 0, beats - 1)
      const getT = getAudioTimeRef.current
      const nowAudio = typeof getT === 'function' ? getT() : null
      const delayMs = nowAudio == null ? 0 : Math.max(0, (evt.when - nowAudio) * 1000)
      const id = window.setTimeout(() => {
        timers.delete(id)
        setIdx(i)
      }, delayMs)
      timers.add(id)
    })

    return () => {
      unsub?.()
      for (const id of timers) window.clearTimeout(id)
      timers.clear()
    }
  }, [met, met.events, met.pulsesPerMeasure])

  return idx
}
