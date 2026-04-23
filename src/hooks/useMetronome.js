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

/**
 * Seconds Per Beat = 60 / BPM
 * (Here, "beat" means a quarter note; other denominators scale from that.)
 */
function secondsPerQuarter(bpm) {
  return 60 / bpm
}

function getMeter(timeSignature) {
  if (timeSignature === '7/8') {
    return { numerator: 7, denominator: 8, accentPulses: new Set([0, 2, 4]) } // 2+2+3
  }
  return { numerator: 4, denominator: 4, accentPulses: new Set([0]) }
}

function getSubdivisionFactor(subdivision) {
  switch (subdivision) {
    case 'eighth':
      return 2
    case 'triplet':
      return 3
    case 'quarter':
    default:
      return 1
  }
}

function createBeepAt(ctx, when, { frequency, duration, volume }) {
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
  gain.connect(ctx.destination)

  osc.start(when)
  osc.stop(when + duration + 0.02)
}

function createVoiceAt(ctx, when, buffer, { volume }) {
  if (!buffer) return
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buffer
  gain.gain.setValueAtTime(volume, when)
  src.connect(gain)
  gain.connect(ctx.destination)
  src.start(when)
  src.stop(when + Math.min(2.0, buffer.duration + 0.05))
}

function defaultBeatAccents(meter) {
  const arr = Array.from({ length: meter.numerator }, () => 'normal')
  if (arr.length) arr[0] = 'accented'
  return arr
}

function normalizeBeatAccents(meter, maybeArr) {
  const allowed = new Set(['accented', 'normal', 'subdued', 'muted'])
  const base = Array.isArray(maybeArr) ? maybeArr : []
  const next = Array.from({ length: meter.numerator }, (_, i) => {
    const v = base[i]
    return allowed.has(v) ? v : 'normal'
  })
  if (next.length) next[0] = allowed.has(next[0]) ? next[0] : 'accented'
  return next
}

function getAccentParams(level, { isSubdivision }) {
  switch (level) {
    case 'muted':
      return { muted: true }
    case 'subdued':
      return {
        muted: false,
        downbeatVolume: isSubdivision ? 0.08 : 0.12,
        beatVolume: isSubdivision ? 0.06 : 0.1,
        subVolume: 0.05,
        downbeatFreq: 880,
        beatFreq: 660,
        subFreq: 520,
      }
    case 'accented':
      return {
        muted: false,
        downbeatVolume: isSubdivision ? 0.22 : 0.3,
        beatVolume: isSubdivision ? 0.18 : 0.22,
        subVolume: 0.14,
        downbeatFreq: 1320,
        beatFreq: 880,
        subFreq: 660,
      }
    case 'normal':
    default:
      return {
        muted: false,
        downbeatVolume: isSubdivision ? 0.16 : 0.22,
        beatVolume: isSubdivision ? 0.14 : 0.18,
        subVolume: 0.12,
        downbeatFreq: 1100,
        beatFreq: 800,
        subFreq: 660,
      }
  }
}

/**
 * Web Audio metronome with lookahead scheduling.
 *
 * Supports:
 * - BPM range 1-400
 * - Regular 4/4 and irregular 7/8 (2+2+3 accents)
 * - Pulse counter (beats in the measure)
 * - Subdivisions: quarter, eighth, triplet
 */
