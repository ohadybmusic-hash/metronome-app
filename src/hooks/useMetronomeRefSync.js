import { useEffect } from 'react'
import { clampBpmFloat, getMeter } from '../lib/metronome/engine.js'

/**
 * Keeps metronome scheduler refs in sync with React state (single effect; same outcome as
 * the previous N separate `useEffect`s on each field).
 */
export function useMetronomeRefSync({
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
}) {
  useEffect(() => {
    bpmRef.current = bpm
    meterRef.current = getMeter(timeSignature)
    subdivisionRef.current = subdivision
    soundRef.current = sound
    beatAccentsRef.current = beatAccents
    hapticsEnabledRef.current = hapticsEnabled

    internalClockRef.current.enabled = internalClockEnabled
    internalClockRef.current.playBars = Math.max(1, Math.floor(Number(internalClockPlayBars) || 1))
    internalClockRef.current.muteBars = Math.max(0, Math.floor(Number(internalClockMuteBars) || 0))
    internalClockRef.current.isMuted = internalClockIsMuted
    internalClockRef.current.barsInPhase = internalClockBarsInPhase
    internalClockRef.current.introEnabled = Boolean(internalClockIntroEnabled)

    automatorRef.current.enabled = Boolean(automatorEnabled)
    automatorRef.current.startBpm = clampBpmFloat(automatorStartBpm)
    automatorRef.current.targetBpm = clampBpmFloat(automatorTargetBpm)
    automatorRef.current.increment = clampBpmFloat(automatorIncrementBpm || 1)
    automatorRef.current.everyBars = Math.max(1, Math.floor(Number(automatorChangeEveryBars) || 1))

    polyRef.current.enabled = Boolean(polyrhythmEnabled)
    polyRef.current.mainBeats = Math.max(1, Math.floor(Number(polyrhythmMainBeats) || 1))
    polyRef.current.polyBeats = Math.max(1, Math.floor(Number(polyrhythmPolyBeats) || 1))

    isPlayingRef.current = isPlaying
  }, [
    bpm,
    timeSignature,
    subdivision,
    sound,
    beatAccents,
    hapticsEnabled,
    internalClockEnabled,
    internalClockPlayBars,
    internalClockMuteBars,
    internalClockIsMuted,
    internalClockBarsInPhase,
    internalClockIntroEnabled,
    automatorEnabled,
    automatorStartBpm,
    automatorTargetBpm,
    automatorIncrementBpm,
    automatorChangeEveryBars,
    polyrhythmEnabled,
    polyrhythmMainBeats,
    polyrhythmPolyBeats,
    isPlaying,
  ])
}
