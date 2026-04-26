import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { feedbackFromFx, getDelayTimeSeconds } from '../lib/fxMath.js'
import { createParallelFx } from '../lib/parallelFx.js'
import { applyWaveformToOsc } from '../lib/periodicWaves.js'
import {
  createEmptyDrumSampleBuffers,
  createInitialDrumKit,
} from '../lib/drumKitDefaults.js'
import {
  DRUM_PAD_COUNT,
  DRUM_STYLE_PRESETS,
  VOICE_ORDER,
  decodeFileToBuffer,
} from '../lib/drumSamplePlayback.js'
import {
  DEFAULT_FX_SYNTH,
  PART_COUNT,
  createInitialPart,
} from '../lib/synthDefaults.js'
import { getEffectiveReverbTuning } from '../lib/reverbTuning.js'
import { playDrumPad } from '../lib/drumSynthesis.js'
import {
  ensureInstrumentPack,
  getLoadedZones,
  isValidSamplePackId,
  pickZoneForMidi,
  applySampleKeyDown,
  rootPlaybackRate,
} from '../lib/instrumentSamples.js'
import {
  PRESET_DATA_VERSION,
  buildSnapshot,
  normalizePresetData,
} from '../lib/synthPreset.js'

const PUBLIC_BASE = import.meta.env.BASE_URL

export {
  DEFAULT_ADSR,
  DEFAULT_FX,
  DEFAULT_FX_DRUM,
  DEFAULT_FX_SYNTH,
  PART_COUNT,
  createInitialPart,
} from '../lib/synthDefaults.js'
export {
  createEmptyDrumSampleBuffers,
  createInitialDrumKit,
  DEFAULT_DRUM_KIT,
} from '../lib/drumKitDefaults.js'

export const FILTER_MIN_HZ = 80
export const FILTER_MAX_HZ = 18000

export function mtof(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function normToCutoff(n) {
  const t = Math.max(0, Math.min(1, n))
  return FILTER_MIN_HZ * (FILTER_MAX_HZ / FILTER_MIN_HZ) ** t
}

export function cutoffToNorm(hz) {
  return (Math.log(hz) - Math.log(FILTER_MIN_HZ)) /
    (Math.log(FILTER_MAX_HZ) - Math.log(FILTER_MIN_HZ))
}

let activeNoteCount = 0

function setupMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Synth Active',
      artist: 'Mobile Synth',
      album: 'Synthesizer',
    })
  } catch {
    /* */
  }
  const noop = () => {}
  try {
    navigator.mediaSession.setActionHandler('play', noop)
    navigator.mediaSession.setActionHandler('pause', noop)
  } catch {
    /* */
  }
}

function setPlaybackStateFromCount() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.playbackState =
      activeNoteCount > 0 ? 'playing' : 'paused'
  } catch {
    /* */
  }
}

function hapticTick() {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(8)
  } catch {
    /* */
  }
}

function applyAttackDecay(env, ad, t0) {
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(1, t0 + ad.attack)
  env.gain.linearRampToValueAtTime(
    Math.max(0.0001, ad.sustain),
    t0 + ad.attack + ad.decay,
  )
}

function startReleaseLayer(layer, t) {
  const r = Math.max(0.02, layer.release)
  layer.env.gain.cancelScheduledValues(t)
  try {
    const g = layer.env.gain.value
    layer.env.gain.setValueAtTime(g, t)
  } catch {
    layer.env.gain.setValueAtTime(0.001, t)
  }
  layer.env.gain.exponentialRampToValueAtTime(0.0001, t + r)
  const stopAt = t + r + 0.12
  if (layer.osc) {
    try {
      layer.osc.stop(stopAt)
    } catch {
      /* */
    }
  }
  if (layer.source) {
    try {
      layer.source.stop(stopAt)
    } catch {
      /* */
    }
  }
}

const MAX_POLY = 32

