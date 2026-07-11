import { average } from '../average.js'
import { clamp } from '../clamp.js'

/** Median of a numeric array (non-mutating). Returns 0 for an empty array. */
export function median(nums) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Estimate BPM from a series of tap timestamps (ms, e.g. performance.now()).
 *
 * Needs at least two taps (one interval). A single stray tap — roughly half or double the beat —
 * is rejected against the median of the intervals so it does not skew the average. Returns null
 * when there aren't enough taps or the intervals are degenerate.
 *
 * @param {number[]} times ascending tap timestamps in milliseconds
 * @param {object} [opts]
 * @param {number} [opts.min=1] minimum BPM
 * @param {number} [opts.max=400] maximum BPM
 * @returns {number|null} whole-number BPM, or null if it can't be computed
 */
export function bpmFromTapTimes(times, { min = 1, max = 400 } = {}) {
  if (!Array.isArray(times) || times.length < 2) return null

  const intervals = []
  for (let i = 1; i < times.length; i += 1) intervals.push(times[i] - times[i - 1])
  if (intervals.some((v) => !(v > 0))) {
    // Fall back to only the strictly-positive intervals if any tap was out of order / duplicated.
    const positive = intervals.filter((v) => v > 0)
    if (!positive.length) return null
    intervals.length = 0
    intervals.push(...positive)
  }

  const med = median(intervals)
  const kept = intervals.filter((v) => v >= med * 0.6 && v <= med * 1.75)
  const msPerBeat = average(kept.length ? kept : intervals)
  if (!(msPerBeat > 0)) return null

  return clamp(Math.round(60000 / msPerBeat), min, max)
}