export function useMetronome(options = {}) {
  const {
    initialBpm = 120,
    initialTimeSignature = '4/4',
    initialSubdivision = 'quarter',
    lookaheadMs = 25,
    scheduleAheadSeconds = 0.1,
  } = options

  const [bpm, _setBpm] = useState(() => clampBpm(initialBpm))
  const [timeSignature, _setTimeSignature] = useState(initialTimeSignature)
  const [subdivision, setSubdivision] = useState(initialSubdivision)
  const [isPlaying, setIsPlaying] = useState(false)
  const [pulse, setPulse] = useState(0)

  const [sound, setSound] = useState('beep') // 'beep' | 'voice'

  const [beatAccents, setBeatAccents] = useState(() =>
    defaultBeatAccents(getMeter(initialTimeSignature)),
  )

  const [internalClockEnabled, setInternalClockEnabled] = useState(false)
  const [internalClockPlayBars, setInternalClockPlayBars] = useState(4) // X
  const [internalClockMuteBars, setInternalClockMuteBars] = useState(4) // Y
  const [internalClockIsMuted, setInternalClockIsMuted] = useState(false)
  const [internalClockBarsInPhase, setInternalClockBarsInPhase] = useState(0)

  const [practiceTotalSeconds, setPracticeTotalSeconds] = useState(0)
  const [practiceAverageBpm, setPracticeAverageBpm] = useState(0)

  const auth = useContext(AuthContext)
  const authedUserId = auth?.user?.id ?? null

  const STORAGE_SONGS = 'metronome.songs.v1'
  const STORAGE_SETLISTS = 'metronome.setlists.v1'

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

  const ctxRef = useRef(null)
  const timerIdRef = useRef(null)
  const schedulerTickRef = useRef(() => {})
  const nextPulseTimeRef = useRef(0)
  const pulseIndexRef = useRef(0)
  const bpmRef = useRef(bpm)
  const meterRef = useRef(getMeter(timeSignature))
  const subdivisionRef = useRef(subdivision)
  const soundRef = useRef(sound)
  const beatAccentsRef = useRef(beatAccents)
  const voiceBuffersRef = useRef({ status: 'idle', buffers: {} })
  const internalClockRef = useRef({
    enabled: false,
    playBars: 4,
    muteBars: 4,
    isMuted: false,
    barsInPhase: 0,
  })
  const practiceRef = useRef({
    lastAudioTime: null,
    totalSeconds: 0,
    bpmSecondsSum: 0,
  })
  const beatListenersRef = useRef(new Set())

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

  const setTimeSignature = useCallback((next) => {
    _setTimeSignature(next)
    const m = getMeter(next)
    setBeatAccents((prev) => {
      const trimmed = prev.slice(0, m.numerator)
      while (trimmed.length < m.numerator) trimmed.push('normal')
      if (trimmed.length && !prev.length) trimmed[0] = 'accented'
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

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioContextCtor()
    }
    if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const loadVoiceSamples = useCallback(async () => {
    const ctx = await ensureContext()
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
    setBeatAccents((prev) => {
      const next = prev.slice()
      if (beatIndex < 0 || beatIndex >= next.length) return prev
      next[beatIndex] = level
      return next
    })
  }, [])

  const cycleBeatAccent = useCallback((beatIndex) => {
    const order = ['accented', 'normal', 'subdued', 'muted']
    setBeatAccents((prev) => {
      const next = prev.slice()
      if (beatIndex < 0 || beatIndex >= next.length) return prev
      const cur = next[beatIndex] || 'normal'
      const idx = order.indexOf(cur)
      next[beatIndex] = order[(idx + 1) % order.length]
      return next
    })
  }, [])

  const schedulePulse = useCallback((ctx, pulseStartTime, pulseIndex, meter) => {
    if (internalClockRef.current.enabled && internalClockRef.current.isMuted) return

    const spq = secondsPerQuarter(bpmRef.current)
    const secondsPerPulse = spq * (4 / meter.denominator)

    const factor = getSubdivisionFactor(subdivisionRef.current)
    const step = secondsPerPulse / factor

    const accentLevel = beatAccentsRef.current[pulseIndex] || (pulseIndex === 0 ? 'accented' : 'normal')
    const isSubdivision = factor > 1
    const params = getAccentParams(accentLevel, { isSubdivision })
    if (params.muted) return

    const isAccentedPulse = accentLevel === 'accented' || meter.accentPulses.has(pulseIndex)
    const isVoice = soundRef.current === 'voice'
    const whenPrimary = pulseStartTime
    const pulseNumber = pulseIndex + 1
    const secondsPerBeat = 60 / bpmRef.current

    for (let i = 0; i < factor; i += 1) {
      const when = pulseStartTime + i * step
      const isDownbeat = i === 0 && isAccentedPulse

      if (isVoice) {
        if (i !== 0) continue
        const n = pulseIndex + 1
        const buf = voiceBuffersRef.current.buffers?.[n]
        if (buf) {
          createVoiceAt(ctx, when, buf, { volume: isDownbeat ? 0.9 : 0.75 })
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

      const isPrimary = i === 0
      const frequency = isDownbeat
        ? params.downbeatFreq
        : isPrimary
          ? params.beatFreq
          : params.subFreq
      const volume = isDownbeat
        ? params.downbeatVolume
        : isPrimary
          ? params.beatVolume
          : params.subVolume

      createBeepAt(ctx, when, {
        frequency,
        duration: isPrimary ? 0.03 : 0.02,
        volume,
      })
    }

    // Notify listeners once per (primary) beat, using the scheduled audio time.
    // This is intended for external systems (haptics, lockscreen controls, etc.).
    for (const cb of beatListenersRef.current) {
      try {
        cb({
          when: whenPrimary,
          pulseIndex,
          pulseNumber,
          isDownbeat: isAccentedPulse,
          bpm: bpmRef.current,
          secondsPerBeat,
          secondsPerPulse,
          timeSignature: `${meter.numerator}/${meter.denominator}`,
          subdivision: subdivisionRef.current,
          sound: soundRef.current,
          accent: accentLevel,
        })
      } catch {
        // ignore listener errors
      }
    }
  }, [])

  const readGuestData = useCallback(() => {
    let nextSongs
    let nextSetlists
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
    return {
      songs: Array.isArray(nextSongs) ? nextSongs : [],
      setlists: Array.isArray(nextSetlists) ? nextSetlists : [],
    }
  }, [])

  const persistGuestData = useCallback((nextSongs, nextSetlists) => {
    localStorage.setItem(STORAGE_SONGS, JSON.stringify(nextSongs))
    localStorage.setItem(STORAGE_SETLISTS, JSON.stringify(nextSetlists))
  }, [])

  const persistAuthedData = useCallback(
    async (nextSongs, nextSetlists) => {
      if (!authedUserId) return
      const payload = {
        songs: nextSongs,
        setlists: nextSetlists,
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
          persistGuestData(nextSongs, nextSetlists)
        }
      }, 400)
    },
    [authedUserId, persistAuthedData, persistGuestData],
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

      // Internal Clock (Auto-Mute): advance on downbeats.
      const ic = internalClockRef.current
      if (ic.enabled && pulseIndex === 0) {
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
  }, [applyBpm, scheduleAheadSeconds, schedulePulse])

  useEffect(() => {
    schedulerTickRef.current = schedulerTick
  }, [schedulerTick])

  const start = useCallback(async () => {
    if (isPlaying) return
    const ctx = await ensureContext()

    const meter = getMeter(timeSignature)
    meterRef.current = meter
    subdivisionRef.current = subdivision

    pulseIndexRef.current = 0
    nextPulseTimeRef.current = ctx.currentTime + 0.05
    setPulse(1)

    // Start / resume practice history accumulation for this session run.
    practiceRef.current.lastAudioTime = ctx.currentTime

    if (soundRef.current === 'voice') {
      await loadVoiceSamples()
    }

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

    timerIdRef.current = window.setInterval(schedulerTick, lookaheadMs)
    setIsPlaying(true)
  }, [
    applyBpm,
    ensureContext,
    isPlaying,
    loadVoiceSamples,
    lookaheadMs,
    schedulerTick,
    subdivision,
    timeSignature,
  ])

  const stop = useCallback(() => {
    if (timerIdRef.current) {
      window.clearInterval(timerIdRef.current)
      timerIdRef.current = null
    }
    setIsPlaying(false)
    setPulse(0)
    pulseIndexRef.current = 0

    // Stop practice accumulation (but keep totals for the session).
    practiceRef.current.lastAudioTime = null
  }, [])

  // Periodically sync practice stats while logged in (throttled).
  useEffect(() => {
    if (!authedUserId) return
    const id = window.setTimeout(() => {
      schedulePersist(songs, setlists)
    }, 1500)
    return () => window.clearTimeout(id)
  }, [authedUserId, practiceTotalSeconds, schedulePersist, setlists, songs])

  const toggle = useCallback(() => {
    if (isPlaying) stop()
    else start()
  }, [isPlaying, start, stop])

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
    start,
    stop,
    toggle,
    pulse,
    pulsesPerMeasure: meter.numerator,
    sound,
    setSound,
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
      setEnabled: (v) => {
        const next = Boolean(v)
        setInternalClockEnabled(next)
        internalClockRef.current.enabled = next
        if (!next) {
          internalClockRef.current.isMuted = false
          internalClockRef.current.barsInPhase = 0
          setInternalClockIsMuted(false)
          setInternalClockBarsInPhase(0)
        }
      },
      setPlayBars: (v) => setInternalClockPlayBars(v),
      setMuteBars: (v) => setInternalClockMuteBars(v),
      reset: () => {
        internalClockRef.current.isMuted = false
        internalClockRef.current.barsInPhase = 0
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
        if (!authedUserId) setGuestSyncPrompt('Create an account to sync data.')
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
        if (!authedUserId) setGuestSyncPrompt('Create an account to sync data.')
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
        if (!authedUserId) setGuestSyncPrompt('Create an account to sync data.')
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
    events: {
      onScheduledBeat,
    },
    audioClock: {
      getAudioTime,
      getNextPulseTime,
      getPulseIndex,
      getSecondsPerPulse,
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

