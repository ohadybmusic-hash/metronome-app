import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from '../context/AuthProvider.jsx'
import {
  clampBpm,
  clampBpmFloat,
  defaultBeatAccents,
  getMeter,
  normalizeBeatAccents,
  secondsPerQuarter,
} from '../lib/metronome/engine.js'
import {
  getBootstrapStateForGuest,
  getBootstrapStateFromUserDataContent,
} from '../lib/metronome/metronomeBootstrapState.js'
import { writeGuestMetronomeData } from '../lib/metronome/guestData.js'
import { upsertMetronomeUserData } from '../lib/metronome/persistUserData.js'
import { scheduleMetronomePulse } from '../lib/metronome/schedulePulse.js'
import { runMetronomeSchedulerTick } from '../lib/metronome/runMetronomeSchedulerTick.js'
import { fetchUserMetronomeDataRow } from '../lib/metronome/fetchUserMetronomeData.js'
import { readMetronomeBootstrapFromUserDataCache, writeUserDataContentCache } from '../lib/metronome/userDataLocalCache.js'
import { bindMetronomeMediaSession } from '../lib/metronome/metronomeMediaSession.js'
import { runMetronomeStop } from '../lib/metronome/runMetronomeStop.js'
import { buildMetronomeHookReturn } from '../lib/metronome/metronomeHookReturn.js'
import { ensureMetronomeCountSamples, loadMetronomeVoiceNumberWavs } from '../lib/metronome/metronomeSampleBuffers.js'
import {
  applyMetronomeTrainerConfig,
  startMetronomeTrainerRun,
  stopMetronomeTrainerRun,
} from '../lib/metronome/metronomeTrainer.js'
import { startMetronomeFromUserGesture } from '../lib/metronome/startMetronomeFromUserGesture.js'
import {
  ensureMetronomeAudioContext,
  runEnsureMetronomeUserGestureAudio,
} from '../lib/metronome/userGestureAudio.js'
import { normalizeExerciseProgressPayload } from '../lib/metronome/userDataPayload.js'
import { userHasVisiblePracticeSheetLibrary } from '../lib/practicePdfCategories.js'
import { useMetronomeAudioUnmount } from './useMetronomeAudioUnmount.js'
import { useMetronomeRefSync } from './useMetronomeRefSync.js'
import { useMetronomeInterruptionResync } from './useMetronomeInterruptionResync.js'
import { useMetronomeScreenWakeLock } from './useMetronomeScreenWakeLock.js'

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
    /**
     * Optional ref with `.current = (synthSnapshot) => void` to apply a synth-lab JSON snapshot
     * when the user loads a metronome song that includes `synthSnapshot`.
     * Set from App; must be stable (same object identity).
     */
    synthApplierRef: synthApplierRefOption,
    /** Ref snapshot for `user_data.data.exerciseProgress` (Practice log). */
    exerciseProgressRef: exerciseProgressRefOption,
    /** Called after loading `user_data` with normalized exercise payload (signed-in only). */
    onExerciseProgressLoaded: onExerciseProgressLoadedOption,
  } = options

  const synthApplierRef = synthApplierRefOption ?? { current: null }
  const exerciseProgressRef = exerciseProgressRefOption ?? {
    current: {
      entries: [],
      customExerciseNames: [],
      sheetsByExercise: {},
      customExercisePlacements: {},
    },
  }

  const [bpm, _setBpm] = useState(() => clampBpm(initialBpm))
  const [timeSignature, _setTimeSignature] = useState(initialTimeSignature)
  const [subdivision, setSubdivision] = useState(initialSubdivision)
  const [isPlaying, setIsPlaying] = useState(false)
  const isPlayingRef = useRef(false)
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
  const authedEmail = auth?.user?.email ?? null
  const practiceSheetLibraryAccess = useMemo(
    () => userHasVisiblePracticeSheetLibrary(authedEmail),
    [authedEmail],
  )
  const isAnonymous = Boolean(auth?.user?.is_anonymous)

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
  /** When false, tempo steps up by increment until 400 BPM (no target cap). */
  const [trainerTargetEnabled, setTrainerTargetEnabled] = useState(false)
  /** BPM added (or subtracted) per step. */
  const [trainerIncrementBpm, setTrainerIncrementBpm] = useState(1)
  /** Seconds mode: time between BPM steps. */
  const [trainerEverySeconds, setTrainerEverySeconds] = useState(5)
  /** Bars mode: downbeats between BPM steps. */
  const [trainerEveryBars, setTrainerEveryBars] = useState(1)
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
    targetEnabled: false,
    incrementBpm: 1,
    everySeconds: 5,
    everyBars: 1,
    startedAtAudioTime: null,
    /** Seconds mode: last completed step index (0 = at start BPM). */
    lastAppliedStepIndex: 0,
    /** Bars mode: bar count at last BPM change (see automator). */
    lastAppliedAtBar: null,
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

  useMetronomeRefSync({
    bpm,
    bpmRef,
    timeSignature,
    meterRef,
    subdivision,
    subdivisionRef,
    sound,
    soundRef,
    beatAccents,
    beatAccentsRef,
    hapticsEnabled,
    hapticsEnabledRef,
    internalClockEnabled,
    internalClockPlayBars,
    internalClockMuteBars,
    internalClockIsMuted,
    internalClockBarsInPhase,
    internalClockIntroEnabled,
    internalClockRef,
    automatorEnabled,
    automatorStartBpm,
    automatorTargetBpm,
    automatorIncrementBpm,
    automatorChangeEveryBars,
    automatorRef,
    polyrhythmEnabled,
    polyrhythmMainBeats,
    polyrhythmPolyBeats,
    polyRef,
    isPlaying,
    isPlayingRef,
  })

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
    if (!ctx || !isPlayingRef.current) return

    const now = ctx.currentTime
    nextPulseTimeRef.current = Math.max(now + 0.02, now)
    schedulerTickRef.current()
  }, [])

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

  const ensureContext = useCallback(
    () => ensureMetronomeAudioContext(getAudioContextOption, ctxRef, pannerRef, audioPrimedForCtxRef),
    [getAudioContextOption],
  )

  const ensureUserGestureAudio = useCallback(
    () =>
      runEnsureMetronomeUserGestureAudio(ensureContext, {
        pannerRef,
        audioPrimedForCtxRef,
        html5SilentAudioRef,
      }),
    [ensureContext],
  )

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
    await ensureMetronomeCountSamples(ctx, countBuffersRef)
  }, [ensureContext])

  const loadVoiceSamples = useCallback(async () => {
    const ctx = ensureContext()
    await loadMetronomeVoiceNumberWavs(ctx, voiceBuffersRef)
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
    scheduleMetronomePulse(ctx, pulseStartTime, pulseIndex, meter, {
      pannerRef,
      internalClockRef,
      bpmRef,
      subdivisionRef,
      beatAccentsRef,
      soundRef,
      pulseListenersRef,
      beatListenersRef,
      hapticsEnabledRef,
      voiceBuffersRef,
      countBuffersRef,
    })
  }, [])

  const persistAuthedData = useCallback(
    async (nextSongs, nextSetlists) => {
      if (!authedUserId) return
      await upsertMetronomeUserData({
        userId: authedUserId,
        songs: nextSongs,
        setlists: nextSetlists,
        activeSongId,
        activeSetlistId,
        streakCount,
        lastPracticeDate,
        practiceTotals: {
          totalSeconds: practiceRef.current.totalSeconds,
          bpmSecondsSum: practiceRef.current.bpmSecondsSum,
        },
        exerciseProgressSnapshot: practiceSheetLibraryAccess
          ? exerciseProgressRef?.current
          : {
              entries: [],
              customExerciseNames: [],
              sheetsByExercise: {},
              customExercisePlacements: {},
            },
      })
    },
    [
      authedUserId,
      activeSongId,
      activeSetlistId,
      streakCount,
      lastPracticeDate,
      exerciseProgressRef,
      practiceSheetLibraryAccess,
    ],
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
          writeGuestMetronomeData(nextSongs, nextSetlists, { activeSongId, activeSetlistId })
        }
      }, 400)
    },
    [activeSetlistId, activeSongId, authedUserId, persistAuthedData],
  )

  // Load data when auth changes: guest/cached SWR from localStorage in layout (before first paint), then revalidate.
  useLayoutEffect(() => {
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot guest + user_data cache hydration; async fetch state updates are in microtasks */
    if (!authedUserId) {
      userDataRowIdRef.current = null
      const g = getBootstrapStateForGuest()
      setSongs(g.songs)
      setSetlists(g.setlists)
      setActiveSongId(g.activeSongId)
      setActiveSetlistId(g.activeSetlistId)
      return
    }

    const cached = readMetronomeBootstrapFromUserDataCache(authedUserId)
    if (cached) {
      setSongs(cached.songs)
      setSetlists(cached.setlists)
      setActiveSongId(cached.activeSongId)
      setActiveSetlistId(cached.activeSetlistId)
      setStreakCount(cached.streakCount)
      setLastPracticeDate(cached.lastPracticeDate)
      onExerciseProgressLoadedOption?.(
        practiceSheetLibraryAccess
          ? normalizeExerciseProgressPayload(cached.exerciseProgressRaw)
          : normalizeExerciseProgressPayload(null),
      )
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    void (async function load() {
      const { data, error } = await fetchUserMetronomeDataRow(authedUserId)
      if (cancelled) return
      if (error) {
        if (!cached) {
          onExerciseProgressLoadedOption?.(normalizeExerciseProgressPayload(null))
        }
        return
      }

      userDataRowIdRef.current = data?.user_id ?? null
      const s = getBootstrapStateFromUserDataContent(data?.data)
      if (data?.data != null) {
        writeUserDataContentCache(authedUserId, data.data)
      }
      setSongs(s.songs)
      setSetlists(s.setlists)
      setActiveSongId(s.activeSongId)
      setActiveSetlistId(s.activeSetlistId)
      setStreakCount(s.streakCount)
      setLastPracticeDate(s.lastPracticeDate)

      onExerciseProgressLoadedOption?.(
        practiceSheetLibraryAccess
          ? normalizeExerciseProgressPayload(s.exerciseProgressRaw)
          : normalizeExerciseProgressPayload(null),
      )
    })()

    return () => {
      cancelled = true
    }
  }, [authedUserId, onExerciseProgressLoadedOption, practiceSheetLibraryAccess])

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }
  }, [])

  const schedulerTick = useCallback(() => {
    runMetronomeSchedulerTick({
      isPlayingRef,
      ctxRef,
      practiceRef,
      bpmRef,
      meterRef,
      trainerRef,
      nextPulseTimeRef,
      pulseIndexRef,
      automatorRef,
      internalClockRef,
      polyRef,
      nextPolyTimeRef,
      polyIndexRef,
      pannerRef,
      scheduleAheadSeconds,
      automatorBarsElapsed,
      applyBpm,
      schedulePulse,
      setPracticeTotalSeconds,
      setPracticeAverageBpm,
      setTrainerElapsedTime,
      setTrainerBarsElapsed,
      setTrainerEnabled,
      setAutomatorBarsElapsed,
      setAutomatorEnabled,
      setInternalClockIsMuted,
      setInternalClockBarsInPhase,
      setPulse,
    })
  }, [applyBpm, automatorBarsElapsed, scheduleAheadSeconds, schedulePulse])

  useEffect(() => {
    schedulerTickRef.current = schedulerTick
  }, [schedulerTick])

  const start = useCallback(() => {
    if (isPlayingRef.current) return
    // Unlock + prime in the same gesture, then start transport only once the context is actually
    // running. Fire-and-forget ctx.resume() is often still "suspended" for the first schedule;
    // the tuner path awaited resume() so it appeared to "fix" the metronome.
    const ctx = ensureUserGestureAudio()
    if (!ctx) return
    startMetronomeFromUserGesture({
      ctx,
      isPlayingRef,
      ensureUserGestureAudio,
      timeSignature,
      subdivision,
      meterRef,
      subdivisionRef,
      pannerRef,
      countInRef,
      countInEnabled,
      countInActive,
      bpmRef,
      pulseIndexRef,
      nextPulseTimeRef,
      polyIndexRef,
      nextPolyTimeRef,
      setPulse,
      practiceRef,
      practiceSessionRef,
      timerIdRef,
      schedulerTick,
      lookaheadMs,
      setIsPlaying,
      setCountInActive,
      setCountInBeatsRemaining,
      trainerRef,
      automatorRef,
      applyBpm,
      resyncSchedulingNow,
      soundRef,
      loadVoiceSamples,
      ensureCountSamples,
      setTrainerElapsedTime,
      setTrainerBarsElapsed,
      setAutomatorBarsElapsed,
    })
  }, [
    applyBpm,
    ensureUserGestureAudio,
    ensureCountSamples,
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
    runMetronomeStop({
      countInRef,
      setCountInActive,
      setCountInBeatsRemaining,
      timerIdRef,
      ctxRef,
      practiceSessionRef,
      authedUserId,
      bpmRef,
      lastPracticeDate,
      setStreakCount,
      setLastPracticeDate,
      isAnonymous,
      setGuestSyncPrompt,
      isPlayingRef,
      setIsPlaying,
      setPulse,
      pulseIndexRef,
      polyIndexRef,
      practiceRef,
    })
  }, [])

  // Media Session: show BPM on lock screen + allow play/pause controls.
  useEffect(() => {
    return bindMetronomeMediaSession(bpm, isPlaying, start, stop)
  }, [bpm, isPlaying, start, stop])

  // Periodically sync practice stats while logged in (throttled).
  useEffect(() => {
    if (!authedUserId) return
    const id = window.setTimeout(() => {
      schedulePersist(songs, setlists)
    }, 1500)
    return () => window.clearTimeout(id)
  }, [authedUserId, lastPracticeDate, practiceTotalSeconds, schedulePersist, setlists, songs, streakCount])

  const scheduleUserDataSync = useCallback(() => {
    schedulePersist(songs, setlists)
  }, [schedulePersist, songs, setlists])

  const toggle = useCallback(() => {
    if (isPlayingRef.current || countInRef.current.active) stop()
    else start()
  }, [start, stop])

  useMetronomeScreenWakeLock(isPlaying)

  const syncAudioAfterInterruption = useCallback(() => {
    ensureUserGestureAudio()
    const ctx = ctxRef.current
    const kickResync = () => {
      if (isPlayingRef.current) resyncSchedulingNow()
    }
    if (!ctx) {
      kickResync()
      return
    }
    const { state } = ctx
    if (state === 'suspended' || state === 'interrupted') {
      const p = ctx.resume?.()
      if (p && typeof p.then === 'function') {
        void p.then(() => {
          requestAnimationFrame(() => {
            ensureUserGestureAudio()
            kickResync()
          })
        })
      } else {
        requestAnimationFrame(kickResync)
      }
    } else {
      requestAnimationFrame(kickResync)
    }
  }, [ensureUserGestureAudio, resyncSchedulingNow])

  useMetronomeInterruptionResync(syncAudioAfterInterruption)

  useMetronomeAudioUnmount({
    getAudioContext: getAudioContextOption,
    ctxRef,
    pannerRef,
    audioPrimedForCtxRef,
    timerIdRef,
    isPlayingRef,
    setIsPlaying,
  })

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

  // Stable object identities so metronome UI (flash, etc.) does not re-subscribe every render/beat.
  const metEvents = useMemo(
    () => ({ onScheduledBeat, onScheduledPulse }),
    [onScheduledBeat, onScheduledPulse],
  )
  const metAudioClock = useMemo(
    () => ({
      getAudioTime,
      getNextPulseTime,
      getPulseIndex,
      getSecondsPerPulse,
    }),
    [getAudioTime, getNextPulseTime, getPulseIndex, getSecondsPerPulse],
  )

  const configureTrainer = useCallback((config = {}) => {
    applyMetronomeTrainerConfig(config, {
      trainerRef,
      setTrainerEnabled,
      setTrainerMode,
      setTrainerStartBpm,
      setTrainerTargetBpm,
      setTrainerTargetEnabled,
      setTrainerIncrementBpm,
      setTrainerEveryBars,
      setTrainerEverySeconds,
    })
  }, [])

  const startTrainer = useCallback(
    (config = {}) => {
      startMetronomeTrainerRun(config, {
        trainerRef,
        ctxRef,
        applyBpm,
        setTrainerElapsedTime,
        setTrainerBarsElapsed,
        setTrainerEnabled,
        setTrainerMode,
        setTrainerStartBpm,
        setTrainerTargetBpm,
        setTrainerTargetEnabled,
        setTrainerIncrementBpm,
        setTrainerEveryBars,
        setTrainerEverySeconds,
      })
    },
    [applyBpm],
  )

  const stopTrainer = useCallback(() => {
    stopMetronomeTrainerRun(trainerRef, setTrainerEnabled)
  }, [])

  return buildMetronomeHookReturn({
    bpm,
    setBpm,
    timeSignature,
    setTimeSignature,
    subdivision,
    setSubdivision,
    isPlaying,
    countInEnabled,
    setCountInEnabled,
    countInActive,
    countInBeatsRemaining,
    start,
    stop,
    toggle,
    syncAudioAfterInterruption,
    pulse,
    meterNumerator: meter.numerator,
    sound,
    setSound,
    hapticsEnabled,
    hapticsEnabledRef,
    setHapticsEnabled,
    pan,
    setPan,
    polyrhythmEnabled,
    setPolyrhythmEnabled,
    polyrhythmMainBeats,
    setPolyrhythmMainBeats,
    polyrhythmPolyBeats,
    setPolyrhythmPolyBeats,
    automatorEnabled,
    setAutomatorEnabled,
    automatorStartBpm,
    setAutomatorStartBpm,
    automatorTargetBpm,
    setAutomatorTargetBpm,
    automatorIncrementBpm,
    setAutomatorIncrementBpm,
    automatorChangeEveryBars,
    setAutomatorChangeEveryBars,
    automatorBarsElapsed,
    beatAccents,
    setBeatAccentsArray,
    setBeatAccent,
    cycleBeatAccent,
    internalClockEnabled,
    setInternalClockEnabled,
    internalClockPlayBars,
    setInternalClockPlayBars,
    internalClockMuteBars,
    setInternalClockMuteBars,
    internalClockIsMuted,
    internalClockBarsInPhase,
    internalClockIntroEnabled,
    setInternalClockIntroEnabled,
    internalClockRef,
    setInternalClockIsMuted,
    setInternalClockBarsInPhase,
    practiceRef,
    practiceTotalSeconds,
    practiceAverageBpm,
    setPracticeTotalSeconds,
    setPracticeAverageBpm,
    streakCount,
    lastPracticeDate,
    songs,
    setlists,
    activeSongId,
    setActiveSongId,
    activeSetlistId,
    setActiveSetlistId,
    guestSyncPrompt,
    authedUserId,
    isAnonymous,
    beatAccentsRef,
    synthApplierRef,
    setSongs,
    setSetlists,
    setGuestSyncPrompt,
    schedulePersist,
    setBeatAccents,
    metEvents,
    metAudioClock,
    ensureUserGestureAudio,
    trainerEnabled,
    trainerMode,
    trainerStartBpm,
    trainerTargetBpm,
    trainerTargetEnabled,
    trainerIncrementBpm,
    trainerEverySeconds,
    trainerEveryBars,
    trainerElapsedTime,
    trainerBarsElapsed,
    configureTrainer,
    startTrainer,
    stopTrainer,
    scheduleUserDataSync,
  })
}

