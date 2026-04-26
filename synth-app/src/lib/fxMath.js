/**
 * `mult` = note length in **beats** (quarter note in 4/4 = 1).
 */
export const BEAT_OPTIONS = [
  { id: '1/32', mult: 0.125, label: '1/32' },
  { id: '1/32d', mult: 0.1875, label: '1/32d' },
  { id: '1/16', mult: 0.25, label: '1/16' },
  { id: '1/16d', mult: 0.375, label: '1/16d' },
  { id: '1/16t', mult: 1 / 6, label: '1/16t' },
  { id: '1/8', mult: 0.5, label: '1/8' },
  { id: '1/8d', mult: 0.75, label: '1/8d' },
  { id: '1/8t', mult: 1 / 3, label: '1/8t' },
  { id: '1/4', mult: 1, label: '1/4' },
  { id: '1/4d', mult: 1.5, label: '1/4d' },
  { id: '1/2', mult: 2, label: '1/2' },
  { id: '1/1', mult: 4, label: 'Whole' },
  { id: '2/1', mult: 8, label: '2 bars' },
]

const DEFAULT_MULT = 0.5

export function beatMultiplierForId(divisionId) {
  return BEAT_OPTIONS.find((b) => b.id === divisionId)?.mult ?? DEFAULT_MULT
}

export function getDelayTimeSeconds(fx) {
  if (fx.delayTimeMode === 'bpm') {
    const bpm = Math.max(40, Math.min(300, Number(fx.bpm) || 120))
    const mult = beatMultiplierForId(fx.bpmDivision)
    const t = (60 / bpm) * mult
    return clampT(t)
  }
  if (fx.delayTimeMode === 's') {
    return clampT(Number(fx.delayTimeS) || 0.25)
  }
  const ms = Number(fx.delayTimeMs)
  if (Number.isFinite(ms)) return clampT(ms / 1000)
  return 0.25
}

export function formatDelayPreview(fx) {
  const sec = getDelayTimeSeconds(fx)
  if (fx.delayTimeMode === 'bpm') {
    return `${(sec * 1000).toFixed(0)} ms @ ${Number(fx.bpm) || 120} BPM`
  }
  if (sec >= 0.1) {
    return `${sec.toFixed(2)} s`
  }
  return `${(sec * 1000).toFixed(0)} ms`
}

function clampT(t) {
  return Math.max(0.01, Math.min(2.2, t))
}

export function feedbackFromFx(fx) {
  const f = Number(fx.delayFeedback)
  if (!Number.isFinite(f)) return 0.4
  return Math.max(0, Math.min(0.9, f))
}
