export function parabolicInterpolation(m1, m2, m3) {
  // Returns fractional bin offset from the middle bin (m2) for a peak.
  const denom = m1 - 2 * m2 + m3
  if (denom === 0) return 0
  return 0.5 * (m1 - m3) / denom
}

export function midiToNoteName(midi) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const name = names[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${name}${octave}`
}

export function noteNameToMidi(note) {
  const m = String(note).trim().match(/^([A-G])(#?)(-?\d+)$/)
  if (!m) return null
  const letter = m[1]
  const sharp = m[2] === '#'
  const octave = Number(m[3])
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter]
  const semitone = base + (sharp ? 1 : 0)
  return (octave + 1) * 12 + semitone
}

export function midiToFreq(midi, a4 = 440) {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

export function centsBetween(freq, targetFreq) {
  return 1200 * Math.log2(freq / targetFreq)
}

export function freqToNoteName(freq, a4 = 440) {
  if (!Number.isFinite(freq) || freq <= 0) return null
  const semitonesFromA4 = 12 * Math.log2(freq / a4)
  const midi = Math.round(69 + semitonesFromA4)
  const targetFreq = midiToFreq(midi, a4)
  const cents = centsBetween(freq, targetFreq)
  return { name: midiToNoteName(midi), targetFreq, cents, midi }
}
