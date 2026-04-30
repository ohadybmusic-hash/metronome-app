import { useRef, useState } from 'react'
import { average } from '../lib/average.js'
import { clamp } from '../lib/clamp.js'

/**
 * 4-tap average → BPM, with 2s idle reset and hint string for the main metronome UI.
 * @param {object} met
 * @param {function(number): void} met.setBpm
 */
export function useMetronomeTapTempo(met) {
  const tapRef = useRef({
    times: [],
    lastTapAt: 0,
  })
  const [tapHint, setTapHint] = useState('Tap 4+ times')

  const handleTap = () => {
    const now = performance.now()
    const tr = tapRef.current

    // Reset if user pauses tapping for 2s.
    if (tr.lastTapAt && now - tr.lastTapAt > 2000) tr.times = []
    tr.lastTapAt = now

    tr.times.push(now)
    // Keep only last 4 taps.
    while (tr.times.length > 4) tr.times.shift()

    if (tr.times.length < 4) {
      setTapHint('Tap 4 times')
      return
    }

    // 4 taps => 3 intervals; average them.
    const intervals = [tr.times[1] - tr.times[0], tr.times[2] - tr.times[1], tr.times[3] - tr.times[2]]
    const msPerBeat = average(intervals)
    const nextBpm = clamp(Math.round(60000 / msPerBeat), 1, 400)
    met.setBpm(nextBpm)
    setTapHint(`Set to ${nextBpm} BPM`)
  }

  return { tapHint, handleTap }
}
