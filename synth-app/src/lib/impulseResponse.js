import { REVERB_LEN_MAX, REVERB_LEN_MIN } from './reverbTuning.js'

/** Global IR time scale: “reverb size” button multiplies wall-clock length. */
const SIZE_SEC = {
  compact: 0.42,
  normal: 1,
  long: 1.75,
  vast: 2.5,
}

/**
 * Per mode: base duration at “normal” size and length ≈1 (before size / length).
 * Wider spread so Hall / Room / Plate / Digital are easier to tell apart in A/B.
 */
const TYPE_CORE_SEC = {
  room: 0.3,
  digital: 0.38,
  plate: 0.55,
  hall: 0.95,
}

const MAX_IR_SEC = 5.5

/**
 * @param {unknown} s
 * @returns {'compact' | 'normal' | 'long' | 'vast'}
 */
export function normalizeReverbSize(s) {
  if (s === 'compact' || s === 'normal' || s === 'long' || s === 'vast') {
    return s
  }
  return 'normal'
}

/**
 * @param {AudioContext} ctx
 * @param {'hall'|'plate'|'digital'|'room'} type
 * @param {{ length?: number, damping?: number, diffusion?: number, reverbSize?: string, decay?: number }} [opt] `decay` is a legacy alias for `length`
 */
export function createReverbBuffer(ctx, type, opt = {}) {
  const length = Math.max(
    REVERB_LEN_MIN,
    Math.min(REVERB_LEN_MAX, opt.length ?? opt.decay ?? 1),
  )
  const damping = Math.max(
    0,
    Math.min(1, opt.damping != null ? opt.damping : 0.5),
  )
  const diffusion = Math.max(
    0,
    Math.min(1, opt.diffusion != null ? opt.diffusion : 0.5),
  )
  const diffMix = 0.25 + 0.7 * diffusion
  const roomEarly = 0.2 + 0.55 * diffusion
  const reverbSize = normalizeReverbSize(opt.reverbSize)
  const sizeSec = SIZE_SEC[reverbSize]
  const sampleRate = ctx.sampleRate

  const lengthN =
    (length - REVERB_LEN_MIN) / (REVERB_LEN_MAX - REVERB_LEN_MIN)
  /** 0.28..1 — only tail duration (independent of damping) */
  const lenWeight = 0.28 + 0.72 * lengthN
  /** 0.12..0.95 — high-frequency / energy falloff in the IR (independent of length) */
  const damp = 0.1 + 0.88 * damping

  const core = TYPE_CORE_SEC[type] ?? 0.5
  const durationSec = Math.min(MAX_IR_SEC, core * sizeSec * lenWeight)
  const len = Math.max(
    Math.floor(sampleRate * 0.04),
    Math.floor(sampleRate * durationSec),
  )
  const buffer = ctx.createBuffer(2, len, sampleRate)

  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch)
    let prevDiffused = 0
    for (let i = 0; i < len; i += 1) {
      const t = len > 1 ? i / (len - 1) : 0
      const raw = (Math.random() * 2 - 1) * 0.92
      let n = raw
      if (type === 'hall') {
        const hMix = 0.14 + 0.58 * diffMix
        prevDiffused = (1.0 - hMix) * prevDiffused + hMix * raw
        n = 0.45 * raw + 0.55 * prevDiffused
      }

      if (type === 'hall') {
        const a = 0.36 / (0.4 + 0.6 * damp)
        const env = (1 - t) ** a * Math.exp(-t * (0.65 + 2.0 * damp))
        data[i] = n * env
      } else if (type === 'plate') {
        const a = 0.48 / (0.32 + 0.68 * damp)
        const env = (1 - t) ** a * Math.exp(-t * (0.9 + 2.4 * damp))
        const ring = 1.0 + 0.22 * diffMix * Math.sin(i * 0.01 + ch * 0.4)
        data[i] = n * env * 0.92 * ring
      } else if (type === 'digital') {
        const a = 1.15 + 0.85 * (1 - lengthN)
        const env = (1 - t) ** a * Math.exp(-t * (1.1 + 2.4 * damp))
        const g = (i * 0.12 + ch * 2.1) & 0x0f
        const step = 0.38 + 0.62 * (g < 4 ? 1 : 0.18)
        const loFi = 0.8 + 0.35 * (i & 1)
        data[i] = n * env * step * loFi
      } else {
        const a = 0.3 / (0.38 + 0.62 * damp)
        const env = (1 - t) ** a * Math.exp(-t * (1.5 + 2.9 * damp))
        let v = n * env * 0.86
        if (t < 0.16) {
          v +=
            n *
            roomEarly *
            (1 - t / 0.16) ** 2.4 *
            Math.exp(-t * (6.5 * damp + 0.4))
        }
        data[i] = v
      }
    }
  }

  let peak = 0.0001
  for (let ch = 0; ch < 2; ch += 1) {
    const dataL = buffer.getChannelData(ch)
    for (let i = 0; i < len; i += 1) {
      const a0 = Math.abs(dataL[i])
      if (a0 > peak) peak = a0
    }
  }
  const norm = 0.32 / peak
  for (let ch = 0; ch < 2; ch += 1) {
    const dataL = buffer.getChannelData(ch)
    for (let i = 0; i < len; i += 1) {
      dataL[i] *= norm
    }
  }

  return buffer
}
