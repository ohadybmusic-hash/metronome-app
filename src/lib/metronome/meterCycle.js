/** Common time signatures supported by the audio engine UI. */
export const METRONOME_TIME_SIGNATURES = [
  '2/4',
  '3/4',
  '4/4',
  '5/4',
  '3/8',
  '5/8',
  '6/8',
  '7/8',
  '9/8',
  '12/8',
]

/**
 * @param {string} current
 * @param {number} delta +1 / -1
 */
export function cycleTimeSignature(current, delta) {
  const idx = Math.max(0, METRONOME_TIME_SIGNATURES.indexOf(current))
  const base = idx >= 0 ? idx : 2
  const len = METRONOME_TIME_SIGNATURES.length
  const next = (base + delta + len * 10) % len
  return METRONOME_TIME_SIGNATURES[next]
}

export const METRONOME_SUBDIVISIONS = ['quarter', 'eighth', 'triplet', 'sixteenth']

/**
 * @param {string} current
 * @param {number} delta
 */
export function cycleSubdivision(current, delta) {
  const idx = Math.max(0, METRONOME_SUBDIVISIONS.indexOf(current))
  const base = idx >= 0 ? idx : 0
  const len = METRONOME_SUBDIVISIONS.length
  const next = (base + delta + len * 10) % len
  return METRONOME_SUBDIVISIONS[next]
}
