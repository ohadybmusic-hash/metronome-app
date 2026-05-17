/**
 * One-shots: new Oscillator / BufferSource per hit (no reuse) to avoid clicks.
 * Noise buffer is cached per AudioContext; sources are always fresh.
 */

import { DEFAULT_DRUM_KIT } from './drumKitDefaults.js'
import { VOICE_ORDER, playBufferSample } from './drumSamplePlayback.js'

const noiseByCtx = new WeakMap()

function getOrCreateNoiseBuffer(ctx) {
  const existing = noiseByCtx.get(ctx)
  if (existing) return existing
  const len = Math.ceil(ctx.sampleRate * 0.6)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  noiseByCtx.set(ctx, buf)
  return buf
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function num(x, d) {
  const n = Number(x)
  return Number.isFinite(n) ? n : d
}

function makeSoftClipper(ctx, drive = 1) {
  const d = clamp(num(drive, 1), 0.5, 6)
  const ws = ctx.createWaveShaper()
  const n = 1024
  const curve = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1
    // Smooth soft clip with drive. Keeps transients, adds harmonics.
    const y = Math.tanh(x * d)
    curve[i] = y
  }
  ws.curve = curve
  ws.oversample = '4x'
  return ws
}

function connectSaturated(ctx, src, dest, drive) {
  const ws = makeSoftClipper(ctx, drive)
  src.connect(ws)
  ws.connect(dest)
}

/** @param {import('./drumKitDefaults.js').KickParams} p */
export function playKick(ctx, dest, t0, p = DEFAULT_DRUM_KIT.kick) {
  const startHz = clamp(num(p.startHz, 150), 30, 500)
  let endHz = clamp(num(p.endHz, 40), 25, 800)
  if (endHz >= startHz) endHz = Math.max(25, startHz * 0.5)
  const sweepS = clamp(num(p.sweepS, 0.1), 0.02, 0.5)
  const attackS = clamp(num(p.attackS, 0.003), 0.0005, 0.1)
  const bodyS = clamp(num(p.bodyS, 0.32), 0.05, 1.2)
  const level = clamp(num(p.level, 0.92), 0.05, 1)

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + attackS)
  g.gain.exponentialRampToValueAtTime(0.0006, t0 + bodyS)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(startHz, t0)
  osc.frequency.exponentialRampToValueAtTime(
    endHz,
    t0 + sweepS,
  )
  osc.connect(g)
  connectSaturated(ctx, g, dest, 2.2)
  osc.start(t0)
  const tStop = t0 + Math.max(0.12, bodyS) + 0.06
  osc.stop(tStop)
}

/** Sine “body” + bandpassed noise “snap” (separate new Osc + Buffer per hit). */
/** @param {import('./drumKitDefaults.js').SnareParams} p */
export function playSnare(ctx, dest, t0, p = DEFAULT_DRUM_KIT.snare) {
  const bodyHz = clamp(num(p.bodyHz, 200), 80, 500)
  const bodyLevel = clamp(num(p.bodyLevel, 0.38), 0, 1)
  const bodyDecayS = clamp(num(p.bodyDecayS, 0.055), 0.012, 0.28)
  const snapHz = clamp(num(p.snapHz, 1950), 400, 8000)
  const snapQ = clamp(num(p.snapQ, 0.9), 0.2, 4)
  const noiseAttackS = clamp(num(p.noiseAttackS, 0.0006), 0.0002, 0.05)
  const noiseDecayS = clamp(num(p.noiseDecayS, 0.2), 0.04, 0.55)
  const level = clamp(num(p.level, 0.82), 0.05, 1)

  const mix = ctx.createGain()
  mix.gain.setValueAtTime(level, t0)
  connectSaturated(ctx, mix, dest, 1.8)

  const gBody = ctx.createGain()
  gBody.gain.setValueAtTime(0, t0)
  gBody.gain.linearRampToValueAtTime(bodyLevel, t0 + 0.0012)
  gBody.gain.exponentialRampToValueAtTime(0.0004, t0 + bodyDecayS)
  const bodyOsc = ctx.createOscillator()
  bodyOsc.type = 'sine'
  bodyOsc.frequency.setValueAtTime(bodyHz, t0)
  bodyOsc.connect(gBody)
  gBody.connect(mix)
  bodyOsc.start(t0)
  bodyOsc.stop(t0 + bodyDecayS + 0.04)

  const src = ctx.createBufferSource()
  src.buffer = getOrCreateNoiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = snapHz
  bp.Q.value = snapQ
  const gN = ctx.createGain()
  gN.gain.setValueAtTime(0, t0)
  const snapPeak = 0.7
  gN.gain.linearRampToValueAtTime(snapPeak, t0 + noiseAttackS)
  gN.gain.exponentialRampToValueAtTime(0.0003, t0 + noiseDecayS)
  src.connect(bp)
  bp.connect(gN)
  gN.connect(mix)
  src.start(t0)
  src.stop(t0 + noiseDecayS + 0.1)
}

