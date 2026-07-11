import { useRef, useState } from 'react'
import { bpmFromTapTimes } from '../lib/metronome/tapTempo.js'

const MAX_TAPS = 6 // sliding window: up to 5 intervals averaged
const IDLE_RESET_MS = 2000

/**
 * Tap tempo → BPM. Responds from the 2nd tap and refines as you keep tapping, averaging a
 * sliding window of the last few intervals. A single stray tap (roughly half or double the
 * beat) is rejected against the median so it doesn't throw off the estimate. Idle for 2s resets.
 * The BPM math lives in `lib/metronome/tapTempo.js` (pure + unit-tested).
 * @param {object} met
 * @param {function(number): void} met.setBpm
 */
export function useMetronomeTapTempo(met) {
  const tapRef = useRef({
    times: [],
    lastTapAt: 0,
  })
  const [tapHint, setTapHint] = useState('Tap to set tempo')

  const handleTap = () => {
    const now = performance.now()
    const tr = tapRef.current

    // Reset if the user pauses tapping for 2s (starting a fresh tempo).
    if (tr.lastTapAt && now - tr.lastTapAt > IDLE_RESET_MS) tr.times = []
    tr.lastTapAt = now

    tr.times.push(now)
    while (tr.times.length > MAX_TAPS) tr.times.shift()

    // Need at least two taps (one interval) before we can estimate a tempo.
    if (tr.times.length < 2) {
      setTapHint('Keep tapping…')
      return
    }

    const nextBpm = bpmFromTapTimes(tr.times)
    if (nextBpm == null) return
    met.setBpm(nextBpm)
    setTapHint(`${nextBpm} BPM`)
  }

  return { tapHint, handleTap }
}
