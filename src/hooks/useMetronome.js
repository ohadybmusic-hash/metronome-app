import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AuthContext } from '../context/AuthProvider.jsx'

const BPM_MIN = 1
const BPM_MAX = 400

function clampBpm(bpm) {
  const n = Number(bpm)
  if (!Number.isFinite(n)) return 120
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(n)))
}

function clampBpmFloat(bpm) {
  const n = Number(bpm)
  if (!Number.isFinite(n)) return 120
  return Math.min(BPM_MAX, Math.max(BPM_MIN, n))
}

function isIOSOrIPadOS() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iP(hone|ad|od)/.test(ua)) return true
  // iPadOS 13+ can report as Mac + touch
  if (ua.includes('Mac') && 'ontouchend' in document) return true
  return false
}

function isIOSAddToHomeScreenPWA() {
  if (typeof navigator === 'undefined') return false
  return 'standalone' in navigator && Boolean(navigator.standalone)
}

/**
 * Tuner + metronome used separate AudioContext instances; on iOS only the Tuner path (incl. mic)
 * reliably woke audio. A shared context fixes that. Separately, iOS WebKit has had bugs where
 * StereoPanner is silent; route clicks straight to destination (pan is ignored on iOS / PWA).
 */
function getMetronomeOutputNode(ctx, panner) {
  if (!ctx) return panner
  if (isIOSOrIPadOS() || isIOSAddToHomeScreenPWA()) return ctx.destination
  return panner || ctx.destination
}