/** @param {import('./drumKitDefaults.js').HatParams} p */
export function playHiHat(ctx, dest, t0, p = DEFAULT_DRUM_KIT.hat) {
  const f = clamp(num(p.highpassHz, 7000), 2000, 15000)
  const q = clamp(num(p.q, 0.7), 0.1, 3)
  const attackS = clamp(num(p.attackS, 0.0008), 0.0002, 0.1)
  const decayS = clamp(num(p.decayS, 0.1), 0.02, 0.95)
  const level = clamp(num(p.level, 0.5), 0.05, 1)

  const src = ctx.createBufferSource()
  src.buffer = getOrCreateNoiseBuffer(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = f
  hp.Q.value = q

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + attackS)
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + decayS)

  src.connect(hp)
  hp.connect(g)
  connectSaturated(ctx, g, dest, 1.35)
  src.start(t0)
  src.stop(t0 + decayS + 0.06)
}

/**
 * Two detuned ~square waves, TR-style.
 * @param {import('./drumKitDefaults.js').CowbellParams} p
 */
export function playCowbell(ctx, dest, t0, p = DEFAULT_DRUM_KIT.cowbell) {
  const f1 = clamp(num(p.baseHz, 540), 200, 1400)
  const f2 = clamp(num(p.secondHz, 807), 300, 2200)
  const mix2 = clamp(num(p.secondMix, 0.52), 0, 1.2)
  const attackS = clamp(num(p.attackS, 0.0004), 0.0001, 0.08)
  const decayS = clamp(num(p.decayS, 0.1), 0.02, 0.5)
  const level = clamp(num(p.level, 0.7), 0.05, 1)
  const m1 = 1
  const m2 = mix2
  const norm = 1 + m2
  const w1 = m1 / norm
  const w2 = m2 / norm

  const sum = ctx.createGain()
  sum.gain.value = 1
  const g1 = ctx.createGain()
  g1.gain.setValueAtTime(w1, t0)
  const g2 = ctx.createGain()
  g2.gain.setValueAtTime(w2, t0)
  const o1 = ctx.createOscillator()
  o1.type = 'square'
  o1.frequency.setValueAtTime(f1, t0)
  const o2 = ctx.createOscillator()
  o2.type = 'square'
  o2.frequency.setValueAtTime(f2, t0)
  o1.connect(g1)
  o2.connect(g2)
  g1.connect(sum)
  g2.connect(sum)

  const out = ctx.createGain()
  out.gain.setValueAtTime(0, t0)
  out.gain.linearRampToValueAtTime(level, t0 + attackS)
  out.gain.exponentialRampToValueAtTime(0.0004, t0 + decayS)
  sum.connect(out)
  connectSaturated(ctx, out, dest, 1.45)
  o1.start(t0)
  o2.start(t0)
  o1.stop(t0 + decayS + 0.05)
  o2.stop(t0 + decayS + 0.05)
}

/**
 * Longer noise crash (bandpass) than clap; same param shape as clap.
 * @param {import('./drumKitDefaults.js').ClapParams} p
 */