function applyParFx(bridge, s, lastReverbKey) {
  bridge.setDelayMode(s.delayType)
  if (s.reverbType === 'off') {
    lastReverbKey.current = 'off'
  } else {
    const t = getEffectiveReverbTuning(s)
    const uLen =
      s.reverbLength != null && Number.isFinite(s.reverbLength)
        ? s.reverbLength
        : s.reverbDecay != null && Number.isFinite(s.reverbDecay)
          ? s.reverbDecay
          : 1
    const uDmp =
      s.reverbDamping != null && Number.isFinite(s.reverbDamping)
        ? s.reverbDamping
        : 0.5
    const uDiff =
      s.reverbDiffusion != null && Number.isFinite(s.reverbDiffusion)
        ? s.reverbDiffusion
        : 0.5
    const key = `${s.reverbType}|${uLen.toFixed(2)}|${uDmp.toFixed(2)}|${t.reverbSize}|${uDiff.toFixed(2)}`
    if (key !== lastReverbKey.current) {
      bridge.setReverbBuffer(s.reverbType, {
        length: t.length,
        damping: t.damping,
        diffusion: t.diffusion,
        reverbSize: t.reverbSize,
      })
      lastReverbKey.current = key
    }
  }
  bridge.setReverbPreDelayMs(s.reverbPreDelayMs ?? 0)
  const dM = s.delayType === 'off' ? 0 : s.delayMix * 0.5
  const rM = s.reverbType === 'off' ? 0 : s.reverbMix * 0.48
  /* Each effect’s mix only alters the dry when that effect is on (no double-count). */
  const dry = Math.max(0.12, (1 - dM * 0.95) * (1 - rM * 0.9))
  bridge.setDry(dry)
  bridge.setDelayWet(dM)
  bridge.setReverbWet(rM)
  const t = getDelayTimeSeconds(s)
  const fb = feedbackFromFx(s)
  bridge.setDelayTimeAndFeedback(t, fb)
}

