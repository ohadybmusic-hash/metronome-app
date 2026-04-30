import { midiToFreq, noteNameToMidi } from './pitch.js'

export function buildTuningTargets(tuning, a4) {
  const strings = Array.isArray(tuning?.strings) ? tuning.strings : []
  return strings
    .map((s) => {
      const midi = noteNameToMidi(s)
      if (midi == null) return null
      return { note: s, midi, freq: midiToFreq(midi, a4) }
    })
    .filter(Boolean)
}
