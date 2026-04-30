import { createWoodblockAt, getMeter, getMetronomeOutputNode, secondsPerQuarter } from './engine.js'
import { clearCountInTimeoutsOnly } from './metronomeCountIn.js'

/**
 * Play/transport start from a user-gesture audio path: optional two-bar count-in,
 * then interval scheduling + optional async voice buffer warm-up.
 */
export function startMetronomeFromUserGesture({
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
}) {
  const meter = getMeter(timeSignature)
  meterRef.current = meter
  subdivisionRef.current = subdivision

  const output = getMetronomeOutputNode(ctx, pannerRef.current)

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
    isPlayingRef.current = true
    setIsPlaying(true)
  }

  const run = async () => {
    // Count-in: 2 bars of a distinct high-pitched woodblock BEFORE starting metronome + visualizers.
    if (countInEnabled && !countInActive && !countInRef.current.active) {
      // Cancel any previous stray timers.
      clearCountInTimeoutsOnly(countInRef)
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
        createWoodblockAt(ctx, when, output, { frequency: woodFreq, volume: 0.7 })
        const id = window.setTimeout(() => {
          setCountInBeatsRemaining((prev) => Math.max(0, prev - 1))
        }, Math.max(0, (when - ctx.currentTime) * 1000))
        countInRef.current.timeouts.add(id)
      }

      const endId = window.setTimeout(() => {
        countInRef.current.active = false
        clearCountInTimeoutsOnly(countInRef)
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
      tr.lastAppliedStepIndex = 0
      tr.lastAppliedAtBar = null
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
    isPlayingRef.current = true
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

  const kick = () => {
    void run()
  }

  if (ctx.state === 'running') {
    kick()
  } else {
    const p = ctx.resume?.()
    if (p && typeof p.then === 'function') {
      void p
        .then(() => {
          // iOS WebKit: state may flip in the next frame; re-prime and kick after rAF so the first
          // scheduled clicks aren’t in a “still suspended / invalid gesture” edge case.
          requestAnimationFrame(() => {
            ensureUserGestureAudio()
            kick()
          })
        })
        .catch(() => {
          requestAnimationFrame(() => {
            ensureUserGestureAudio()
            kick()
          })
        })
    } else {
      requestAnimationFrame(() => {
        ensureUserGestureAudio()
        kick()
      })
    }
  }
}