export function useSynth() {
  const ctxRef = useRef(null)
  const filterRef = useRef(null)
  const masterRef = useRef(null)
  const analyserRef = useRef(null)
  const parFxRef = useRef(null)
  const drumToFxRef = useRef(null)
  const drumToDryRef = useRef(null)
  const lastReverbKey = useRef(null)
  const initialFilterNorm = cutoffToNorm(5000)
  const filterNormRef = useRef(initialFilterNorm)
  const voicesRef = useRef(new Map())
  const partsRef = useRef(
    Array.from({ length: PART_COUNT }, () => createInitialPart()),
  )
  const activePartIndexRef = useRef(0)
  const voiceIdRef = useRef(0)

  const [ready, setReady] = useState(false)
  const [filterNorm, setFilterNorm] = useState(initialFilterNorm)
  const [fx, setFx] = useState({ ...DEFAULT_FX_SYNTH })
  const [parts, setParts] = useState(() =>
    Array.from({ length: PART_COUNT }, () => createInitialPart()),
  )
  const [activePartIndex, setActivePartIndex] = useState(0)
  const [activeFactoryPresetId, setActiveFactoryPresetId] = useState(
    /** @type {string | null} */ (null),
  )
  const [drumKit, setDrumKit] = useState(() => createInitialDrumKit())
  const [activeDrumIndex, setActiveDrumIndex] = useState(0)
  const [drumSampleBuffers, setDrumSampleBuffers] = useState(
    createEmptyDrumSampleBuffers,
  )
  const drumKitRef = useRef(drumKit)
  const drumSampleBuffersRef = useRef(drumSampleBuffers)
  const instrumentPackCacheRef = useRef(
    new Map(), // string pack id -> { zones, loading }
  )
  const fxStateRef = useRef({ ...DEFAULT_FX_SYNTH })
  useLayoutEffect(() => {
    fxStateRef.current = fx
  }, [fx])
  useLayoutEffect(() => {
    partsRef.current = parts
  }, [parts])
  useLayoutEffect(() => {
    activePartIndexRef.current = activePartIndex
  }, [activePartIndex])
  useLayoutEffect(() => {
    drumKitRef.current = drumKit
  }, [drumKit])
  useLayoutEffect(() => {
    drumSampleBuffersRef.current = drumSampleBuffers
  }, [drumSampleBuffers])

  const setOsc1 = useCallback((update) => {
    setParts((prev) => {
      const i = activePartIndexRef.current
      const p = prev[i]
      const osc1 = typeof update === 'function' ? update(p.osc1) : update
      const next = [...prev]
      next[i] = { ...p, osc1 }
      return next
    })
  }, [])

  const setOsc2 = useCallback((update) => {
    setParts((prev) => {
      const i = activePartIndexRef.current
      const p = prev[i]
      const osc2 = typeof update === 'function' ? update(p.osc2) : update
      const next = [...prev]
      next[i] = { ...p, osc2 }
      return next
    })
  }, [])

  const setOsc3 = useCallback((update) => {
    setParts((prev) => {
      const i = activePartIndexRef.current
      const p = prev[i]
      const osc3 = typeof update === 'function' ? update(p.osc3) : update
      const next = [...prev]
      next[i] = { ...p, osc3 }
      return next
    })
  }, [])

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const ctx = new AudioContext()
    const biquad = ctx.createBiquadFilter()
    biquad.type = 'lowpass'
    biquad.Q.value = 0.7
    biquad.frequency.value = normToCutoff(filterNormRef.current)
    const master = ctx.createGain()
    master.gain.value = 0.32
    const drumToFx = ctx.createGain()
    drumToFx.gain.value = 0.52
    const drumToDry = ctx.createGain()
    drumToDry.gain.value = 0.52
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.65
    const par = createParallelFx(ctx)
    /* One summed input into the FX bus (parallel dry + delay + reverb). */
    const fxInput = ctx.createGain()
    fxInput.gain.value = 1
    biquad.connect(fxInput)
    drumToFx.connect(fxInput)
    drumToDry.connect(master)
    fxInput.connect(par.in)
    par.out.connect(master)
    master.connect(analyser)
    analyser.connect(ctx.destination)
    drumToFxRef.current = drumToFx
    drumToDryRef.current = drumToDry
    parFxRef.current = par
    applyParFx(par, fxStateRef.current, lastReverbKey)
    filterRef.current = biquad
    masterRef.current = master
    analyserRef.current = analyser
    ctxRef.current = ctx
    for (const p of partsRef.current) {
      if (
        p.instrumentSource === 'sample' &&
        isValidSamplePackId(p.samplePack)
      ) {
        void ensureInstrumentPack(
          ctx,
          PUBLIC_BASE,
          instrumentPackCacheRef.current,
          p.samplePack,
        )
      }
    }
    return ctx
  }, [])

  useLayoutEffect(() => {
    const p = parFxRef.current
    if (!p) return
    applyParFx(p, fx, lastReverbKey)
  }, [fx])

  useLayoutEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const seen = new Set()
    for (const p of parts) {
      if (
        p.instrumentSource === 'sample' &&
        isValidSamplePackId(p.samplePack) &&
        !seen.has(p.samplePack)
      ) {
        seen.add(p.samplePack)
        void ensureInstrumentPack(
          ctx,
          PUBLIC_BASE,
          instrumentPackCacheRef.current,
          p.samplePack,
        )
      }
    }
  }, [parts])

  const initAudio = useCallback(async () => {
    ensureContext()
    setupMediaSession()
    const c = ctxRef.current
    if (c && c.state === 'suspended') await c.resume()
    setReady(true)
  }, [ensureContext])

  const setFilterFromNorm = useCallback((n) => {
    const t = Math.max(0, Math.min(1, n))
    filterNormRef.current = t
    setFilterNorm(t)
    const f = filterRef.current
    const c = ctxRef.current
    if (f && c) {
      f.frequency.setTargetAtTime(normToCutoff(t), c.currentTime, 0.02)
    }
  }, [])

  const releaseVoiceKey = useCallback((k) => {
    const v = voicesRef.current.get(k)
    if (!v) return
    const ctx = ctxRef.current
    if (ctx) {
      const t = ctx.currentTime
      for (const layer of v.layers) {
        startReleaseLayer(layer, t)
      }
    }
    voicesRef.current.delete(k)
    activeNoteCount = Math.max(0, activeNoteCount - 1)
    setPlaybackStateFromCount()
  }, [])

  const noteOn = useCallback(
    (midi, voiceKey) => {
      hapticTick()
      ensureContext()
      const filter = filterRef.current
      if (!filter) return
      const ctx = ctxRef.current
      if (!ctx) return

      const key =
        voiceKey != null && String(voiceKey) !== ''
          ? String(voiceKey)
          : `v${++voiceIdRef.current}`

      if (voicesRef.current.has(key)) {
        releaseVoiceKey(key)
      }

      while (voicesRef.current.size >= MAX_POLY) {
        const oldest = voicesRef.current.keys().next().value
        if (oldest === undefined) break
        releaseVoiceKey(oldest)
      }

      if (ctx.state === 'suspended') void ctx.resume()
      if (!('mediaSession' in navigator) || !navigator.mediaSession.metadata) {
        setupMediaSession()
      }

      const part = partsRef.current[activePartIndexRef.current]
      const { osc1, osc2, osc3 } = part
      const t0 = ctx.currentTime
      const layers = []
      if (
        part.instrumentSource === 'sample' &&
        isValidSamplePackId(part.samplePack)
      ) {
        const zones = getLoadedZones(
          instrumentPackCacheRef.current,
          part.samplePack,
        )
        const z = zones && pickZoneForMidi(midi, zones)
        if (z) {
          const ad = osc1.adsr
          const env = ctx.createGain()
          applySampleKeyDown(env, ad, t0)
          env.connect(filter)
          const src = ctx.createBufferSource()
          src.buffer = z.buffer
          src.playbackRate.setValueAtTime(
            rootPlaybackRate(midi, z.rootMidi),
            t0,
          )
          src.connect(env)
          src.start(t0)
          layers.push({ source: src, env, release: ad.release })
          activeNoteCount += 1
          setPlaybackStateFromCount()
          voicesRef.current.set(key, { layers, midi })
          return
        }
      }

      const count = 1 + (osc2.enabled ? 1 : 0) + (osc3.enabled ? 1 : 0)
      const w = 1 / count
      const stack = [
        { cfg: osc1, active: true },
        { cfg: osc2, active: osc2.enabled },
        { cfg: osc3, active: osc3.enabled },
      ]
      for (const { cfg, active } of stack) {
        if (!active) continue
        const ad = cfg.adsr
        const env = ctx.createGain()
        applyAttackDecay(env, ad, t0)
        env.connect(filter)
        const o = ctx.createOscillator()
        applyWaveformToOsc(ctx, o, cfg.waveform)
        o.frequency.setValueAtTime(mtof(midi), t0)
        o.detune.setValueAtTime(cfg.detune, t0)
        const trim = ctx.createGain()
        trim.gain.setValueAtTime(w, t0)
        o.connect(trim)
        trim.connect(env)
        o.start(t0)
        layers.push({ osc: o, env, release: ad.release })
      }
      if (layers.length === 0) {
        return
      }
      activeNoteCount += 1
      setPlaybackStateFromCount()
      voicesRef.current.set(key, { layers, midi })
    },
    [ensureContext, releaseVoiceKey],
  )

  const noteOff = useCallback(
    (voiceKey) => {
      releaseVoiceKey(String(voiceKey))
    },
    [releaseVoiceKey],
  )

  const resetAllParts = useCallback(() => {
    setActiveFactoryPresetId(null)
    setParts(Array.from({ length: PART_COUNT }, () => createInitialPart()))
  }, [])

  const resetDrumKit = useCallback(() => {
    setDrumKit(createInitialDrumKit())
    setDrumSampleBuffers(createEmptyDrumSampleBuffers())
  }, [])

  const setDrumSample = useCallback(
    async (voice, file) => {
      if (!file) return
      const ctx = ensureContext()
      if (ctx.state === 'suspended') void ctx.resume()
      const b = await decodeFileToBuffer(ctx, file)
      setDrumSampleBuffers((prev) => ({ ...prev, [voice]: b }))
      setDrumKit((k) => ({
        ...k,
        [voice]: {
          ...k[voice],
          source: 'sample',
          sampleName: file.name,
        },
      }))
    },
    [ensureContext],
  )

  const clearDrumSample = useCallback((voice) => {
    setDrumSampleBuffers((prev) => ({ ...prev, [voice]: null }))
    setDrumKit((k) => ({
      ...k,
      [voice]: { ...k[voice], source: 'synth', sampleName: '' },
    }))
  }, [])

  const applyDrumStyle = useCallback((id) => {
    const p = DRUM_STYLE_PRESETS.find((x) => x.id === id)
    if (!p) return
    setDrumKit(JSON.parse(JSON.stringify(p.kit)))
    setDrumSampleBuffers(createEmptyDrumSampleBuffers())
  }, [])

  const getPresetSnapshot = useCallback(() => {
    return buildSnapshot({
      parts,
      fx,
      filterNorm,
      activePartIndex,
      drumKit,
    })
  }, [parts, fx, filterNorm, activePartIndex, drumKit])

  const applyPresetSnapshot = useCallback(
    (raw) => {
      setActiveFactoryPresetId(null)
      const n = normalizePresetData(raw)
      setParts(n.parts)
      setFx(n.fx)
      setFilterFromNorm(n.filterNorm)
      setActivePartIndex(n.activePartIndex)
      setDrumKit(n.drumKit)
      setDrumSampleBuffers(createEmptyDrumSampleBuffers())
    },
    [setFilterFromNorm],
  )

  const applyFactorySynthPreset = useCallback(
    (patch, factoryPresetId) => {
      const n = normalizePresetData({
        v: PRESET_DATA_VERSION,
        parts: patch.parts,
        fx: { ...DEFAULT_FX_SYNTH, ...patch.fx },
        filterNorm: typeof patch.filterNorm === 'number' ? patch.filterNorm : 0.5,
        activePartIndex: 0,
        drumKit: drumKitRef.current,
      })
      setParts(n.parts)
      setFx(n.fx)
      setFilterFromNorm(n.filterNorm)
      setActivePartIndex(0)
      if (typeof factoryPresetId === 'string') {
        setActiveFactoryPresetId(factoryPresetId)
      }
    },
    [setFilterFromNorm],
  )

  const triggerDrum = useCallback(
    (padIndex) => {
      ensureContext()
      const ctx = ctxRef.current
      const toFxN = drumToFxRef.current
      const toDryN = drumToDryRef.current
      if (!ctx || !toFxN || !toDryN) return
      if (!('mediaSession' in navigator) || !navigator.mediaSession.metadata) {
        setupMediaSession()
      }
      const i = Math.max(0, Math.min(DRUM_PAD_COUNT - 1, Math.floor(padIndex)))
      const key = VOICE_ORDER[i]
      const vox = drumKitRef.current?.[key]
      const useFx = vox == null || vox.sendFx !== false
      const dest = useFx ? toFxN : toDryN
      playDrumPad(
        ctx,
        dest,
        i,
        ctx.currentTime,
        drumKitRef.current,
        drumSampleBuffersRef.current,
      )
    },
    [ensureContext],
  )

  const p = parts[activePartIndex]

  return {
    initAudio,
    ready,
    analyser: analyserRef,
    filterNorm,
    setFilterFromNorm,
    fx,
    setFx,
    partCount: PART_COUNT,
    activePartIndex,
    setActivePartIndex,
    resetAllParts,
    osc1: p.osc1,
    osc2: p.osc2,
    osc3: p.osc3,
    setOsc1,
    setOsc2,
    setOsc3,
    noteOn,
    noteOff,
    getPresetSnapshot,
    applyPresetSnapshot,
    applyFactorySynthPreset,
    activeFactoryPresetId,
    triggerDrum,
    drumKit,
    setDrumKit,
    activeDrumIndex,
    setActiveDrumIndex,
    resetDrumKit,
    drumSampleBuffers,
    setDrumSample,
    clearDrumSample,
    applyDrumStyle,
  }
}
