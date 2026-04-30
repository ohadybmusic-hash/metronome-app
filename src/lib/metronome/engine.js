/** Pure metronome math, meter rules, accent handling, and Web Audio click primitives (no React). */

export const BPM_MIN = 1
export const BPM_MAX = 400

export function clampBpm(bpm) {
  const n = Number(bpm)
  if (!Number.isFinite(n)) return 120
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n)))
}

export function clampBpmFloat(bpm) {
  const n = Number(bpm)
  if (!Number.isFinite(n)) return 120
  return Math.min(BPM_MAX, Math.max(BPM_MIN, n))
}

export function isIOSOrIPadOS() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iP(hone|ad|od)/.test(ua)) return true
  if (ua.includes('Mac') && 'ontouchend' in document) return true
  return false
}

export function isIOSAddToHomeScreenPWA() {
  if (typeof navigator === 'undefined') return false
  return 'standalone' in navigator && Boolean(navigator.standalone)
}

/**
 * Tuner + metronome used separate AudioContext instances; on iOS only the Tuner path (incl. mic)
 * reliably woke audio. A shared context fixes that. StereoPanner has been silent on some WebKit
 * and desktop stacks; the tuner (ref tone / analyser) always hit destination directly, so the
 * metronome used to sound "only after the tuner worked". Mix clicks to destination like the tuner.
 * (Pan UI is left in place; output is mono-center.)
 */
export function getMetronomeOutputNode(ctx, panner) {
  if (!ctx) return panner
  return ctx.destination
}

export function toUtcDayString(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addUtcDays(dayStr, deltaDays) {
  const m = String(dayStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  dt.setUTCDate(dt.getUTCDate() + Number(deltaDays || 0))
  return toUtcDayString(dt)
}

/** Seconds per quarter note at BPM (beat = quarter in 4/4). */
export function secondsPerQuarter(bpm) {
  return 60 / bpm
}

export function getMeter(timeSignature) {
  switch (timeSignature) {
    case '2/4':
      return { numerator: 2, denominator: 4, accentPulses: new Set([0]) }
    case '3/4':
      return { numerator: 3, denominator: 4, accentPulses: new Set([0]) }
    case '5/4':
      return { numerator: 5, denominator: 4, accentPulses: new Set([0, 3]) }
    case '6/8':
      return { numerator: 6, denominator: 8, accentPulses: new Set([0, 3]) }
    case '9/8':
      return { numerator: 9, denominator: 8, accentPulses: new Set([0, 3, 6]) }
    case '12/8':
      return { numerator: 12, denominator: 8, accentPulses: new Set([0, 3, 6, 9]) }
    case '3/8':
      return { numerator: 3, denominator: 8, accentPulses: new Set([0]) }
    case '5/8':
      return { numerator: 5, denominator: 8, accentPulses: new Set([0, 2]) }
    case '7/8':
      return { numerator: 7, denominator: 8, accentPulses: new Set([0, 2, 4]) }
    case '4/4':
    default:
      return { numerator: 4, denominator: 4, accentPulses: new Set([0]) }
  }
}

export function getSubdivisionFactor(subdivision) {
  switch (subdivision) {
    case 'eighth':
      return 2
    case 'triplet':
      return 3
    case 'sixteenth':
      return 4
    case 'quarter':
    default:
      return 1
  }
}

export function createBeepAt(ctx, when, output, { frequency, duration, volume }) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, when)

  const attack = 0.002
  const release = Math.max(0.004, duration - attack)

  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(volume, when + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + release)

  osc.connect(gain)
  gain.connect(output)

  osc.start(when)
  osc.stop(when + duration + 0.02)
}

export function createWoodblockAt(ctx, when, output, { frequency, volume }) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()

  osc.type = 'square'
  osc.frequency.setValueAtTime(frequency, when)

  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(Math.max(300, frequency), when)
  filter.Q.setValueAtTime(10, when)

  const attack = 0.001
  const decay = 0.03

  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), when + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(output)

  osc.start(when)
  osc.stop(when + attack + decay + 0.02)
}