export function playCrash1(ctx, dest, t0, p = DEFAULT_DRUM_KIT.crash1) {
  const f = clamp(num(p.bandHz, 6200), 400, 10000)
  const q = clamp(num(p.q, 0.65), 0.1, 4)
  const attackS = clamp(num(p.attackS, 0.0008), 0.0002, 0.1)
  const decayS = clamp(num(p.decayS, 0.75), 0.12, 1.4)
  const level = clamp(num(p.level, 0.5), 0.05, 1)

  const src = ctx.createBufferSource()
  src.buffer = getOrCreateNoiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = f
  bp.Q.value = q

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + attackS)
  g.gain.exponentialRampToValueAtTime(0.0004, t0 + decayS)

  src.connect(bp)
  bp.connect(g)
  connectSaturated(ctx, g, dest, 1.25)
  src.start(t0)
  src.stop(t0 + decayS + 0.1)
}

/** @param {import('./drumKitDefaults.js').ClapParams} p */
export function playClap(ctx, dest, t0, p = DEFAULT_DRUM_KIT.clap) {
  const f = clamp(num(p.bandHz, 1500), 200, 8000)
  const q = clamp(num(p.q, 1.1), 0.1, 4)
  const attackS = clamp(num(p.attackS, 0.001), 0.0003, 0.1)
  const decayS = clamp(num(p.decayS, 0.12), 0.04, 0.5)
  const level = clamp(num(p.level, 0.7), 0.05, 1)

  const src = ctx.createBufferSource()
  src.buffer = getOrCreateNoiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = f
  bp.Q.value = q

  const g = ctx.createGain()
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + attackS)
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + decayS)

  src.connect(bp)
  bp.connect(g)
  connectSaturated(ctx, g, dest, 1.55)
  src.start(t0)
  src.stop(t0 + decayS + 0.08)
}

/** Rim / side-stick: bright, very short click derived from snare tuning. */
/** @param {import('./drumKitDefaults.js').SnareParams} p */
export function playRimShot(ctx, dest, t0, p = DEFAULT_DRUM_KIT.snare) {
  playSnare(ctx, dest, t0, {
    ...p,
    bodyHz: clamp(num(p.bodyHz, 200) * 1.55, 220, 520),
    bodyLevel: clamp(num(p.bodyLevel, 0.38) * 0.12, 0, 0.11),
    bodyDecayS: 0.022,
    snapHz: clamp(num(p.snapHz, 1950) * 1.28, 2800, 7800),
    snapQ: clamp(num(p.snapQ, 0.9) * 1.12, 0.45, 2.85),
    noiseAttackS: 0.0001,
    noiseDecayS: clamp(num(p.noiseDecayS, 0.2) * 0.24, 0.026, 0.095),
    level: clamp(num(p.level, 0.82) * 0.9, 0.05, 0.96),
  })
}

/**
 * Melodic tom registers — sine-like “shell” from kick tuning (pitch + decay follow genre).
 * @param {'hi' | 'mid' | 'lo'} tier
 */
/** @param {import('./drumKitDefaults.js').KickParams} kickP */
export function playMelodicTom(ctx, dest, t0, kickP = DEFAULT_DRUM_KIT.kick, tier = 'mid') {
  const kMul = tier === 'hi' ? { start: 1.42, end: 1.38, sweep: 0.4, body: 0.34, lvl: 0.64 } : tier === 'mid' ? { start: 1.05, end: 1.05, sweep: 0.48, body: 0.4, lvl: 0.7 } : { start: 0.78, end: 0.84, sweep: 0.55, body: 0.46, lvl: 0.76 }
  const startHz = clamp(num(kickP.startHz, 150) * kMul.start, 70, 380)
  let endHz = clamp(num(kickP.endHz, 40) * kMul.end, 40, 220)
  if (endHz >= startHz * 0.98) endHz = Math.max(38, startHz * 0.48)
  playKick(ctx, dest, t0, {
    ...kickP,
    startHz,
    endHz,
    sweepS: clamp(num(kickP.sweepS, 0.1) * kMul.sweep, 0.025, 0.09),
    bodyS: clamp(num(kickP.bodyS, 0.32) * kMul.body, 0.055, 0.24),
    attackS: Math.min(num(kickP.attackS, 0.003), 0.0018),
    level: clamp(num(kickP.level, 0.92) * kMul.lvl, 0.08, 0.92),
  })
}

