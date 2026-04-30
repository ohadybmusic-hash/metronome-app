import { clampBpm, clampBpmFloat } from './engine.js'

/** Push trainer field updates into ref + React state (rhythm/tempo trainer UI). */
export function applyMetronomeTrainerConfig(
  config = {},
  {
    trainerRef,
    setTrainerEnabled,
    setTrainerMode,
    setTrainerStartBpm,
    setTrainerTargetBpm,
    setTrainerTargetEnabled,
    setTrainerIncrementBpm,
    setTrainerEveryBars,
    setTrainerEverySeconds,
  },
) {
  const cur = trainerRef.current
  const nextEveryBars =
    config.everyBars != null
      ? Math.max(1, Math.floor(Number(config.everyBars) || 1))
      : config.barsPerStep != null
        ? Math.max(1, Math.floor(Number(config.barsPerStep) || 1))
        : cur.everyBars
  const nextEverySeconds =
    config.everySeconds != null
      ? Math.max(0.1, Number(config.everySeconds) || 0.1)
      : config.durationSeconds != null
        ? Math.max(0.1, Number(config.durationSeconds) || 0.1)
        : cur.everySeconds

  const next = {
    enabled: config.enabled ?? cur.enabled,
    mode: config.mode ?? cur.mode,
    startBpm: config.startBpm != null ? clampBpmFloat(config.startBpm) : cur.startBpm,
    targetBpm: config.targetBpm != null ? clampBpmFloat(config.targetBpm) : cur.targetBpm,
    targetEnabled:
      config.targetEnabled != null ? Boolean(config.targetEnabled) : Boolean(cur.targetEnabled ?? false),
    incrementBpm:
      config.incrementBpm != null ? Math.max(0.5, Number(config.incrementBpm) || 0.5) : cur.incrementBpm,
    everyBars: nextEveryBars,
    everySeconds: nextEverySeconds,
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
  setTrainerTargetEnabled(Boolean(next.targetEnabled))
  setTrainerIncrementBpm(next.incrementBpm)
  setTrainerEveryBars(next.everyBars)
  setTrainerEverySeconds(next.everySeconds)
}

/** Start trainer from UI: apply config, reset runtime, apply BPM to engine. */
export function startMetronomeTrainerRun(
  config = {},
  {
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
  },
) {
  applyMetronomeTrainerConfig(
    { ...config, enabled: true },
    {
      trainerRef,
      setTrainerEnabled,
      setTrainerMode,
      setTrainerStartBpm,
      setTrainerTargetBpm,
      setTrainerTargetEnabled,
      setTrainerIncrementBpm,
      setTrainerEveryBars,
      setTrainerEverySeconds,
    },
  )
  const tr = trainerRef.current
  tr.enabled = true
  tr.mode = config.mode ?? tr.mode
  tr.startBpm = config.startBpm != null ? clampBpmFloat(config.startBpm) : tr.startBpm
  tr.targetBpm = config.targetBpm != null ? clampBpmFloat(config.targetBpm) : tr.targetBpm
  if (config.targetEnabled != null) tr.targetEnabled = Boolean(config.targetEnabled)
  if (config.incrementBpm != null) tr.incrementBpm = Math.max(0.5, Number(config.incrementBpm) || 0.5)
  if (config.everySeconds != null) tr.everySeconds = Math.max(0.1, Number(config.everySeconds) || 0.1)
  if (config.everyBars != null) tr.everyBars = Math.max(1, Math.floor(Number(config.everyBars) || 1))
  if (config.barsPerStep != null) tr.everyBars = Math.max(1, Math.floor(Number(config.barsPerStep) || 1))

  tr.startedAtAudioTime = ctxRef.current ? ctxRef.current.currentTime : null
  tr.lastAppliedStepIndex = 0
  tr.lastAppliedAtBar = null
  tr.barsElapsed = 0
  setTrainerElapsedTime(0)
  setTrainerBarsElapsed(0)

  applyBpm(tr.startBpm, { resync: true })
}

export function stopMetronomeTrainerRun(trainerRef, setTrainerEnabled) {
  trainerRef.current.enabled = false
  trainerRef.current.startedAtAudioTime = null
  setTrainerEnabled(false)
}
