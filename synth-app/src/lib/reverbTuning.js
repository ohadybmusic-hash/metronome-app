export const REVERB_LEN_MIN = 0.2
export const REVERB_LEN_MAX = 2.4

/**
 * Space presets: nudge the **user** length & damping sliders. IR wall-clock
 * time still uses SIZE_SEC in the impulse (see `impulseResponse.js`).
 * Compact = shorter, brighter; vast = longer tail bias + darker in the high end.
 * @type {Record<'compact'|'normal'|'long'|'vast', { lenMul: number, dampAdd: number }>}
 */
export const REVERB_SPACE_TUNE = {
  compact: { lenMul: 0.75, dampAdd: -0.1 },
  normal: { lenMul: 1, dampAdd: 0 },
  long: { lenMul: 1.12, dampAdd: 0.05 },
  vast: { lenMul: 1.22, dampAdd: 0.1 },
}

/**
 * Reverb “mode” (algorithm): nudge time & tone on top of sliders + space.
 * @type {Record<'room'|'plate'|'digital'|'hall', { lenMul: number, dampAdd: number }>}
 */
export const REVERB_TYPE_TUNE = {
  room: { lenMul: 0.92, dampAdd: 0.04 },
  plate: { lenMul: 0.98, dampAdd: -0.05 },
  digital: { lenMul: 0.88, dampAdd: 0.08 },
  hall: { lenMul: 1.1, dampAdd: 0.04 },
}

/**
 * @param {unknown} s
 * @returns {keyof typeof REVERB_SPACE_TUNE}
 */
export function normalizeReverbSizeKey(s) {
  if (s === 'compact' || s === 'normal' || s === 'long' || s === 'vast') return s
  return 'normal'
}

/**
 * @param {{
 *   reverbType: string
 *   reverbSize?: string
 *   reverbLength?: number
 *   reverbDecay?: number
 *   reverbDamping?: number
 *   reverbDiffusion?: number
 * }} s
 * @returns {{ length: number, damping: number, diffusion: number, reverbSize: string }}
 */
export function getEffectiveReverbTuning(s) {
  const raw =
    s.reverbLength != null && Number.isFinite(s.reverbLength)
      ? s.reverbLength
      : s.reverbDecay != null && Number.isFinite(s.reverbDecay)
        ? s.reverbDecay
        : 1
  const userLen = Math.max(REVERB_LEN_MIN, Math.min(REVERB_LEN_MAX, raw))
  const userDamp = Math.max(
    0,
    Math.min(
      1,
      s.reverbDamping != null && Number.isFinite(s.reverbDamping)
        ? s.reverbDamping
        : 0.5,
    ),
  )
  const diffusion = Math.max(
    0,
    Math.min(
      1,
      s.reverbDiffusion != null && Number.isFinite(s.reverbDiffusion)
        ? s.reverbDiffusion
        : 0.5,
    ),
  )
  const rs = normalizeReverbSizeKey(s.reverbSize)
  const st = REVERB_SPACE_TUNE[rs]
  const tt = REVERB_TYPE_TUNE[s.reverbType] ?? { lenMul: 1, dampAdd: 0 }
  const len = Math.max(
    REVERB_LEN_MIN,
    Math.min(REVERB_LEN_MAX, userLen * st.lenMul * tt.lenMul),
  )
  const damping = Math.max(0, Math.min(1, userDamp + st.dampAdd + tt.dampAdd))
  return { length: len, damping, diffusion, reverbSize: rs }
}