function toUtcDayString(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addUtcDays(dayStr, deltaDays) {
  const m = String(dayStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  dt.setUTCDate(dt.getUTCDate() + Number(deltaDays || 0))
  return toUtcDayString(dt)
}

/**
 * Seconds Per Beat = 60 / BPM
 * (Here, "beat" means a quarter note; other denominators scale from that.)
 */
function secondsPerQuarter(bpm) {
  return 60 / bpm
}

function getMeter(timeSignature) {
  switch (timeSignature) {
    case '2/4':
      return { numerator: 2, denominator: 4, accentPulses: new Set([0]) }
    case '3/4':
      return { numerator: 3, denominator: 4, accentPulses: new Set([0]) }
    case '5/4':
      return { numerator: 5, denominator: 4, accentPulses: new Set([0, 3]) } // 3+2
    case '6/8':
      return { numerator: 6, denominator: 8, accentPulses: new Set([0, 3]) } // 3+3
    case '9/8':
      return { numerator: 9, denominator: 8, accentPulses: new Set([0, 3, 6]) } // 3+3+3
    case '12/8':
      return { numerator: 12, denominator: 8, accentPulses: new Set([0, 3, 6, 9]) } // 3+3+3+3
    case '3/8':
      return { numerator: 3, denominator: 8, accentPulses: new Set([0]) }
    case '5/8':
      return { numerator: 5, denominator: 8, accentPulses: new Set([0, 2]) } // 2+3
    case '7/8':
      return { numerator: 7, denominator: 8, accentPulses: new Set([0, 2, 4]) } // 2+2+3
    case '4/4':
    default:
      return { numerator: 4, denominator: 4, accentPulses: new Set([0]) }
  }
}

function getSubdivisionFactor(subdivision) {
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

function createBeepAt(ctx, when, output, { frequency, duration, volume }) {
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

function createWoodblockAt(ctx, when, output, { frequency, volume }) {
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

function createVoiceAt(ctx, when, output, buffer, { volume }) {
  if (!buffer) return
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  gain.gain.setValueAtTime(volume, when)
  src.connect(gain)
  gain.connect(output)
  src.start(when)
  src.stop(when + Math.min(2.0, buffer.duration + 0.05))
}

function defaultBeatAccents(meter) {
  const arr = Array.from({ length: meter.numerator }, () => 'NORMAL')
  if (arr.length) arr[0] = 'ACCENT3'
  return arr
}

function normalizeBeatAccents(meter, maybeArr) {
  const allowed = new Set(['ACCENT3', 'ACCENT2', 'ACCENT1', 'NORMAL', 'MUTE'])
  let base = Array.isArray(maybeArr) ? maybeArr : []

  // Backward-compat / bug-migration:
  // If stored accents look "shifted" (ACCENT on beat 2, beat 1 NORMAL, rest NORMAL),
  // correct it back to ACCENT on beat 1.
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
    // Beat 1 should be accented by default unless explicitly set otherwise.
    const fallback = i === 0 ? 'ACCENT3' : 'NORMAL'
    // Migrate old labels:
    if (v === 'ACCENT') return 'ACCENT3'
    if (v === 'SOFT') return 'ACCENT1'
    return allowed.has(v) ? v : fallback
  })

  // If the array looks untouched / defaulted (all NORMAL), ensure beat 1 is ACCENT.
  if (next.length && next[0] === 'NORMAL') {
    const anyOther = next.slice(1).some((x) => x !== 'NORMAL')
    if (!anyOther) next[0] = 'ACCENT3'
  }
  return next
}

function getAccentMultiplier(level) {
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

function getAccentTimbre(level) {
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

/**
 * Web Audio metronome with lookahead scheduling.
 *
 * Supports:
 * - BPM range 1-400
 * - Common meters (2/4, 3/4, 4/4, 5/4, 3/8, 5/8, 6/8, 7/8, 9/8, 12/8)
 * - Pulse counter (beats in the measure)
 * - Subdivisions: quarter, eighth, triplet, sixteenth
 */
export function useMetronome(options = {}) {
  const {
    initialBpm = 120,
    initialTimeSignature = '4/4',
    initialSubdivision = 'quarter',
    lookaheadMs = 20,
    /** How far ahead of currentTime to schedule audio (covers 400 BPM + dense subdivisions). */
    scheduleAheadSeconds = 0.16,
    /** If set, use this (e.g. App-level) AudioContext so Tuner + metronome share one iOS engine. */
    getAudioContext: getAudioContextOption,
  } = options

  const [bpm, _setBpm] = useState(() => clampBpm(initialBpm))
  const [timeSignature, _setTimeSignature] = useState(initialTimeSignature)
  const [subdivision, setSubdivision] = useState(initialSubdivision)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pulse, setPulse] = useState(0)

  const [sound, setSound] = useState('beep') // 'beep' | 'voiceNumbers' | 'voiceCount'

  const [hapticsEnabled, setHapticsEnabled] = useState(false)
  const hapticsEnabledRef = useRef(false)
  const [pan, setPan] = useState(0)

  const [polyrhythmEnabled, setPolyrhythmEnabled] = useState(false)
  const [polyrhythmMainBeats, setPolyrhythmMainBeats] = useState(4)
  const [polyrhythmPolyBeats, setPolyrhythmPolyBeats] = useState(3)

  const [countInEnabled, setCountInEnabled] = useState(false)
  const [countInActive, setCountInActive] = useState(false)
  const [countInBeatsRemaining, setCountInBeatsRemaining] = useState(0)

  const [beatAccents, setBeatAccents] = useState(() =>
    defaultBeatAccents(getMeter(initialTimeSignature)),
  )

  const [internalClockEnabled, setInternalClockEnabled] = useState(false)
  const [internalClockPlayBars, setInternalClockPlayBars] = useState(4) // X
  const [internalClockMuteBars, setInternalClockMuteBars] = useState(4) // Y
  const [internalClockIsMuted, setInternalClockIsMuted] = useState(false)
  const [internalClockBarsInPhase, setInternalClockBarsInPhase] = useState(0)
  const [internalClockIntroEnabled, setInternalClockIntroEnabled] = useState(true)

  const [practiceTotalSeconds, setPracticeTotalSeconds] = useState(0)
  const [practiceAverageBpm, setPracticeAverageBpm] = useState(0)

  const [streakCount, setStreakCount] = useState(0)
  const [lastPracticeDate, setLastPracticeDate] = useState(null) // YYYY-MM-DD (UTC)

  const auth = useContext(AuthContext)
  const authedUserId = auth?.user?.id ?? null
  const isAnonymous = Boolean(auth?.user?.is_anonymous)

  const STORAGE_SONGS = 'metronome.songs.v1'
  const STORAGE_SETLISTS = 'metronome.setlists.v1'
  const STORAGE_PREFS = 'metronome.prefs.v1'

  const [songs, setSongs] = useState([])
  const [setlists, setSetlists] = useState([])
  const [activeSongId, setActiveSongId] = useState('')
  const [activeSetlistId, setActiveSetlistId] = useState('')
  const [guestSyncPrompt, setGuestSyncPrompt] = useState(null)

  const userDataRowIdRef = useRef(null)
  const persistTimerRef = useRef(null)

  const [trainerEnabled, setTrainerEnabled] = useState(false)
  const [trainerMode, setTrainerMode] = useState('seconds') // 'seconds' | 'bars'
  const [trainerStartBpm, setTrainerStartBpm] = useState(() => clampBpm(initialBpm))
  const [trainerTargetBpm, setTrainerTargetBpm] = useState(() => clampBpm(initialBpm))
  const [trainerDurationSeconds, setTrainerDurationSeconds] = useState(30)
  const [trainerDurationBars, setTrainerDurationBars] = useState(16)
  const [trainerBarsPerStep, setTrainerBarsPerStep] = useState(1) // X bars per increment
  const [trainerElapsedTime, setTrainerElapsedTime] = useState(0)
  const [trainerBarsElapsed, setTrainerBarsElapsed] = useState(0)

  // Automator (Gap Training / Rhythm Trainer add-on): increment BPM every X bars.
  const [automatorEnabled, setAutomatorEnabled] = useState(false)
  const [automatorStartBpm, setAutomatorStartBpm] = useState(() => clampBpm(initialBpm))
  const [automatorTargetBpm, setAutomatorTargetBpm] = useState(() => clampBpm(initialBpm))
  const [automatorIncrementBpm, setAutomatorIncrementBpm] = useState(1)
  const [automatorChangeEveryBars, setAutomatorChangeEveryBars] = useState(4)
  const [automatorBarsElapsed, setAutomatorBarsElapsed] = useState(0)

  const ctxRef = useRef(null)
  /** Avoid duplicate silence prime if AudioContext is recreated. */
  const audioPrimedForCtxRef = useRef(null)
  /** iOS often needs a real HTMLAudioElement + play() in the same gesture as Web Audio. */
  const html5SilentAudioRef = useRef(null)
  const pannerRef = useRef(null)
  const timerIdRef = useRef(null)
  const schedulerTickRef = useRef(() => {})
  const nextPulseTimeRef = useRef(0)
  const pulseIndexRef = useRef(0)
  const nextPolyTimeRef = useRef(0)
  const polyIndexRef = useRef(0)
  const bpmRef = useRef(bpm)
  const meterRef = useRef(getMeter(timeSignature))
  const subdivisionRef = useRef(subdivision)
  const soundRef = useRef(sound)
  const beatAccentsRef = useRef(beatAccents)
  const voiceBuffersRef = useRef({ status: 'idle', buffers: {} })
  const countBuffersRef = useRef({ status: 'idle', buffers: {} }) // 1..4
  const internalClockRef = useRef({
    enabled: false,
    playBars: 4,
    muteBars: 4,
    isMuted: false,
    barsInPhase: 0,
    introEnabled: true,
    introRemaining: 0,
  })
  const polyRef = useRef({
    enabled: false,
    mainBeats: 4,
    polyBeats: 3,
  })
  const practiceRef = useRef({
    lastAudioTime: null,
    totalSeconds: 0,
    bpmSecondsSum: 0,
  })
  const beatListenersRef = useRef(new Set())
  const pulseListenersRef = useRef(new Set())
  const countInRef = useRef({
    active: false,
    timeouts: new Set(),
  })
  const practiceSessionRef = useRef({
    startedAtAudioTime: null,
    bpmAtStart: null,
  })

  const trainerRef = useRef({
    enabled: false,
    mode: 'seconds',
    startBpm: clampBpmFloat(initialBpm),
    targetBpm: clampBpmFloat(initialBpm),
    durationSeconds: 30,
    durationBars: 16,
    barsPerStep: 1,
    startedAtAudioTime: null,
    startBpmApplied: null,
    lastAppliedBpm: null,
    barsElapsed: 0,
  })

  const automatorRef = useRef({
    enabled: false,
    startBpm: clampBpmFloat(initialBpm),
    targetBpm: clampBpmFloat(initialBpm),
    increment: 1,
    everyBars: 4,
    barsElapsed: 0,
    startedAtBar: null,
    lastAppliedAtBar: null,
  })

  useEffect(() => {
    bpmRef.current = bpm
  }, [bpm])

  useEffect(() => {
    meterRef.current = getMeter(timeSignature)
  }, [timeSignature])

  useEffect(() => {
    subdivisionRef.current = subdivision
  }, [subdivision])

  useEffect(() => {
    soundRef.current = sound
  }, [sound])

  useEffect(() => {
    beatAccentsRef.current = beatAccents
  }, [beatAccents])

  useEffect(() => {
    hapticsEnabledRef.current = hapticsEnabled
  }, [hapticsEnabled])

  useEffect(() => {
    internalClockRef.current.enabled = internalClockEnabled
  }, [internalClockEnabled])

  useEffect(() => {
    internalClockRef.current.playBars = Math.max(1, Math.floor(Number(internalClockPlayBars) || 1))
  }, [internalClockPlayBars])

  useEffect(() => {
    internalClockRef.current.muteBars = Math.max(0, Math.floor(Number(internalClockMuteBars) || 0))
  }, [internalClockMuteBars])

  useEffect(() => {
    internalClockRef.current.isMuted = internalClockIsMuted
  }, [internalClockIsMuted])

  useEffect(() => {
    internalClockRef.current.barsInPhase = internalClockBarsInPhase
  }, [internalClockBarsInPhase])

  useEffect(() => {
    internalClockRef.current.introEnabled = Boolean(internalClockIntroEnabled)
  }, [internalClockIntroEnabled])

  useEffect(() => {
    automatorRef.current.enabled = Boolean(automatorEnabled)
  }, [automatorEnabled])

  useEffect(() => {
    automatorRef.current.startBpm = clampBpmFloat(automatorStartBpm)
  }, [automatorStartBpm])

  useEffect(() => {
    automatorRef.current.targetBpm = clampBpmFloat(automatorTargetBpm)
  }, [automatorTargetBpm])

  useEffect(() => {
    automatorRef.current.increment = clampBpmFloat(automatorIncrementBpm || 1)
  }, [automatorIncrementBpm])

  useEffect(() => {
    automatorRef.current.everyBars = Math.max(1, Math.floor(Number(automatorChangeEveryBars) || 1))
  }, [automatorChangeEveryBars])

  useEffect(() => {
    polyRef.current.enabled = Boolean(polyrhythmEnabled)
  }, [polyrhythmEnabled])

  useEffect(() => {
    polyRef.current.mainBeats = Math.max(1, Math.floor(Number(polyrhythmMainBeats) || 1))
  }, [polyrhythmMainBeats])

  useEffect(() => {
    polyRef.current.polyBeats = Math.max(1, Math.floor(Number(polyrhythmPolyBeats) || 1))
  }, [polyrhythmPolyBeats])

  const setTimeSignature = useCallback((next) => {
    _setTimeSignature(next)
    const m = getMeter(next)
    setBeatAccents((prev) => {
      const trimmed = prev.slice(0, m.numerator)
      while (trimmed.length < m.numerator) trimmed.push('NORMAL')
      // If beat 1 wasn't explicitly set, keep it accented by default.
      if (trimmed.length && (trimmed[0] == null || (!prev.length && trimmed[0] === 'NORMAL'))) trimmed[0] = 'ACCENT'
      return trimmed
    })
  }, [])

  const setBeatAccentsArray = useCallback((nextAccents) => {
    const m = meterRef.current
    setBeatAccents(normalizeBeatAccents(m, nextAccents))
  }, [])

  const resyncSchedulingNow = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx || !isPlaying) return

    const now = ctx.currentTime
    nextPulseTimeRef.current = Math.max(now + 0.02, now)
    schedulerTickRef.current()
  }, [isPlaying])

  const applyBpm = useCallback(
    (next, { resync = true } = {}) => {
      const nextFloat = clampBpmFloat(next)
      bpmRef.current = nextFloat
      _setBpm(clampBpm(nextFloat))
      if (resync) resyncSchedulingNow()
    },
    [resyncSchedulingNow],
  )

  const setBpm = useCallback(
    (next) => {
      applyBpm(next, { resync: true })
    },
    [applyBpm],
  )

  const ensureContext = useCallback(() => {
    if (typeof getAudioContextOption === 'function') {
      const ext = getAudioContextOption()
      if (ext) {
        if (ctxRef.current && ctxRef.current !== ext) {
          pannerRef.current = null
          audioPrimedForCtxRef.current = null
        }
        ctxRef.current = ext
      }
    } else if (!ctxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioContextCtor()
      audioPrimedForCtxRef.current = null
    }

    if (ctxRef.current && !pannerRef.current) {
      const c = ctxRef.current
      const p = c.createStereoPanner()
      p.pan.setValueAtTime(0, c.currentTime)
      p.connect(c.destination)
      pannerRef.current = p
    }

    // Important: initiate resume synchronously (don't await) so it counts as a user gesture.
    // Some mobile browsers will remain silent if resume is awaited from an async chain.
    if (ctxRef.current && ctxRef.current.state === 'suspended') {
      try {
        ctxRef.current.resume?.().catch?.(() => {})
      } catch {
        // ignore
      }
    }

    return ctxRef.current
  }, [getAudioContextOption])

  // Inaudible buffer through the *same* mix bus as clicks — iOS / Safari (incl. “Add to Home
  // Screen”) often require a BufferSource to start(0) in the *same* synchronous turn as
  // resume/touch, or the graph stays inaudible. connect() to `destination` only was flaky next to
  // a StereoPanner path. True 0 gain is sometimes elided; other platforms use one prime per ctx.
  const primeAudioGraph = useCallback((ctx) => {
    if (!ctx) return
    if (audioPrimedForCtxRef.current === ctx) return
    audioPrimedForCtxRef.current = ctx
    try {
      const out = getMetronomeOutputNode(ctx, pannerRef.current)
      const n = Math.max(128, Math.floor((ctx.sampleRate || 48000) * 0.002))
      const buffer = ctx.createBuffer(1, n, ctx.sampleRate)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const g = ctx.createGain()
      g.gain.value = 0.0001
      src.connect(g)
      g.connect(out)
      src.start(0)
    } catch {
      // ignore
    }
  }, [])

  // Every call: iOS can drop output if the system never saw a non-zero node this gesture.
  const iosInaudibleOscKick = useCallback((ctx) => {
    if (!ctx) return
    try {
      const out = getMetronomeOutputNode(ctx, pannerRef.current)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      const t0 = ctx.currentTime
      osc.frequency.setValueAtTime(440, t0)
      g.gain.setValueAtTime(0.0001, t0)
      osc.connect(g)
      g.connect(out)
      osc.start(t0)
      osc.stop(t0 + 0.03)
    } catch {
      // ignore
    }
  }, [])

  // Call on pointerup / from start() — must run sync (do not await) inside user gesture.
  const ensureUserGestureAudio = useCallback(() => {
    const ctx = ensureContext()
    const ios = isIOSOrIPadOS() || isIOSAddToHomeScreenPWA()

    if (ios) {
      // Many iPhone builds unmute the media stack more reliably with HTMLAudio + Web Audio.
      try {
        let a = html5SilentAudioRef.current
        if (!a) {
          a = new Audio()
          a.preload = 'auto'
          a.setAttribute('playsinline', 'true')
          a.setAttribute('webkit-playsinline', 'true')
          a.src =
            'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA='
          html5SilentAudioRef.current = a
        }
        a.volume = 0.0001
        const p = a.play()
        if (p && typeof p.then === 'function') void p.catch(() => {})
      } catch {
        // ignore
      }
    }

    try {
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') void ctx.resume()
    } catch {
      // ignore
    }

    if (ios) {
      primeAudioGraph(ctx) // once per AudioContext: silent buffer
      // Every iOS unlock: inaudible osc (pointer gesture can be void if only buffer ran earlier).
      iosInaudibleOscKick(ctx)
    } else {
      primeAudioGraph(ctx)
    }

    try {
      if (ctx.state === 'suspended' || ctx.state === 'interrupted') void ctx.resume()
    } catch {
      // ignore
    }

    return ctx
  }, [ensureContext, iosInaudibleOscKick, primeAudioGraph])

  useEffect(() => {
    const ctx = ctxRef.current
    const p = pannerRef.current
    if (!ctx || !p) return
    const v = Math.max(-1, Math.min(1, Number(pan) || 0))
    try {
      p.pan.setValueAtTime(v, ctx.currentTime)
    } catch {
      // ignore
    }
  }, [pan])

  const ensureCountSamples = useCallback(async () => {
    const ctx = ensureContext()
    if (countBuffersRef.current.status === 'ready') return
    if (countBuffersRef.current.status === 'loading') return
    countBuffersRef.current.status = 'loading'

    try {
      const sr = ctx.sampleRate || 48000
      const dur = 0.22
      const len = Math.max(1, Math.floor(sr * dur))

      const make = (seed) => {
        const buf = ctx.createBuffer(1, len, sr)
        const ch = buf.getChannelData(0)
        for (let i = 0; i < len; i += 1) {
          const t = i / sr
          const env = Math.exp(-t * 18) // short decay
          const f0 = 190 + seed * 40
          const a =
            Math.sin(2 * Math.PI * f0 * t) * 0.55 +
            Math.sin(2 * Math.PI * (f0 * 2.1) * t) * 0.25 +
            Math.sin(2 * Math.PI * (f0 * 3.2) * t) * 0.12
          // Add a little transient noise for consonant feel.
          const n = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.08
          ch[i] = (a + n) * env
        }
        return buf
      }

      countBuffersRef.current = {
        status: 'ready',
        buffers: {
          1: make(1), // "One"
          2: make(2), // "Two"
          3: make(3), // "Three"
          4: make(4), // "Four"
        },
      }
    } catch {
      countBuffersRef.current = { status: 'error', buffers: {} }
    }
  }, [ensureContext])

  const loadVoiceSamples = useCallback(async () => {
    const ctx = ensureContext()
    if (voiceBuffersRef.current.status === 'loading') return
    if (voiceBuffersRef.current.status === 'ready') return

    voiceBuffersRef.current.status = 'loading'
    const buffers = {}
    const max = 8
    try {
      for (let i = 1; i <= max; i += 1) {
        const res = await fetch(`/voice/${i}.wav`)
        if (!res.ok) continue
        const arr = await res.arrayBuffer()
        // Safari needs a copy sometimes; decoding handles it.
        const buf = await ctx.decodeAudioData(arr)
        buffers[i] = buf
      }
      voiceBuffersRef.current = { status: 'ready', buffers }
    } catch {
      voiceBuffersRef.current = { status: 'error', buffers: {} }
    }
  }, [ensureContext])

  const setBeatAccent = useCallback((beatIndex, level) => {
    const allowed = new Set(['ACCENT3', 'ACCENT2', 'ACCENT1', 'NORMAL', 'MUTE'])
    setBeatAccents((prev) => {
      const next = prev.slice()
      if (beatIndex < 0 || beatIndex >= next.length) return prev
      next[beatIndex] = allowed.has(level) ? level : 'NORMAL'
      return next
    })
  }, [])

  const cycleBeatAccent = useCallback((beatIndex) => {
    const order = ['ACCENT3', 'ACCENT2', 'ACCENT1', 'NORMAL', 'MUTE']
    setBeatAccents((prev) => {
      const next = prev.slice()
      if (beatIndex < 0 || beatIndex >= next.length) return prev
      const cur = next[beatIndex] || 'NORMAL'
      const idx = order.indexOf(cur)
      next[beatIndex] = order[(idx + 1) % order.length]
      return next
    })
  }, [])

  const schedulePulse = useCallback((ctx, pulseStartTime, pulseIndex, meter) => {
    const output = getMetronomeOutputNode(ctx, pannerRef.current)
    const gapMuted = internalClockRef.current.enabled && internalClockRef.current.isMuted

    const spq = secondsPerQuarter(bpmRef.current)
    const secondsPerPulse = spq * (4 / meter.denominator)

    const factor = getSubdivisionFactor(subdivisionRef.current)
    const step = secondsPerPulse / factor

    const beatAccentLevel = beatAccentsRef.current[pulseIndex] || (pulseIndex === 0 ? 'ACCENT3' : 'NORMAL')
    const beatMul = getAccentMultiplier(beatAccentLevel)

    const isAccentBeatByMeter = pulseIndex === 0 || meter.accentPulses.has(pulseIndex)
    const isVoiceNumbers = soundRef.current === 'voiceNumbers'
    const isVoiceCount = soundRef.current === 'voiceCount'
    const whenPrimary = pulseStartTime
    const pulseNumber = pulseIndex + 1
    const secondsPerBeat = 60 / bpmRef.current

    for (let i = 0; i < factor; i += 1) {
      const when = pulseStartTime + i * step
      const isPrimary = i === 0
      const isDownbeat = isPrimary && isAccentBeatByMeter
      const isMeasureDownbeat = isPrimary && pulseIndex === 0
      const isSubdivisionPulse = i !== 0

      // Notify pulse listeners for visual sync (includes subdivisions).
      for (const cb of pulseListenersRef.current) {
        try {
          cb({
            when,
            pulseIndex,
            pulseNumber,
            subIndex: i,
            subCount: factor,
            isSubdivision: isSubdivisionPulse,
            isMeasureDownbeat,
            bpm: bpmRef.current,
            secondsPerBeat,
            timeSignature: `${meter.numerator}/${meter.denominator}`,
            subdivision: subdivisionRef.current,
            gapMuted,
          })
        } catch {
          // ignore listener errors
        }
      }

      // Haptics: one pulse per primary subdivision (not every 16th); downbeat = double pattern.
      if (
        i === 0 &&
        !gapMuted &&
        hapticsEnabledRef.current &&
        typeof navigator !== 'undefined' &&
        'vibrate' in navigator
      ) {
        const nowAudio = ctx.currentTime
        const delayMs = Math.max(0, (when - nowAudio) * 1000)
        const pattern = isMeasureDownbeat ? [50, 40, 50] : [50]
        window.setTimeout(() => {
          try {
            navigator.vibrate(pattern)
          } catch {
            // ignore
          }
        }, delayMs)
      }

      if (isVoiceNumbers) {
        if (i !== 0) continue
        if (gapMuted) continue
        const n = pulseIndex + 1
        const buf = voiceBuffersRef.current.buffers?.[n]
        if (buf) {
          createVoiceAt(ctx, when, output, buf, { volume: isDownbeat ? 0.9 : 0.75 })
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const delayMs = Math.max(0, (when - ctx.currentTime) * 1000)
          window.setTimeout(() => {
            const u = new SpeechSynthesisUtterance(String(n))
            u.rate = 1.0
            u.pitch = 1.0
            u.volume = isDownbeat ? 1.0 : 0.9
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(u)
          }, delayMs)
        }
        continue
      }

      if (isVoiceCount) {
        if (i !== 0) continue
        if (gapMuted) continue
        // Always play "One" on downbeat (beat 1 of bar), even in odd meters.
        const beatNum = pulseIndex + 1
        const sampleN = beatNum === 1 ? 1 : beatNum >= 2 && beatNum <= 4 ? beatNum : null
        const buf = sampleN ? countBuffersRef.current.buffers?.[sampleN] : null
        if (buf) {
          createVoiceAt(ctx, when, output, buf, { volume: beatNum === 1 ? 0.95 : 0.85 })
        } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const delayMs = Math.max(0, (when - ctx.currentTime) * 1000)
          window.setTimeout(() => {
            const u = new SpeechSynthesisUtterance(beatNum === 1 ? 'One' : String(beatNum))
            u.rate = 1.0
            u.pitch = 1.1
            u.volume = beatNum === 1 ? 1.0 : 0.9
            window.speechSynthesis.cancel()
            window.speechSynthesis.speak(u)
          }, delayMs)
        }
        continue
      }

      if (gapMuted) continue
      const mul = isPrimary ? beatMul : 1.0
      if (mul <= 0) continue

      const timbre = getAccentTimbre(isPrimary ? beatAccentLevel : 'NORMAL')
      const frequency = isDownbeat ? 1200 : timbre.freq
      const baseVolume = isDownbeat ? 0.22 : isPrimary ? 0.18 : 0.12
      const volume = baseVolume * mul

      if (timbre.kind === 'wood') {
        createWoodblockAt(ctx, when, output, { frequency, volume })
      } else {
        createBeepAt(ctx, when, output, {
          frequency,
          duration: isPrimary ? timbre.dur : 0.02,
          volume,
        })
      }
    }

    // Notify listeners once per (primary) beat, using the scheduled audio time.
    // This is intended for external systems (haptics, lockscreen controls, etc.).
    for (const cb of beatListenersRef.current) {
      try {
        cb({
          when: whenPrimary,
          pulseIndex,
          pulseNumber,
          isDownbeat: isAccentBeatByMeter,
          bpm: bpmRef.current,
          secondsPerBeat,
          secondsPerPulse,
          timeSignature: `${meter.numerator}/${meter.denominator}`,
          subdivision: subdivisionRef.current,
          sound: soundRef.current,
          accent: beatAccentLevel,
          gapMuted,
        })
      } catch {
        // ignore listener errors
      }
    }
  }, [])

  const readGuestData = useCallback(() => {
    let nextSongs
    let nextSetlists
    let nextPrefs
    try {
      nextSongs = JSON.parse(localStorage.getItem(STORAGE_SONGS) || '[]')
    } catch {
      nextSongs = []
    }
    try {
      nextSetlists = JSON.parse(localStorage.getItem(STORAGE_SETLISTS) || '[]')
    } catch {
      nextSetlists = []
    }
    try {
      nextPrefs = JSON.parse(localStorage.getItem(STORAGE_PREFS) || '{}')
    } catch {
      nextPrefs = {}
    }
    return {
      songs: Array.isArray(nextSongs) ? nextSongs : [],
      setlists: Array.isArray(nextSetlists) ? nextSetlists : [],
      prefs: nextPrefs && typeof nextPrefs === 'object' ? nextPrefs : {},
    }
  }, [])

  const persistGuestData = useCallback((nextSongs, nextSetlists, prefs) => {
    localStorage.setItem(STORAGE_SONGS, JSON.stringify(nextSongs))
    localStorage.setItem(STORAGE_SETLISTS, JSON.stringify(nextSetlists))
    localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs || {}))
  }, [])

  const persistAuthedData = useCallback(
    async (nextSongs, nextSetlists) => {
      if (!authedUserId) return
      const payload = {
        songs: nextSongs,
        setlists: nextSetlists,
        prefs: {
          activeSongId,
          activeSetlistId,
        },
        streak: {
          streak_count: Math.max(0, Math.floor(Number(streakCount) || 0)),
          last_practice_date: lastPracticeDate || null,
        },
        practice: {
          total_minutes: practiceRef.current.totalSeconds / 60,
          average_bpm:
            practiceRef.current.totalSeconds > 0
              ? practiceRef.current.bpmSecondsSum / practiceRef.current.totalSeconds
              : 0,
        },
        updated_at: new Date().toISOString(),
      }

      // This project's schema uses:
      // - user_id (PK)
      // - data jsonb
      await supabase.from('user_data').upsert(
        {
          user_id: authedUserId,
          data: payload,
        },
        { onConflict: 'user_id' },
      )
    },
    [authedUserId],
  )

  const schedulePersist = useCallback(
    (nextSongs, nextSetlists) => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = window.setTimeout(async () => {
        if (authedUserId) {
          try {
            await persistAuthedData(nextSongs, nextSetlists)
          } catch {
            // If sync fails, keep local state and let the UI continue.
          }
        } else {
          persistGuestData(nextSongs, nextSetlists, { activeSongId, activeSetlistId })
        }
      }, 400)
    },
    [activeSetlistId, activeSongId, authedUserId, persistAuthedData, persistGuestData],
  )

  // Load data source when auth state changes (no setState-in-effect rule)
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!authedUserId) {
        userDataRowIdRef.current = null
        const g = readGuestData()
        if (!cancelled) {
          setSongs(g.songs)
          setSetlists(g.setlists)
          setActiveSongId(String(g.prefs?.activeSongId || ''))
          setActiveSetlistId(String(g.prefs?.activeSetlistId || ''))
        }
        return
      }

      const { data, error } = await supabase.from('user_data').select('*').eq('user_id', authedUserId).maybeSingle()
      if (cancelled) return
      if (error) return

      userDataRowIdRef.current = data?.user_id ?? null
      const content = data?.data ?? {}
      setSongs(Array.isArray(content.songs) ? content.songs : [])
      setSetlists(Array.isArray(content.setlists) ? content.setlists : [])
      setActiveSongId(String(content?.prefs?.activeSongId || ''))
      setActiveSetlistId(String(content?.prefs?.activeSetlistId || ''))
      setStreakCount(Math.max(0, Math.floor(Number(content?.streak?.streak_count) || 0)))
      setLastPracticeDate(content?.streak?.last_practice_date || null)
    }

    // Defer to avoid lint rule "set state in effect" (treated as cascading render).
    const id = window.setTimeout(() => {
      load()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [authedUserId, readGuestData])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
  }, [])

  const schedulerTick = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    if (ctx.state !== 'running') {
      try {
        if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
          void ctx.resume()
        }
      } catch {
        // ignore
      }
    }

    const meter = meterRef.current
    const now = ctx.currentTime

    // Practice history: accumulate time-weighted BPM while "playing"
    if (practiceRef.current.lastAudioTime != null) {
      const dt = Math.max(0, now - practiceRef.current.lastAudioTime)
      if (dt > 0) {
        practiceRef.current.totalSeconds += dt
        practiceRef.current.bpmSecondsSum += bpmRef.current * dt
        setPracticeTotalSeconds(practiceRef.current.totalSeconds)
        setPracticeAverageBpm(
          practiceRef.current.totalSeconds > 0
            ? practiceRef.current.bpmSecondsSum / practiceRef.current.totalSeconds
            : 0,
        )
      }
    }
    practiceRef.current.lastAudioTime = now

    const tr = trainerRef.current
    if (tr.enabled && tr.startedAtAudioTime != null) {
      if (tr.mode === 'seconds') {
        const elapsed = Math.max(0, now - tr.startedAtAudioTime)
        const duration = Math.max(0.001, Number(tr.durationSeconds) || 0.001)
        const t = Math.min(1, elapsed / duration)
        const next = tr.startBpm + (tr.targetBpm - tr.startBpm) * t

        setTrainerElapsedTime(elapsed)
        if (tr.lastAppliedBpm == null || Math.abs(next - tr.lastAppliedBpm) >= 0.01) {
          tr.lastAppliedBpm = next
          applyBpm(next, { resync: true })
        }

        if (t >= 1) {
          tr.enabled = false
          setTrainerEnabled(false)
        }
      } else if (tr.mode === 'bars') {
        setTrainerBarsElapsed(tr.barsElapsed)
      }
    }

    const spq = secondsPerQuarter(bpmRef.current)
    const secondsPerPulse = spq * (4 / meter.denominator)

    while (nextPulseTimeRef.current < now + scheduleAheadSeconds) {
      const pulseIndex = pulseIndexRef.current

      schedulePulse(ctx, nextPulseTimeRef.current, pulseIndex, meter)

      // Automator: advance on downbeats and apply increments every X bars.
      if (pulseIndex === 0) {
        const a = automatorRef.current
        if (a.enabled) {
          a.barsElapsed += 1
          setAutomatorBarsElapsed(a.barsElapsed)

          if (a.startedAtBar == null) {
            a.startedAtBar = a.barsElapsed
            a.lastAppliedAtBar = a.barsElapsed
            applyBpm(a.startBpm, { resync: true })
          } else {
            const every = Math.max(1, Math.floor(Number(a.everyBars) || 1))
            const barsSince = a.barsElapsed - (a.lastAppliedAtBar ?? a.startedAtBar ?? 0)
            if (barsSince >= every) {
              const dir = a.targetBpm >= bpmRef.current ? 1 : -1
              const step = Math.abs(Number(a.increment) || 1)
              const next = clampBpmFloat(bpmRef.current + dir * step)
              const done = dir > 0 ? next >= a.targetBpm : next <= a.targetBpm
              applyBpm(done ? a.targetBpm : next, { resync: true })
              a.lastAppliedAtBar = a.barsElapsed
              if (done) {
                a.enabled = false
                setAutomatorEnabled(false)
              }
            }
          }
        } else if (automatorBarsElapsed !== 0) {
          // Keep UI consistent when disabled.
          if (automatorRef.current.barsElapsed !== 0) {
            automatorRef.current.barsElapsed = 0
            automatorRef.current.startedAtBar = null
            automatorRef.current.lastAppliedAtBar = null
            setAutomatorBarsElapsed(0)
          }
        }
      }

      // Internal Clock (Auto-Mute): advance on downbeats.
      const ic = internalClockRef.current
      if (ic.enabled && pulseIndex === 0) {
        // Optional 2-bar count-in before gap pattern starts.
        if (ic.introRemaining > 0) {
          ic.introRemaining -= 1
          ic.isMuted = false
          ic.barsInPhase = 0
          setInternalClockIsMuted(false)
          setInternalClockBarsInPhase(0)
        } else {
        const playBars = Math.max(1, Math.floor(Number(ic.playBars) || 1))
        const muteBars = Math.max(0, Math.floor(Number(ic.muteBars) || 0))
        const phaseLen = ic.isMuted ? muteBars : playBars

        if (phaseLen === 0) {
          // If muteBars is 0, avoid getting stuck in a muted phase.
          if (ic.isMuted) {
            ic.isMuted = false
            ic.barsInPhase = 0
            setInternalClockIsMuted(false)
            setInternalClockBarsInPhase(0)
          }
        } else {
          ic.barsInPhase += 1
          setInternalClockBarsInPhase(ic.barsInPhase)
          if (ic.barsInPhase >= phaseLen) {
            ic.isMuted = !ic.isMuted
            ic.barsInPhase = 0
            setInternalClockIsMuted(ic.isMuted)
            setInternalClockBarsInPhase(0)
          }
        }
        }
      }

      const tr2 = trainerRef.current
      if (tr2.enabled && tr2.startedAtAudioTime != null && tr2.mode === 'bars') {
        const isDownbeat = pulseIndex === 0
        if (isDownbeat) {
          tr2.barsElapsed += 1
          setTrainerBarsElapsed(tr2.barsElapsed)

          const barsPerStep = Math.max(1, Math.floor(Number(tr2.barsPerStep) || 1))
          const totalBars = Math.max(1, Math.floor(Number(tr2.durationBars) || 1))
          const stepsTotal = Math.max(1, Math.ceil(totalBars / barsPerStep))
          const stepSize = (tr2.targetBpm - tr2.startBpm) / stepsTotal

          if ((tr2.barsElapsed - 1) % barsPerStep === 0) {
            const stepIndex = Math.floor((tr2.barsElapsed - 1) / barsPerStep)
            const next = tr2.startBpm + stepSize * stepIndex
            if (tr2.lastAppliedBpm == null || Math.abs(next - tr2.lastAppliedBpm) >= 0.01) {
              tr2.lastAppliedBpm = next
              applyBpm(next, { resync: true })
            }
          }

          if (tr2.barsElapsed >= totalBars) {
            tr2.enabled = false
            setTrainerEnabled(false)
            applyBpm(tr2.targetBpm, { resync: true })
          }
        }
      }

      const nextPulse = (pulseIndex + 1) % meter.numerator
      pulseIndexRef.current = nextPulse
      setPulse(nextPulse + 1)

      nextPulseTimeRef.current += secondsPerPulse
    }

    // Polyrhythm: second independent track layered over the main BPM.
    const poly = polyRef.current
    if (poly.enabled) {
      const mainBeats = Math.max(1, Math.floor(Number(poly.mainBeats) || 1))
      const polyBeats = Math.max(1, Math.floor(Number(poly.polyBeats) || 1))
      const polyStepSeconds = secondsPerQuarter(bpmRef.current) * (mainBeats / polyBeats)

      while (nextPolyTimeRef.current < now + scheduleAheadSeconds) {
        const gapMuted = internalClockRef.current.enabled && internalClockRef.current.isMuted
        if (!gapMuted) {
          // High-pitched woodblock so it sits above the main click.
          const output = getMetronomeOutputNode(ctx, pannerRef.current)
          createWoodblockAt(ctx, nextPolyTimeRef.current, output, {
            frequency: 2200,
            volume: 0.12,
          })
        }
        polyIndexRef.current = (polyIndexRef.current + 1) % polyBeats
        nextPolyTimeRef.current += polyStepSeconds
      }
    }
  }, [applyBpm, scheduleAheadSeconds, schedulePulse])

  useEffect(() => {
    schedulerTickRef.current = schedulerTick
  }, [schedulerTick])

  const start = useCallback(() => {
    if (isPlaying) return
    // Safari / iOS / PWA: everything that unlocks audio must run synchronously in the gesture
    // stack. Do NOT defer the first schedule behind ctx.resume().then() — audio stays silent.
    const ctx = ensureUserGestureAudio()

    const meter = getMeter(timeSignature)
    meterRef.current = meter
    subdivisionRef.current = subdivision

    const output = getMetronomeOutputNode(ctx, pannerRef.current)

    const clearCountInTimers = () => {
      for (const id of countInRef.current.timeouts) window.clearTimeout(id)
      countInRef.current.timeouts.clear()
    }

    const startMain = (atTime) => {
      // Initialize scheduling from the requested start time.
      pulseIndexRef.current = 0
      nextPulseTimeRef.current = Math.max(atTime, ctx.currentTime) + 0.02
      polyIndexRef.current = 0
      nextPolyTimeRef.current = Math.max(atTime, ctx.currentTime) + 0.02
      setPulse(1)

      // Start / resume practice history accumulation for this session run.
      practiceRef.current.lastAudioTime = Math.max(atTime, ctx.currentTime)
      practiceSessionRef.current.startedAtAudioTime = Math.max(atTime, ctx.currentTime)
      practiceSessionRef.current.bpmAtStart = Math.round(bpmRef.current)

      timerIdRef.current = window.setInterval(schedulerTick, lookaheadMs)
      setIsPlaying(true)
    }

    const run = async () => {
      // Count-in: 2 bars of a distinct high-pitched woodblock BEFORE starting metronome + visualizers.
      if (countInEnabled && !countInActive && !countInRef.current.active) {
        // Cancel any previous stray timers.
        clearCountInTimers()
        countInRef.current.active = true
        setCountInActive(true)

        const beatsPerBar = meter.numerator
        const totalBeats = beatsPerBar * 2
        setCountInBeatsRemaining(totalBeats)

        const spq = secondsPerQuarter(bpmRef.current)
        const secondsPerBeat = spq * (4 / meter.denominator)
        const startAt = ctx.currentTime + 0.05
        const woodFreq = 2600

        for (let i = 0; i < totalBeats; i += 1) {
          const when = startAt + i * secondsPerBeat
          createWoodblockAt(ctx, when, output, { frequency: woodFreq, volume: 0.16 })
          const id = window.setTimeout(() => {
            setCountInBeatsRemaining((prev) => Math.max(0, prev - 1))
          }, Math.max(0, (when - ctx.currentTime) * 1000))
          countInRef.current.timeouts.add(id)
        }

        const endId = window.setTimeout(() => {
          countInRef.current.active = false
          clearCountInTimers()
          setCountInActive(false)
          setCountInBeatsRemaining(0)
          startMain(startAt + totalBeats * secondsPerBeat)
        }, Math.max(0, (startAt + totalBeats * secondsPerBeat - ctx.currentTime) * 1000))
        countInRef.current.timeouts.add(endId)
        return
      }

      pulseIndexRef.current = 0
      nextPulseTimeRef.current = ctx.currentTime + 0.05
      polyIndexRef.current = 0
      nextPolyTimeRef.current = ctx.currentTime + 0.05
      setPulse(1)

      // Start / resume practice history accumulation for this session run.
      practiceRef.current.lastAudioTime = ctx.currentTime
      practiceSessionRef.current.startedAtAudioTime = ctx.currentTime
      practiceSessionRef.current.bpmAtStart = Math.round(bpmRef.current)

      const tr = trainerRef.current
      if (tr.enabled) {
        tr.startedAtAudioTime = ctx.currentTime
        tr.startBpmApplied = tr.startBpm
        tr.lastAppliedBpm = null
        tr.barsElapsed = 0
        setTrainerElapsedTime(0)
        setTrainerBarsElapsed(0)
        applyBpm(tr.startBpm, { resync: true })
      }

      // If Automator is enabled, (re)initialize at start.
      if (automatorRef.current.enabled) {
        automatorRef.current.barsElapsed = 0
        automatorRef.current.startedAtBar = null
        automatorRef.current.lastAppliedAtBar = null
        setAutomatorBarsElapsed(0)
        applyBpm(automatorRef.current.startBpm, { resync: true })
      }

      // Start transport before any async decode (fetch/WAV) — those awaits break the Safari
      // gesture chain and also delay the first beep. Voice mode fills buffers in the background
      // (schedulePulse falls back to speechSynthesis until ready).
      timerIdRef.current = window.setInterval(schedulerTick, lookaheadMs)
      setIsPlaying(true)

      if (soundRef.current === 'voiceNumbers' || soundRef.current === 'voiceCount') {
        void (async () => {
          if (soundRef.current === 'voiceNumbers') {
            await loadVoiceSamples()
          }
          if (soundRef.current === 'voiceCount') {
            await ensureCountSamples()
          }
          resyncSchedulingNow()
        })()
      }
    }

    void run()
  }, [
    applyBpm,
    ensureUserGestureAudio,
    ensureCountSamples,
    isPlaying,
    loadVoiceSamples,
    lookaheadMs,
    resyncSchedulingNow,
    schedulerTick,
    subdivision,
    timeSignature,
    countInActive,
    countInEnabled,
  ])

  const stop = useCallback(() => {
    // Cancel count-in if active.
    if (countInRef.current.active) {
      for (const id of countInRef.current.timeouts) window.clearTimeout(id)
      countInRef.current.timeouts.clear()
      countInRef.current.active = false
      setCountInActive(false)
      setCountInBeatsRemaining(0)
    }
    if (timerIdRef.current) {
      window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
    }

    // Practice Log: record a session on stop (authed only).
    const ctx = ctxRef.current
    const startedAt = practiceSessionRef.current.startedAtAudioTime
    if (authedUserId && ctx && startedAt != null) {
      const durationSeconds = Math.max(0, Math.round(ctx.currentTime - startedAt))
      if (durationSeconds > 0) {
        const bpmNow = Math.round(bpmRef.current)
        ;(async () => {
          try {
            await supabase.from('practice_sessions').insert({
              user_id: authedUserId,
              bpm: bpmNow,
              duration_seconds: durationSeconds,
            })
            // Daily streak update (UTC days).
            const today = toUtcDayString(new Date())
            const yesterday = addUtcDays(today, -1)
            setStreakCount((prev) => {
              const last = lastPracticeDate
              if (last === today) return prev
              if (last === yesterday) return prev + 1
              return 1
            })
            setLastPracticeDate((prev) => (prev === today ? prev : today))
            if (isAnonymous) {
              setGuestSyncPrompt('Create a permanent account to sync your data across devices.')
            }
          } catch {
            // ignore logging failures
          }
        })()
      }
    }
    practiceSessionRef.current.startedAtAudioTime = null
    practiceSessionRef.current.bpmAtStart = null

    setIsPlaying(false)
    setPulse(0)
    pulseIndexRef.current = 0
    polyIndexRef.current = 0

    // Stop practice accumulation (but keep totals for the session).
    practiceRef.current.lastAudioTime = null
  }, [])

  // Media Session: show BPM on lock screen + allow play/pause controls.
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null
    if (!ms) return

    try {
      ms.metadata = new MediaMetadata({
        title: 'Metronome',
        artist: `${Math.round(bpm)} BPM`,
        album: 'Practice',
      })
    } catch {
      // ignore
    }

    const onPlay = () => start()
    const onPause = () => stop()

    try {
      ms.setActionHandler('play', onPlay)
      ms.setActionHandler('pause', onPause)
      ms.setActionHandler('stop', onPause)
    } catch {
      // ignore
    }

    try {
      ms.playbackState = isPlaying ? 'playing' : 'paused'
    } catch {
      // ignore
    }

    return () => {
      try {
        ms.setActionHandler('play', null)
        ms.setActionHandler('pause', null)
        ms.setActionHandler('stop', null)
      } catch {
        // ignore
      }
    }
  }, [bpm, isPlaying, start, stop])

  // Periodically sync practice stats while logged in (throttled).
  useEffect(() => {
    if (!authedUserId) return
    const id = window.setTimeout(() => {
      schedulePersist(songs, setlists)
    }, 1500)
    return () => window.clearTimeout(id)
  }, [authedUserId, lastPracticeDate, practiceTotalSeconds, schedulePersist, setlists, songs, streakCount])

  const toggle = useCallback(() => {
    if (isPlaying || countInActive) stop()
    else start()
  }, [countInActive, isPlaying, start, stop])

  // Wake Lock: keep screen awake while playing (best effort).
  useEffect(() => {
    let cancelled = false
    let sentinel = null

    async function request() {
      if (typeof navigator === 'undefined') return
      if (!('wakeLock' in navigator)) return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await sentinel.release()
          sentinel = null
          return
        }
        sentinel.addEventListener?.('release', () => {
          // noop; best-effort
        })
      } catch {
        // ignore (unsupported / denied / not in secure context)
      }
    }

    async function release() {
      try {
        await sentinel?.release?.()
      } catch {
        // ignore
      } finally {
        sentinel = null
      }
    }

    if (isPlaying) request()
    else release()

    const onVis = () => {
      if (!isPlaying) return
      if (document.visibilityState === 'visible') request()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVis)
      release()
    }
  }, [isPlaying])

  useEffect(() => {
    return () => {
      if (timerIdRef.current) window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
      setIsPlaying(false)

      const ctx = ctxRef.current
      ctxRef.current = null
      if (ctx && typeof ctx.close === 'function') ctx.close()
    }
  }, [])

  const meter = useMemo(() => getMeter(timeSignature), [timeSignature])

  const onScheduledBeat = useCallback((cb) => {
    beatListenersRef.current.add(cb)
    return () => beatListenersRef.current.delete(cb)
  }, [])

  const onScheduledPulse = useCallback((cb) => {
    pulseListenersRef.current.add(cb)
    return () => pulseListenersRef.current.delete(cb)
  }, [])

  const getAudioTime = useCallback(() => {
    const ctx = ctxRef.current
    return ctx ? ctx.currentTime : null
  }, [])

  const getNextPulseTime = useCallback(() => nextPulseTimeRef.current, [])

  const getPulseIndex = useCallback(() => pulseIndexRef.current, [])

  const getSecondsPerPulse = useCallback(() => {
    const meterNow = meterRef.current
    const spq = secondsPerQuarter(bpmRef.current)
    return spq * (4 / meterNow.denominator)
  }, [])

  const configureTrainer = useCallback((config = {}) => {
    const next = {
      enabled: config.enabled ?? trainerRef.current.enabled,
      mode: config.mode ?? trainerRef.current.mode,
      startBpm:
        config.startBpm != null ? clampBpmFloat(config.startBpm) : trainerRef.current.startBpm,
      targetBpm:
        config.targetBpm != null ? clampBpmFloat(config.targetBpm) : trainerRef.current.targetBpm,
      durationSeconds:
        config.durationSeconds != null
          ? Math.max(0.001, Number(config.durationSeconds) || 0.001)
          : trainerRef.current.durationSeconds,
      durationBars:
        config.durationBars != null
          ? Math.max(1, Math.floor(Number(config.durationBars) || 1))
          : trainerRef.current.durationBars,
      barsPerStep:
        config.barsPerStep != null
          ? Math.max(1, Math.floor(Number(config.barsPerStep) || 1))
          : trainerRef.current.barsPerStep,
    }

    trainerRef.current = {
      ...trainerRef.current,
      ...next,
      startedAtAudioTime: trainerRef.current.enabled && !next.enabled ? null : trainerRef.current.startedAtAudioTime,
    }

    setTrainerEnabled(Boolean(next.enabled))
    setTrainerMode(next.mode)
    setTrainerStartBpm(clampBpm(next.startBpm))
    setTrainerTargetBpm(clampBpm(next.targetBpm))
    setTrainerDurationSeconds(next.durationSeconds)
    setTrainerDurationBars(next.durationBars)
    setTrainerBarsPerStep(next.barsPerStep)
  }, [])

  const startTrainer = useCallback(
    (config = {}) => {
      configureTrainer({ ...config, enabled: true })
      const tr = trainerRef.current
      tr.enabled = true
      tr.mode = config.mode ?? tr.mode
      tr.startBpm = config.startBpm != null ? clampBpmFloat(config.startBpm) : tr.startBpm
      tr.targetBpm = config.targetBpm != null ? clampBpmFloat(config.targetBpm) : tr.targetBpm
      if (config.durationSeconds != null)
        tr.durationSeconds = Math.max(0.001, Number(config.durationSeconds) || 0.001)
      if (config.durationBars != null)
        tr.durationBars = Math.max(1, Math.floor(Number(config.durationBars) || 1))
      if (config.barsPerStep != null)
        tr.barsPerStep = Math.max(1, Math.floor(Number(config.barsPerStep) || 1))

      tr.startedAtAudioTime = ctxRef.current ? ctxRef.current.currentTime : null
      tr.lastAppliedBpm = null
      tr.barsElapsed = 0
      setTrainerElapsedTime(0)
      setTrainerBarsElapsed(0)

      applyBpm(tr.startBpm, { resync: true })
    },
    [applyBpm, configureTrainer],
  )

  const stopTrainer = useCallback(() => {
    trainerRef.current.enabled = false
    trainerRef.current.startedAtAudioTime = null
    setTrainerEnabled(false)
  }, [])

  return {
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    subdivision,
    setSubdivision,
    isPlaying,
    countIn: {
      enabled: countInEnabled,
      setEnabled: (v) => setCountInEnabled(Boolean(v)),
      active: countInActive,
      beatsRemaining: countInBeatsRemaining,
    },
    start,
    stop,
    toggle,
    pulse,
    pulsesPerMeasure: meter.numerator,
    sound,
    setSound,
    haptics: {
      enabled: hapticsEnabled,
      setEnabled: (v) => setHapticsEnabled(Boolean(v)),
    },
    pan,
    setPan: (v) => setPan(Math.max(-1, Math.min(1, Number(v) || 0))),
    polyrhythm: {
      enabled: polyrhythmEnabled,
      setEnabled: (v) => setPolyrhythmEnabled(Boolean(v)),
      mainBeats: polyrhythmMainBeats,
      setMainBeats: (v) => setPolyrhythmMainBeats(v),
      polyBeats: polyrhythmPolyBeats,
      setPolyBeats: (v) => setPolyrhythmPolyBeats(v),
    },
    automator: {
      enabled: automatorEnabled,
      setEnabled: (v) => setAutomatorEnabled(Boolean(v)),
      startBpm: automatorStartBpm,
      setStartBpm: (v) => setAutomatorStartBpm(clampBpm(v)),
      targetBpm: automatorTargetBpm,
      setTargetBpm: (v) => setAutomatorTargetBpm(clampBpm(v)),
      incrementBpm: automatorIncrementBpm,
      setIncrementBpm: (v) => setAutomatorIncrementBpm(Number(v) || 1),
      changeEveryBars: automatorChangeEveryBars,
      setChangeEveryBars: (v) => setAutomatorChangeEveryBars(Math.max(1, Math.floor(Number(v) || 1))),
      barsElapsed: automatorBarsElapsed,
    },
    beatAccents,
    setBeatAccentsArray,
    setBeatAccent,
    cycleBeatAccent,
    internalClock: {
      enabled: internalClockEnabled,
      playBars: internalClockPlayBars,
      muteBars: internalClockMuteBars,
      isMuted: internalClockIsMuted,
      barsInPhase: internalClockBarsInPhase,
      introEnabled: internalClockIntroEnabled,
      setEnabled: (v) => {
        const next = Boolean(v)
        setInternalClockEnabled(next)
        internalClockRef.current.enabled = next
        if (!next) {
          internalClockRef.current.isMuted = false
          internalClockRef.current.barsInPhase = 0
          internalClockRef.current.introRemaining = 0
          setInternalClockIsMuted(false)
          setInternalClockBarsInPhase(0)
        } else {
          internalClockRef.current.introRemaining = internalClockRef.current.introEnabled ? 2 : 0
        }
      },
      setPlayBars: (v) => setInternalClockPlayBars(v),
      setMuteBars: (v) => setInternalClockMuteBars(v),
      setIntroEnabled: (v) => {
        const next = Boolean(v)
        setInternalClockIntroEnabled(next)
        internalClockRef.current.introEnabled = next
      },
      reset: () => {
        internalClockRef.current.isMuted = false
        internalClockRef.current.barsInPhase = 0
        internalClockRef.current.introRemaining = internalClockRef.current.introEnabled ? 2 : 0
        setInternalClockIsMuted(false)
        setInternalClockBarsInPhase(0)
      },
    },
    practiceHistory: {
      totalMinutes: practiceTotalSeconds / 60,
      averageBpm: practiceAverageBpm,
      reset: () => {
        practiceRef.current.totalSeconds = 0
        practiceRef.current.bpmSecondsSum = 0
        setPracticeTotalSeconds(0)
        setPracticeAverageBpm(0)
      },
    },
    streak: {
      count: streakCount,
      lastPracticeDate,
    },
    presets: {
      songs,
      setlists,
      activeSongId,
      setActiveSongId,
      activeSetlistId,
      setActiveSetlistId,
      guestSyncPrompt,
      clearGuestSyncPrompt: () => setGuestSyncPrompt(null),
      saveSong: ({ name, bpm, timeSignature, subdivision }) => {
        if (!authedUserId || isAnonymous) setGuestSyncPrompt('Create a permanent account to sync your data across devices.')
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const meter = getMeter(timeSignature)
        const song = {
          id,
          name,
          bpm,
          timeSignature,
          subdivision,
          beatAccents: normalizeBeatAccents(meter, beatAccentsRef.current),
        }
        setSongs((prev) => {
          const next = [song, ...prev]
          schedulePersist(next, setlists)
          return next
        })
        setActiveSongId(id)
        return id
      },
      applySong: (song) => {
        if (!song) return
        setActiveSongId(song.id || '')
        setTimeSignature(song.timeSignature)
        setSubdivision(song.subdivision)
        setBpm(song.bpm)
        const meter = getMeter(song.timeSignature)
        setBeatAccents(normalizeBeatAccents(meter, song.beatAccents))
      },
      createSetlist: ({ name }) => {
        if (!authedUserId || isAnonymous) setGuestSyncPrompt('Create a permanent account to sync your data across devices.')
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const sl = { id, name, songIds: [] }
        setSetlists((prev) => {
          const next = [sl, ...prev]
          schedulePersist(songs, next)
          return next
        })
        setActiveSetlistId(id)
        return id
      },
      addSongToSetlist: ({ setlistId, songId }) => {
        if (!authedUserId || isAnonymous) setGuestSyncPrompt('Create a permanent account to sync your data across devices.')
        setSetlists((prev) => {
          const next = prev.map((s) =>
            s.id !== setlistId
              ? s
              : { ...s, songIds: [...s.songIds.filter((x) => x !== songId), songId] },
          )
          schedulePersist(songs, next)
          return next
        })
      },
    },
    auth: {
      isAnonymous,
    },
    events: {
      onScheduledBeat,
      onScheduledPulse,
    },
    audioClock: {
      getAudioTime,
      getNextPulseTime,
      getPulseIndex,
      getSecondsPerPulse,
    },
    audio: {
      // Best-effort: create context, prime the mix bus, resume() — all synchronously (use from
      // onPointerDown / touchstart before play on iOS Safari & standalone web app).
      ensure: ensureUserGestureAudio,
    },

    rhythmTrainer: {
      enabled: trainerEnabled,
      mode: trainerMode,
      startBpm: trainerStartBpm,
      targetBpm: trainerTargetBpm,
      durationSeconds: trainerDurationSeconds,
      durationBars: trainerDurationBars,
      barsPerStep: trainerBarsPerStep,
      elapsedTime: trainerElapsedTime,
      barsElapsed: trainerBarsElapsed,
      configure: configureTrainer,
      start: startTrainer,
      stop: stopTrainer,
    },
  }
}

