import { createInitialDrumKit } from './drumKitDefaults.js'

function getStyleKit(id) {
  const b = createInitialDrumKit()
  if (id === 'default') return b
  if (id === 'tight') {
    b.kick = {
      ...b.kick,
      endHz: 32,
      bodyS: 0.25,
    }
    b.snare = {
      ...b.snare,
      bodyDecayS: 0.04,
      snapHz: 2800,
      snapQ: 1.2,
      noiseDecayS: 0.12,
    }
    b.hat = { ...b.hat, decayS: 0.06, highpassHz: 9000, level: 0.45 }
    b.clap = { ...b.clap, decayS: 0.08, q: 1.2 }
    b.ride = {
      ...b.ride,
      highpassHz: 8800,
      decayS: 0.1,
      level: 0.42,
      q: 0.75,
    }
    b.crashRide = {
      ...b.crashRide,
      highpassHz: 7000,
      decayS: 0.28,
      level: 0.38,
      q: 0.7,
    }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 580,
      secondHz: 875,
      decayS: 0.08,
      level: 0.65,
      secondMix: 0.5,
    }
    b.crash1 = {
      ...b.crash1,
      bandHz: 7500,
      decayS: 0.42,
      level: 0.48,
      q: 0.85,
    }
    return b
  }
  if (id === 'room') {
    b.kick = { ...b.kick, endHz: 50, bodyS: 0.45, level: 0.88 }
    b.snare = {
      ...b.snare,
      bodyDecayS: 0.09,
      bodyLevel: 0.45,
      snapHz: 1600,
      snapQ: 0.6,
      noiseDecayS: 0.32,
    }
    b.hat = { ...b.hat, decayS: 0.18, q: 0.45, highpassHz: 5500 }
    b.clap = { ...b.clap, decayS: 0.22, bandHz: 1200, q: 0.7 }
    b.ride = {
      ...b.ride,
      highpassHz: 4800,
      decayS: 0.4,
      level: 0.46,
      q: 0.5,
    }
    b.crashRide = {
      ...b.crashRide,
      highpassHz: 4200,
      decayS: 0.7,
      level: 0.42,
      q: 0.45,
    }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 500,
      secondHz: 750,
      decayS: 0.18,
      level: 0.55,
      secondMix: 0.6,
    }
    b.crash1 = { ...b.crash1, bandHz: 4800, decayS: 0.9, level: 0.48, q: 0.6 }
    return b
  }
  if (id === '808ish') {
    b.kick = {
      ...b.kick,
      startHz: 120,
      endHz: 32,
      sweepS: 0.14,
      bodyS: 0.5,
    }
    b.snare = {
      ...b.snare,
      bodyHz: 170,
      bodyLevel: 0.5,
      snapHz: 2200,
      noiseDecayS: 0.15,
    }
    b.hat = { ...b.hat, highpassHz: 6500, decayS: 0.04, level: 0.42 }
    b.clap = { ...b.clap, bandHz: 1200, decayS: 0.1 }
    b.ride = { ...b.ride, highpassHz: 6800, decayS: 0.12, level: 0.4, q: 0.7 }
    b.crashRide = { ...b.crashRide, highpassHz: 6000, decayS: 0.35, level: 0.36, q: 0.6 }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 640,
      secondHz: 808,
      decayS: 0.1,
      level: 0.72,
      secondMix: 0.55,
    }
    b.crash1 = { ...b.crash1, bandHz: 6000, decayS: 0.4, level: 0.45, q: 0.75 }
    return b
  }
  if (id === 'rnb') {
    b.kick = {
      ...b.kick,
      startHz: 95,
      endHz: 38,
      sweepS: 0.12,
      bodyS: 0.42,
      level: 0.9,
    }
    b.snare = {
      ...b.snare,
      bodyHz: 185,
      bodyLevel: 0.42,
      bodyDecayS: 0.06,
      snapHz: 2400,
      snapQ: 1.05,
      noiseDecayS: 0.2,
      level: 0.78,
    }
    b.hat = { ...b.hat, highpassHz: 7200, q: 0.75, decayS: 0.09, level: 0.46 }
    b.clap = { ...b.clap, bandHz: 1800, q: 1.0, decayS: 0.14, level: 0.62 }
    b.ride = { ...b.ride, highpassHz: 6400, decayS: 0.25, level: 0.45, q: 0.65 }
    b.crashRide = { ...b.crashRide, highpassHz: 5200, decayS: 0.5, level: 0.4, q: 0.55 }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 520,
      secondHz: 780,
      decayS: 0.12,
      level: 0.58,
      secondMix: 0.5,
    }
    b.crash1 = { ...b.crash1, bandHz: 5800, decayS: 0.65, level: 0.45, q: 0.7 }
    return b
  }
  if (id === 'jazz') {
    b.kick = {
      ...b.kick,
      startHz: 110,
      endHz: 48,
      sweepS: 0.08,
      bodyS: 0.36,
      attackS: 0.006,
      level: 0.75,
    }
    b.snare = {
      ...b.snare,
      bodyHz: 240,
      bodyLevel: 0.32,
      bodyDecayS: 0.12,
      snapHz: 1200,
      snapQ: 0.5,
      noiseDecayS: 0.38,
      level: 0.68,
    }
    b.hat = {
      ...b.hat,
      highpassHz: 4000,
      q: 0.55,
      attackS: 0.0012,
      decayS: 0.22,
      level: 0.42,
    }
    b.clap = { ...b.clap, bandHz: 1100, q: 0.6, decayS: 0.32, level: 0.45 }
    b.ride = {
      ...b.ride,
      highpassHz: 3800,
      decayS: 0.55,
      level: 0.4,
      q: 0.45,
      attackS: 0.002,
    }
    b.crashRide = {
      ...b.crashRide,
      highpassHz: 3600,
      decayS: 0.88,
      level: 0.38,
      q: 0.4,
    }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 480,
      secondHz: 720,
      decayS: 0.2,
      level: 0.48,
      secondMix: 0.55,
    }
    b.crash1 = { ...b.crash1, bandHz: 4500, decayS: 1.0, level: 0.4, q: 0.55 }
    return b
  }
  if (id === 'rock') {
    b.kick = {
      ...b.kick,
      startHz: 180,
      endHz: 36,
      sweepS: 0.07,
      bodyS: 0.28,
      level: 0.95,
    }
    b.snare = {
      ...b.snare,
      bodyHz: 175,
      bodyLevel: 0.5,
      bodyDecayS: 0.04,
      snapHz: 3200,
      snapQ: 1.15,
      noiseDecayS: 0.15,
      level: 0.88,
    }
    b.hat = { ...b.hat, highpassHz: 8500, q: 0.85, attackS: 0.0005, decayS: 0.07, level: 0.55 }
    b.clap = { ...b.clap, bandHz: 2000, q: 0.9, attackS: 0.0007, decayS: 0.18, level: 0.78 }
    b.ride = { ...b.ride, highpassHz: 8000, decayS: 0.2, level: 0.5, q: 0.8 }
    b.crashRide = { ...b.crashRide, highpassHz: 7200, decayS: 0.4, level: 0.48, q: 0.7 }
    b.cowbell = {
      ...b.cowbell,
      baseHz: 600,
      secondHz: 900,
      decayS: 0.1,
      level: 0.75,
      secondMix: 0.48,
    }
    b.crash1 = { ...b.crash1, bandHz: 6800, decayS: 0.6, level: 0.58, q: 0.7 }
    return b
  }
  return b
}