/**
 * Plays a voice buffer on the Web Audio clock. If the clip is longer than the beat slot, speeds it up
 * (capped) so the next downbeat is not muddied; if still too long, hard-stops at the slot end.
 * @param {number} [opts.maxSlotSeconds] — time until the next count at the same metrical level (usually `secondsPerPulse`)
 */
export function createVoiceAt(ctx, when, output, buffer, { volume, maxSlotSeconds } = {}) {
  if (!buffer) return
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  const dur = buffer.duration
  let wall = dur
  const cap = maxSlotSeconds != null && maxSlotSeconds > 0.02 ? maxSlotSeconds * 0.9 : null
  if (cap != null && dur > cap) {
    const r = Math.min(2.5, dur / cap)
    src.playbackRate.value = r
    wall = Math.min(dur / r, cap)
  } else {
    src.playbackRate.value = 1
  }
  gain.gain.setValueAtTime(volume, when)
  src.connect(gain)
  gain.connect(output)
  src.start(when)
  src.stop(when + wall + 0.005)
}

/** TTS for counts: rate scales with tempo so the next `cancel()`+`speak()` does not clip mid-syllable as often. */
export function scheduleCountSpeech(ctx, when, text, { volume, pitch, slotSeconds, treatAsLongSyllable } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const delayMs = Math.max(0, (when - ctx.currentTime) * 1000)
  const slot = Math.max(0.08, Number(slotSeconds) || 0.25)
  const target = treatAsLongSyllable ? 0.36 : 0.26
  const rate = Math.min(2.2, Math.max(0.9, target / slot))
  window.setTimeout(() => {
    try {
      if (ctx.state === 'closed') return
    } catch {
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = pitch ?? 1.0
    u.volume = volume ?? 0.95
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }, delayMs)
}

export function defaultBeatAccents(meter) {
  const arr = Array.from({ length: meter.numerator }, () => 'NORMAL')
  if (arr.length) arr[0] = 'ACCENT3'
  return arr
}

export function normalizeBeatAccents(meter, maybeArr) {
  const allowed = new Set(['ACCENT3', 'ACCENT2', 'ACCENT1', 'NORMAL', 'MUTE'])
  let base = Array.isArray(maybeArr) ? maybeArr : []

  try {
    if (base.length >= 2) {
      const b0 = base[0]
      const b1 = base[1]
      const rest = base.slice(2)
      const restAllNormal = rest.every((x) => x === 'NORMAL' || x == null)
      if (b0 === 'NORMAL' && b1 === 'ACCENT' && restAllNormal) {
        base = ['ACCENT3', 'NORMAL', ...rest]
      }
    }
  } catch {
    // ignore
  }

  const next = Array.from({ length: meter.numerator }, (_, i) => {
    const v = base[i]
    const fallback = i === 0 ? 'ACCENT3' : 'NORMAL'
    if (v === 'ACCENT') return 'ACCENT3'
    if (v === 'SOFT') return 'ACCENT1'
    return allowed.has(v) ? v : fallback
  })

  if (next.length && next[0] === 'NORMAL') {
    const anyOther = next.slice(1).some((x) => x !== 'NORMAL')
    if (!anyOther) next[0] = 'ACCENT3'
  }
  return next
}

export function getAccentMultiplier(level) {
  switch (level) {
    case 'MUTE':
      return 0
    case 'ACCENT1':
      return 0.75
    case 'ACCENT2':
      return 1.05
    case 'ACCENT3':
      return 1.25
    case 'NORMAL':
    default:
      return 1.0
  }
}

export function getAccentTimbre(level) {
  switch (level) {
    case 'ACCENT3':
      return { kind: 'wood', freq: 2350, dur: 0.032 }
    case 'ACCENT2':
      return { kind: 'wood', freq: 2000, dur: 0.03 }
    case 'ACCENT1':
      return { kind: 'beep', freq: 980, dur: 0.028 }
    case 'NORMAL':
    default:
      return { kind: 'beep', freq: 820, dur: 0.028 }
  }
}
