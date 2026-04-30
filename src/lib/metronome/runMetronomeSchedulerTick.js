import {
  BPM_MAX,
  clampBpmFloat,
  createWoodblockAt,
  getMetronomeOutputNode,
  secondsPerQuarter,
} from './engine.js'

/**
 * One lookahead scheduling iteration: practice stats, trainer, pulse loop, automator,
 * internal clock, polyrhythm layer. Invoked on `setInterval` from the metronome hook.
 */
export function runMetronomeSchedulerTick(env) {
  const {
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
  } = env

  if (!isPlayingRef.current) return
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
      setTrainerElapsedTime(elapsed)

      const everySec = Math.max(0.1, Number(tr.everySeconds) || 0.1)
      const increment = Math.max(0.5, Number(tr.incrementBpm) || 0.5)
      const stepsSoFar = Math.floor(elapsed / everySec)

      if (!tr.targetEnabled) {
        while (tr.lastAppliedStepIndex < stepsSoFar) {
          tr.lastAppliedStepIndex += 1
          const next = clampBpmFloat(bpmRef.current + increment)
          const capped = Math.min(BPM_MAX, next)
          applyBpm(capped, { resync: true })
          if (capped >= BPM_MAX) {
            tr.enabled = false
            setTrainerEnabled(false)
            break
          }
        }
      } else {
        const rawDir = tr.targetBpm - tr.startBpm
        const dir = rawDir > 0 ? 1 : rawDir < 0 ? -1 : 0

        if (dir === 0) {
          tr.enabled = false
          setTrainerEnabled(false)
        } else {
          while (tr.lastAppliedStepIndex < stepsSoFar) {
            tr.lastAppliedStepIndex += 1
            const rawNext = tr.startBpm + dir * increment * tr.lastAppliedStepIndex
            const next = dir > 0 ? Math.min(rawNext, tr.targetBpm) : Math.max(rawNext, tr.targetBpm)
            applyBpm(next, { resync: true })
            if ((dir > 0 && next >= tr.targetBpm) || (dir < 0 && next <= tr.targetBpm)) {
              tr.enabled = false
              setTrainerEnabled(false)
              break
            }
          }
        }
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
        if (automatorRef.current.barsElapsed !== 0) {
          automatorRef.current.barsElapsed = 0
          automatorRef.current.startedAtBar = null
          automatorRef.current.lastAppliedAtBar = null
          setAutomatorBarsElapsed(0)
        }
      }
    }

    const ic = internalClockRef.current
    if (ic.enabled && pulseIndex === 0) {
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

        const everyBars = Math.max(1, Math.floor(Number(tr2.everyBars) || 1))
        const increment = Math.max(0.5, Number(tr2.incrementBpm) || 0.5)

        if (!tr2.targetEnabled) {
          if (tr2.lastAppliedAtBar == null) {
            tr2.lastAppliedAtBar = tr2.barsElapsed
            applyBpm(tr2.startBpm, { resync: true })
          } else {
            const barsSince = tr2.barsElapsed - tr2.lastAppliedAtBar
            if (barsSince >= everyBars) {
              const next = clampBpmFloat(bpmRef.current + increment)
              const capped = Math.min(BPM_MAX, next)
              applyBpm(capped, { resync: true })
              tr2.lastAppliedAtBar = tr2.barsElapsed
              if (capped >= BPM_MAX) {
                tr2.enabled = false
                setTrainerEnabled(false)
              }
            }
          }
        } else {
          const rawDir = tr2.targetBpm - tr2.startBpm
          const dir = rawDir > 0 ? 1 : rawDir < 0 ? -1 : 0

          if (dir === 0) {
            tr2.enabled = false
            setTrainerEnabled(false)
          } else if (tr2.lastAppliedAtBar == null) {
            tr2.lastAppliedAtBar = tr2.barsElapsed
            applyBpm(tr2.startBpm, { resync: true })
          } else {
            const barsSince = tr2.barsElapsed - tr2.lastAppliedAtBar
            if (barsSince >= everyBars) {
              const next = clampBpmFloat(bpmRef.current + dir * increment)
              const done = dir > 0 ? next >= tr2.targetBpm : next <= tr2.targetBpm
              applyBpm(done ? tr2.targetBpm : next, { resync: true })
              tr2.lastAppliedAtBar = tr2.barsElapsed
              if (done) {
                tr2.enabled = false
                setTrainerEnabled(false)
              }
            }
          }
        }
      }
    }

    const nextPulse = (pulseIndex + 1) % meter.numerator
    pulseIndexRef.current = nextPulse
    setPulse(nextPulse + 1)

    nextPulseTimeRef.current += secondsPerPulse
  }

  const poly = polyRef.current
  if (poly.enabled) {
    const mainBeats = Math.max(1, Math.floor(Number(poly.mainBeats) || 1))
    const polyBeats = Math.max(1, Math.floor(Number(poly.polyBeats) || 1))
    const polyStepSeconds = secondsPerQuarter(bpmRef.current) * (mainBeats / polyBeats)

    while (nextPolyTimeRef.current < now + scheduleAheadSeconds) {
      const gapMuted = internalClockRef.current.enabled && internalClockRef.current.isMuted
      if (!gapMuted) {
        const output = getMetronomeOutputNode(ctx, pannerRef.current)
        createWoodblockAt(ctx, nextPolyTimeRef.current, output, {
          frequency: 2200,
          volume: 0.55,
        })
      }
      polyIndexRef.current = (polyIndexRef.current + 1) % polyBeats
      nextPolyTimeRef.current += polyStepSeconds
    }
  }
}