/**
 * @param {AudioContext} ctx
 * @param {File} file
 * @returns {Promise<AudioBuffer>}
 */
export function decodeFileToBuffer(ctx, file) {
  return file
    .arrayBuffer()
    .then((ab) => ctx.decodeAudioData(ab.slice(0)))
}

/**
 * One-shot: new BufferSource + Gain per hit.
 * @param {AudioContext} ctx
 * @param {AudioNode} dest
 * @param {AudioBuffer} buffer
 * @param {number} t0
 * @param {{ level: number, rate: number }} p
 */
export function playBufferSample(ctx, dest, buffer, t0, p) {
  if (!buffer) return
  const level = Math.max(0, Math.min(1, Number(p.level) || 0.8))
  const rate = Math.max(0.25, Math.min(4, Number(p.rate) || 1))

  const g = ctx.createGain()
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.playbackRate.setValueAtTime(rate, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + 0.002)
  const dur = buffer.duration / rate
  src.connect(g)
  g.connect(dest)
  src.start(t0)
  src.stop(t0 + dur + 0.01)
}

/** Synthesis + pad index. Grid order: `DrumPadGrid` (row 1: crash|crash-ride; row 2: cowbell|ride; row 3: clap|hat; bottom: kick|snare). */
export const VOICE_ORDER = [
  'kick',
  'snare',
  'hat',
  'clap',
  'ride',
  'cowbell',
  'crashRide',
  'crash1',
]

/** @typedef {typeof VOICE_ORDER[number]} DrumVoiceKey */

/**
 * Buffers for optional file playback per voice.
 * @typedef {{ [K in DrumVoiceKey]?: AudioBuffer | null }} DrumSampleBuffers
 */

export const DRUM_PAD_COUNT = 8

/** Synth “style” kits only (all voices set to `source: 'synth'`). */
export const DRUM_STYLE_PRESETS = [
  {
    id: 'default',
    name: 'Default',
    description:
      'Balanced kit: eight pads including ride, cowbell, crash/ride wash, and crash.',
  },
  {
    id: 'tight',
    name: 'Tight / electronic',
    description:
      'Short decays, bright snap; short metallic ride stack and quick crash hit.',
  },
  {
    id: 'room',
    name: 'Bigger / room',
    description:
      'Longer decays, wider snare; washy ride/crashes, softer clap, lingering cowbell.',
  },
  {
    id: '808ish',
    name: '808-style',
    description:
      'Long low kick, tight hats, classic 808-style cowbell and compact cymbals.',
  },
  {
    id: 'rnb',
    name: 'R&B / Neo-soul',
    description:
      'Warm low end, smooth snare; soft ride stack and mellow metallic accents.',
  },
  {
    id: 'jazz',
    name: 'Jazz / brush',
    description:
      'Open washy ride and crash-ride, long crash tail, light cowbell, airy hi-hat.',
  },
  {
    id: 'rock',
    name: 'Rock / live',
    description:
      'Punchy kick/snare, bright hats, loud cowbell, cutting ride and big crash.',
  },
].map((o) => ({ ...o, kit: getStyleKit(o.id) }))