/** Shaker-like grain from hat noise (very short, layered). */
/** @param {import('./drumKitDefaults.js').HatParams} hatP */
export function playShakerLayers(ctx, dest, t0, hatP = DEFAULT_DRUM_KIT.hat) {
  const base = {
    highpassHz: clamp(num(hatP.highpassHz, 7000) * 1.08, 6500, 15000),
    q: clamp(num(hatP.q, 0.7) * 0.92, 0.12, 2.2),
    attackS: Math.min(num(hatP.attackS, 0.0008), 0.00045),
    decayS: Math.min(num(hatP.decayS, 0.1) * 0.26, 0.048),
    level: clamp(num(hatP.level, 0.5) * 0.48, 0.04, 0.75),
  }
  playHiHat(ctx, dest, t0, { ...hatP, ...base })
  playHiHat(ctx, dest, t0 + 0.013, {
    ...hatP,
    ...base,
    level: base.level * 0.7,
    highpassHz: clamp(base.highpassHz * 1.03, 2000, 15000),
  })
  playHiHat(ctx, dest, t0 + 0.027, {
    ...hatP,
    ...base,
    level: base.level * 0.44,
    decayS: base.decayS * 0.88,
  })
}

/** Short bandpassed “burst” (not a closed hat). */
/** @param {import('./drumKitDefaults.js').HatParams} hatP */
export function playWideNoiseHit(ctx, dest, t0, hatP = DEFAULT_DRUM_KIT.hat) {
  const src = ctx.createBufferSource()
  src.buffer = getOrCreateNoiseBuffer(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = clamp(num(hatP.highpassHz, 7000) * 0.42, 1100, 5200)
  bp.Q.value = 0.42
  const g = ctx.createGain()
  const decayS = clamp(num(hatP.decayS, 0.1) * 0.38, 0.028, 0.11)
  const level = clamp(num(hatP.level, 0.5) * 0.78, 0.05, 0.95)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(level, t0 + 0.0007)
  g.gain.exponentialRampToValueAtTime(0.00045, t0 + decayS)
  src.connect(bp)
  bp.connect(g)
  g.connect(dest)
  src.start(t0)
  src.stop(t0 + decayS + 0.06)
}

/** Short chord-stab from clap band (brighter, tighter). */
/** @param {import('./drumKitDefaults.js').ClapParams} clapP */
export function playStabHit(ctx, dest, t0, clapP = DEFAULT_DRUM_KIT.clap) {
  playClap(ctx, dest, t0, {
    ...clapP,
    bandHz: clamp(num(clapP.bandHz, 1500) * 1.45, 900, 6200),
    q: clamp(num(clapP.q, 1.1) * 1.05, 0.35, 4),
    attackS: Math.min(num(clapP.attackS, 0.001), 0.00055),
    decayS: clamp(num(clapP.decayS, 0.12) * 0.42, 0.04, 0.22),
    level: clamp(num(clapP.level, 0.7) * 0.96, 0.05, 1),
  })
}

/** Pedal / foot chick — tiny hi-hat closure from hat voice. */
/** @param {import('./drumKitDefaults.js').HatParams} hatP */
export function playHatChick(ctx, dest, t0, hatP = DEFAULT_DRUM_KIT.hat) {
  playHiHat(ctx, dest, t0, {
    ...hatP,
    attackS: 0.0001,
    decayS: Math.min(0.032, num(hatP.decayS, 0.1) * 0.2),
    highpassHz: clamp(num(hatP.highpassHz, 7000) * 1.02, 5000, 15000),
    level: clamp(num(hatP.level, 0.5) * 0.52, 0.04, 0.8),
  })
}

/** Short metallic click from cowbell tuning. */
/** @param {import('./drumKitDefaults.js').CowbellParams} cbP */
export function playPercCowClick(ctx, dest, t0, cbP = DEFAULT_DRUM_KIT.cowbell) {
  playCowbell(ctx, dest, t0, {
    ...cbP,
    decayS: Math.min(0.065, num(cbP.decayS, 0.1) * 0.42),
    attackS: Math.min(num(cbP.attackS, 0.0004), 0.0002),
    level: clamp(num(cbP.level, 0.7) * 0.68, 0.06, 0.88),
    secondMix: num(cbP.secondMix, 0.52) * 0.85,
  })
}

/** Longer wash for “FX” pad — crash‑ride timbre, emphasised tail. */
/** @param {import('./drumKitDefaults.js').HatParams} rideish */
export function playFxWashPad(ctx, dest, t0, rideish = DEFAULT_DRUM_KIT.crashRide) {
  playHiHat(ctx, dest, t0, {
    ...rideish,
    decayS: clamp(num(rideish.decayS, 0.55) * 1.18, 0.2, 1.05),
    highpassHz: clamp(num(rideish.highpassHz, 4800) * 0.92, 2000, 14000),
    level: clamp(num(rideish.level, 0.44) * 1.08, 0.05, 1),
    q: clamp(num(rideish.q, 0.5) * 0.92, 0.1, 3),
  })
}

function drumHapticKick() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([48, 30, 52])
    }
  } catch {
    /* */
  }
}
function drumHapticSnare() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([24, 10, 20, 10, 24])
    }
  } catch {
    /* */
  }
}
function drumHapticHat() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(5)
    }
  } catch {
    /* */
  }
}
function drumHapticClap() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([16, 6, 14])
    }
  } catch {
    /* */
  }
}
function drumHapticRide() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(4)
    }
  } catch {
    /* */
  }
}
function drumHapticCowbell() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 5, 18])
    }
  } catch {
    /* */
  }
}
function drumHapticWash() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([6, 4, 8])
    }
  } catch {
    /* */
  }
}
function drumHapticCrash1() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([10, 5, 12, 5, 10])
    }
  } catch {
    /* */
  }
}

