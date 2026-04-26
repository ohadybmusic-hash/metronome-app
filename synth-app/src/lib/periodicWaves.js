const CACHE = new WeakMap()

function getCache(ctx) {
  if (!CACHE.has(ctx)) CACHE.set(ctx, new Map())
  return CACHE.get(ctx)
}

const H_MAX = 64

function makeSawSeries(roll) {
  const n = 1 + H_MAX
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let k = 1; k <= H_MAX; k += 1) {
    imag[k] = 1 / k ** roll
  }
  return { real, imag }
}

export function getPeriodicWave(ctx, id) {
  if (id === 'sawtooth') return null
  const c = getCache(ctx)
  if (c.has(id)) return c.get(id)

  let wave
  if (id === 'saw_soft') {
    const { real, imag } = makeSawSeries(1.5)
    wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  } else if (id === 'saw_bright') {
    const { real, imag } = makeSawSeries(0.88)
    wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  } else if (id === 'saw_digital') {
    const h = 20
    const n = 1 + h
    const real = new Float32Array(n)
    const imag = new Float32Array(n)
    for (let k = 1; k <= h; k += 1) {
      const s = 1 - (k % 5) * 0.12
      imag[k] = s * (1 / k) * 1.1
    }
    wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  } else if (id === 'saw_hall') {
    const { real, imag } = makeSawSeries(1.0)
    for (let k = 40; k < imag.length; k += 1) {
      imag[k] *= 0.2
    }
    wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false })
  } else {
    return null
  }
  c.set(id, wave)
  return wave
}

export const NATIVE_WAVEFORMS = new Set(['sine', 'sawtooth', 'square', 'triangle'])

export const SAW_WAVEFORMS = [
  { id: 'sawtooth', label: 'Saw' },
  { id: 'saw_soft', label: 'Saw — soft' },
  { id: 'saw_bright', label: 'Saw — bright' },
  { id: 'saw_digital', label: 'Saw — digital' },
  { id: 'saw_hall', label: 'Saw — body' },
]

export const COMMON_WAVEFORMS = [
  { id: 'sine', label: 'Sine' },
  { id: 'square', label: 'Square' },
  { id: 'triangle', label: 'Triangle' },
  ...SAW_WAVEFORMS,
]

/**
 * @param {AudioContext} ctx
 * @param {OscillatorNode} o
 * @param {string} id
 */
export function applyWaveformToOsc(ctx, o, id) {
  if (NATIVE_WAVEFORMS.has(id)) {
    o.type = id
    return
  }
  const w = getPeriodicWave(ctx, id)
  if (w) {
    o.setPeriodicWave(w)
  } else {
    o.type = 'sawtooth'
  }
}
