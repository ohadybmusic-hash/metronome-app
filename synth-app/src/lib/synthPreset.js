import { createInitialDrumKit } from './drumKitDefaults.js'
import { isValidSamplePackId } from './instrumentSamples.js'
import {
  DEFAULT_FX,
  PART_COUNT,
  createInitialPart,
} from './synthDefaults.js'

export const PRESET_DATA_VERSION = 1

const STORAGE_KEY = 'synth-app:presets-v1'

function num(x, fallback) {
  const n = Number(x)
  return Number.isFinite(n) ? n : fallback
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

function mergeAdsr(raw, dAdsr) {
  if (!raw || typeof raw !== 'object') return { ...dAdsr }
  return {
    ...dAdsr,
    attack: num(raw.attack, dAdsr.attack),
    decay: num(raw.decay, dAdsr.decay),
    sustain: clamp01(num(raw.sustain, dAdsr.sustain)),
    release: num(raw.release, dAdsr.release),
  }
}

function mergeOscLayer(raw, base) {
  if (!raw || typeof raw !== 'object') return { ...base }
  const o = { ...base, ...raw }
  o.adsr = mergeAdsr(raw.adsr, base.adsr)
  o.detune = num(raw.detune, base.detune)
  o.waveform = typeof raw.waveform === 'string' ? raw.waveform : base.waveform
  if (typeof base.enabled === 'boolean') {
    o.enabled = typeof raw.enabled === 'boolean' ? raw.enabled : base.enabled
  }
  return o
}

function mergePart(raw) {
  const base = createInitialPart()
  if (!raw || typeof raw !== 'object') return base
  const isSample =
    raw.instrumentSource === 'sample' &&
    isValidSamplePackId(raw.samplePack)
  return {
    osc1: mergeOscLayer(raw.osc1, base.osc1),
    osc2: mergeOscLayer(raw.osc2, base.osc2),
    osc3: mergeOscLayer(raw.osc3, base.osc3),
    instrumentSource: isSample ? 'sample' : 'synth',
    samplePack: isSample ? raw.samplePack : null,
  }
}

function mergeDrumKit(raw) {
  const b = createInitialDrumKit()
  if (!raw || typeof raw !== 'object') return b
  const k = raw.kick && typeof raw.kick === 'object' ? raw.kick : {}
  const s = raw.snare && typeof raw.snare === 'object' ? raw.snare : {}
  const h = raw.hat && typeof raw.hat === 'object' ? raw.hat : {}
  const c = raw.clap && typeof raw.clap === 'object' ? raw.clap : {}
  const r = raw.ride && typeof raw.ride === 'object' ? raw.ride : {}
  const cr = raw.crashRide && typeof raw.crashRide === 'object' ? raw.crashRide : {}
  const cb = raw.cowbell && typeof raw.cowbell === 'object' ? raw.cowbell : {}
  const x1 = raw.crash1 && typeof raw.crash1 === 'object' ? raw.crash1 : {}
  const src = (o, base) => (o && o.source === 'sample' ? 'sample' : o && o.source === 'synth' ? 'synth' : base.source)
  return {
    kick: {
      ...b.kick,
      ...k,
      source: src(k, b.kick),
      sampleName: typeof k.sampleName === 'string' ? k.sampleName : b.kick.sampleName,
      sampleRate: num(k.sampleRate, b.kick.sampleRate),
      startHz: num(k.startHz, b.kick.startHz),
      endHz: num(k.endHz, b.kick.endHz),
      sweepS: num(k.sweepS, b.kick.sweepS),
      attackS: num(k.attackS, b.kick.attackS),
      bodyS: num(k.bodyS, b.kick.bodyS),
      level: num(k.level, b.kick.level),
      sendFx: typeof k.sendFx === 'boolean' ? k.sendFx : b.kick.sendFx,
    },
    snare: {
      ...b.snare,
      ...s,
      source: src(s, b.snare),
      sampleName: typeof s.sampleName === 'string' ? s.sampleName : b.snare.sampleName,
      sampleRate: num(s.sampleRate, b.snare.sampleRate),
      bodyHz: num(s.bodyHz, b.snare.bodyHz),
      bodyLevel: num(s.bodyLevel, b.snare.bodyLevel),
      bodyDecayS: num(s.bodyDecayS, b.snare.bodyDecayS),
      snapHz: num(s.snapHz, num(s.bandHz, b.snare.snapHz)),
      snapQ: num(s.snapQ, num(s.q, b.snare.snapQ)),
      noiseAttackS: num(s.noiseAttackS, num(s.attackS, b.snare.noiseAttackS)),
      noiseDecayS: num(s.noiseDecayS, num(s.decayS, b.snare.noiseDecayS)),
      level: num(s.level, b.snare.level),
      sendFx: typeof s.sendFx === 'boolean' ? s.sendFx : b.snare.sendFx,
    },
    hat: {
      ...b.hat,
      ...h,
      source: src(h, b.hat),
      sampleName: typeof h.sampleName === 'string' ? h.sampleName : b.hat.sampleName,
      sampleRate: num(h.sampleRate, b.hat.sampleRate),
      highpassHz: num(h.highpassHz, b.hat.highpassHz),
      q: num(h.q, b.hat.q),
      attackS: num(h.attackS, b.hat.attackS),
      decayS: num(h.decayS, b.hat.decayS),
      level: num(h.level, b.hat.level),
      sendFx: typeof h.sendFx === 'boolean' ? h.sendFx : b.hat.sendFx,
    },
    clap: {
      ...b.clap,
      ...c,
      source: src(c, b.clap),
      sampleName: typeof c.sampleName === 'string' ? c.sampleName : b.clap.sampleName,
      sampleRate: num(c.sampleRate, b.clap.sampleRate),
      bandHz: num(c.bandHz, b.clap.bandHz),
      q: num(c.q, b.clap.q),
      attackS: num(c.attackS, b.clap.attackS),
      decayS: num(c.decayS, b.clap.decayS),
      level: num(c.level, b.clap.level),
      sendFx: typeof c.sendFx === 'boolean' ? c.sendFx : b.clap.sendFx,
    },
    ride: {
      ...b.ride,
      ...r,
      source: src(r, b.ride),
      sampleName: typeof r.sampleName === 'string' ? r.sampleName : b.ride.sampleName,
      sampleRate: num(r.sampleRate, b.ride.sampleRate),
      highpassHz: num(r.highpassHz, b.ride.highpassHz),
      q: num(r.q, b.ride.q),
      attackS: num(r.attackS, b.ride.attackS),
      decayS: num(r.decayS, b.ride.decayS),
      level: num(r.level, b.ride.level),
      sendFx: typeof r.sendFx === 'boolean' ? r.sendFx : b.ride.sendFx,
    },
    crashRide: {
      ...b.crashRide,
      ...cr,
      source: src(cr, b.crashRide),
      sampleName: typeof cr.sampleName === 'string' ? cr.sampleName : b.crashRide.sampleName,
      sampleRate: num(cr.sampleRate, b.crashRide.sampleRate),
      highpassHz: num(cr.highpassHz, b.crashRide.highpassHz),
      q: num(cr.q, b.crashRide.q),
      attackS: num(cr.attackS, b.crashRide.attackS),
      decayS: num(cr.decayS, b.crashRide.decayS),
      level: num(cr.level, b.crashRide.level),
      sendFx: typeof cr.sendFx === 'boolean' ? cr.sendFx : b.crashRide.sendFx,
    },
    cowbell: {
      ...b.cowbell,
      ...cb,
      source: src(cb, b.cowbell),
      sampleName: typeof cb.sampleName === 'string' ? cb.sampleName : b.cowbell.sampleName,
      sampleRate: num(cb.sampleRate, b.cowbell.sampleRate),
      baseHz: num(cb.baseHz, b.cowbell.baseHz),
      secondHz: num(cb.secondHz, b.cowbell.secondHz),
      secondMix: num(cb.secondMix, b.cowbell.secondMix),
      attackS: num(cb.attackS, b.cowbell.attackS),
      decayS: num(cb.decayS, b.cowbell.decayS),
      level: num(cb.level, b.cowbell.level),
      sendFx: typeof cb.sendFx === 'boolean' ? cb.sendFx : b.cowbell.sendFx,
    },
    crash1: {
      ...b.crash1,
      ...x1,
      source: src(x1, b.crash1),
      sampleName: typeof x1.sampleName === 'string' ? x1.sampleName : b.crash1.sampleName,
      sampleRate: num(x1.sampleRate, b.crash1.sampleRate),
      bandHz: num(x1.bandHz, b.crash1.bandHz),
      q: num(x1.q, b.crash1.q),
      attackS: num(x1.attackS, b.crash1.attackS),
      decayS: num(x1.decayS, b.crash1.decayS),
      level: num(x1.level, b.crash1.level),
      sendFx: typeof x1.sendFx === 'boolean' ? x1.sendFx : b.crash1.sendFx,
    },
  }
}

export function normalizePresetData(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Preset must be a JSON object')
  }
  const partsIn = Array.isArray(raw.parts) ? raw.parts : []
  const parts = []
  for (let i = 0; i < PART_COUNT; i++) {
    parts.push(mergePart(partsIn[i]))
  }
  const fx = { ...DEFAULT_FX, ...(raw.fx && typeof raw.fx === 'object' ? raw.fx : {}) }
  if (!Number.isFinite(fx.reverbLength) && Number.isFinite(fx.reverbDecay)) {
    fx.reverbLength = fx.reverbDecay
  }
  if (!Number.isFinite(fx.reverbDamping)) {
    fx.reverbDamping = 0.5
  }
  if (!Number.isFinite(fx.reverbDiffusion)) {
    fx.reverbDiffusion = 0.5
  }
  const filterNorm = clamp01(num(raw.filterNorm, 0.5))
  let ap = Math.floor(num(raw.activePartIndex, 0))
  if (!Number.isFinite(ap)) ap = 0
  ap = Math.max(0, Math.min(PART_COUNT - 1, ap))
  const drumKit = mergeDrumKit(raw.drumKit)

  return {
    v: PRESET_DATA_VERSION,
    parts,
    fx,
    filterNorm,
    activePartIndex: ap,
    drumKit,
  }
}