const haptics = [
  drumHapticKick,
  drumHapticSnare,
  drumHapticHat,
  drumHapticClap,
  drumHapticRide,
  drumHapticCowbell,
  drumHapticWash,
  drumHapticCrash1,
]

/**
 * @param {import('./drumKitDefaults.js').DrumKit} kit
 * @param {null | { [k: string]: AudioBuffer | null | undefined }} [sampleBuffers]
 */
export function playDrumPad(ctx, dest, padIndex, t0, kit, sampleBuffers) {
  const i = Math.max(0, Math.min(VOICE_ORDER.length - 1, Math.floor(padIndex)))
  haptics[i]?.()
  const k = kit && kit.kick ? kit : DEFAULT_DRUM_KIT
  const key = VOICE_ORDER[i]
  const voice = k[key]
  const buf = sampleBuffers?.[key] ?? null
  if (voice && voice.source === 'sample' && buf) {
    playBufferSample(ctx, dest, buf, t0, {
      level: num(voice.level, 0.8),
      rate: num(voice.sampleRate, 1),
      decayS: num(voice.sampleDecayS, 0.35),
    })
    return
  }
  if (voice && voice.source === 'sample' && !buf) {
    /* no buffer on disk yet — keep going with synth so something plays */
  }
  switch (key) {
    case 'kick':
      playKick(ctx, dest, t0, k.kick)
      return
    case 'snare':
      playSnare(ctx, dest, t0, k.snare)
      return
    case 'hat':
      playHiHat(ctx, dest, t0, k.hat)
      return
    case 'clap':
      playClap(ctx, dest, t0, k.clap)
      return
    case 'ride':
      playHiHat(ctx, dest, t0, k.ride)
      return
    case 'cowbell':
      playCowbell(ctx, dest, t0, k.cowbell)
      return
    case 'crashRide':
      playHiHat(ctx, dest, t0, k.crashRide)
      return
    case 'crash1':
      playCrash1(ctx, dest, t0, k.crash1)
  }
}
