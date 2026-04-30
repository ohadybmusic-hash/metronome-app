import { clampBpm } from './engine.js'
import { getMetronomePresetsHandlers } from './metronomePresetsApi.js'

/** Assembles the public `useMetronome` return object (one call per render, same as inline return). */
export function buildMetronomeHookReturn(p) {
  const {
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
    meterNumerator,
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
    setInternalClockIsMuted,
    setInternalClockBarsInPhase,
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
  } = p

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
    syncAudioAfterInterruption,
    pulse,
    pulsesPerMeasure: meterNumerator,
    sound,
    setSound,
    haptics: {
      enabled: hapticsEnabled,
      setEnabled: (v) => {
        const b = Boolean(v)
        hapticsEnabledRef.current = b
        setHapticsEnabled(b)
      },
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
      ...getMetronomePresetsHandlers({
        authedUserId,
        isAnonymous,
        beatAccentsRef,
        synthApplierRef,
        songs,
        setlists,
        setSongs,
        setSetlists,
        setActiveSongId,
        setActiveSetlistId,
        setGuestSyncPrompt,
        setTimeSignature,
        setSubdivision,
        setBpm,
        setBeatAccents,
        schedulePersist,
      }),
    },
    auth: {
      isAnonymous,
    },
    events: metEvents,
    audioClock: metAudioClock,
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
      targetEnabled: trainerTargetEnabled,
      incrementBpm: trainerIncrementBpm,
      everySeconds: trainerEverySeconds,
      everyBars: trainerEveryBars,
      /** @deprecated Use everyBars */
      barsPerStep: trainerEveryBars,
      elapsedTime: trainerElapsedTime,
      barsElapsed: trainerBarsElapsed,
      configure: configureTrainer,
      start: startTrainer,
      stop: stopTrainer,
    },
    /** Queue a throttled persist of songs/setlists + practice + exercise log to user_data. */
    scheduleUserDataSync,
  }
}