export function buildSnapshot({ parts, fx, filterNorm, activePartIndex, drumKit }) {
  return {
    v: PRESET_DATA_VERSION,
    parts: JSON.parse(JSON.stringify(parts)),
    fx: { ...fx },
    filterNorm: clamp01(filterNorm),
    activePartIndex: Math.max(
      0,
      Math.min(PART_COUNT - 1, Math.floor(activePartIndex) || 0),
    ),
    drumKit: JSON.parse(
      JSON.stringify(
        drumKit && typeof drumKit === 'object' ? drumKit : createInitialDrumKit(),
      ),
    ),
  }
}

// --- localStorage user presets: { id, name, savedAt, data }[]

export function loadUserPresets() {
  if (typeof localStorage === 'undefined') return []
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (!s) return []
    const a = JSON.parse(s)
    if (!Array.isArray(a)) return []
    return a.filter(
      (x) =>
        x &&
        typeof x === 'object' &&
        typeof x.id === 'string' &&
        typeof x.name === 'string' &&
        x.data,
    )
  } catch {
    return []
  }
}

export function writeUserPresets(list) {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function newPresetId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Accepts a full snapshot file or a row from local storage `{ data }`. */
export function parseImportedPresetObject(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid file')
  }
  if (
    Array.isArray(parsed.parts) &&
    parsed.fx &&
    typeof parsed.fx === 'object'
  ) {
    return parsed
  }
  if (
    parsed.data &&
    Array.isArray(parsed.data.parts) &&
    parsed.data.fx &&
    typeof parsed.data.fx === 'object'
  ) {
    return parsed.data
  }
  throw new Error('Unrecognized preset format')
}
