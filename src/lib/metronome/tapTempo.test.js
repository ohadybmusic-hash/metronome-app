import { describe, it, expect } from 'vitest'
import { bpmFromTapTimes, median } from './tapTempo.js'

// Build an ascending series of tap timestamps from beat intervals (ms).
function taps(...intervalsMs) {
  const out = [0]
  for (const dt of intervalsMs) out.push(out[out.length - 1] + dt)
  return out
}

describe('median', () => {
  it('handles empty, odd, and even lengths', () => {
    expect(median([])).toBe(0)
    expect(median([5])).toBe(5)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('bpmFromTapTimes', () => {
  it('needs at least two taps', () => {
    expect(bpmFromTapTimes([])).toBeNull()
    expect(bpmFromTapTimes([100])).toBeNull()
  })

  it('responds from the 2nd tap (one interval)', () => {
    // 500ms interval → 120 BPM
    expect(bpmFromTapTimes(taps(500))).toBe(120)
  })

  it('averages a steady series', () => {
    // 500ms intervals → 120 BPM
    expect(bpmFromTapTimes(taps(500, 500, 500))).toBe(120)
    // 400ms → 150 BPM
    expect(bpmFromTapTimes(taps(400, 400, 400))).toBe(150)
  })

  it('rejects a single stray double-tap against the median', () => {
    // Four solid 500ms beats plus one accidental 60ms double-tap.
    // Without outlier rejection the average would be dragged well below 120.
    const withStray = bpmFromTapTimes(taps(500, 500, 60, 500))
    expect(withStray).toBeGreaterThanOrEqual(115)
    expect(withStray).toBeLessThanOrEqual(125)
  })

  it('rejects a stray long gap (missed beat) against the median', () => {
    // A 1500ms gap (missed a couple beats) shouldn't halve the tempo.
    const withGap = bpmFromTapTimes(taps(500, 1500, 500, 500))
    expect(withGap).toBeGreaterThanOrEqual(115)
    expect(withGap).toBeLessThanOrEqual(125)
  })

  it('clamps to the BPM range', () => {
    expect(bpmFromTapTimes(taps(10))).toBe(400) // absurdly fast → max
    expect(bpmFromTapTimes(taps(60000))).toBe(1) // absurdly slow → min
    expect(bpmFromTapTimes(taps(500), { min: 40, max: 100 })).toBe(100)
  })

  it('returns null on degenerate (zero/negative) intervals', () => {
    expect(bpmFromTapTimes([100, 100])).toBeNull() // zero interval
  })

  it('ignores an out-of-order tap rather than dividing by a negative interval', () => {
    // [0, 500, 400, 900] → intervals 500, -100, 500; keep the positive ones → ~120.
    const out = bpmFromTapTimes([0, 500, 400, 900])
    expect(out).toBeGreaterThanOrEqual(115)
    expect(out).toBeLessThanOrEqual(125)
  })
})
