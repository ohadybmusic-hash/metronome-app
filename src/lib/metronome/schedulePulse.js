import {
  createBeepAt,
  createVoiceAt,
  createWoodblockAt,
  getAccentMultiplier,
  getAccentTimbre,
  getMetronomeOutputNode,
  getSubdivisionFactor,
  scheduleCountSpeech,
  secondsPerQuarter,
} from './engine.js'

/**
 * Schedules one measure pulse and its subdivisions (beep, voice, haptics, listener callbacks).
 * Refs are read at scheduling time via `.current` (same as the original `useMetronome` closure).
 */
export function scheduleMetronomePulse(
  ctx,
  pulseStartTime,
  pulseIndex,
  meter,
  {
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
  },
) {
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
      const countSlot = secondsPerPulse
      if (buf) {
        createVoiceAt(ctx, when, output, buf, {
          volume: isDownbeat ? 1 : 0.88,
          maxSlotSeconds: countSlot,
        })
      } else {
        const twoDigit = n >= 10
        scheduleCountSpeech(ctx, when, String(n), {
          volume: isDownbeat ? 1.0 : 0.9,
          pitch: 1.0,
          slotSeconds: countSlot,
          treatAsLongSyllable: twoDigit,
        })
      }
      continue
    }

    if (isVoiceCount) {
      if (i !== 0) continue
      if (gapMuted) continue
      const beatNum = pulseIndex + 1
      const sampleN = beatNum === 1 ? 1 : beatNum >= 2 && beatNum <= 4 ? beatNum : null
      const buf = sampleN ? countBuffersRef.current.buffers?.[sampleN] : null
      const countSlot = secondsPerPulse
      if (buf) {
        createVoiceAt(ctx, when, output, buf, {
          volume: beatNum === 1 ? 1 : 0.92,
          maxSlotSeconds: countSlot,
        })
      } else {
        const text = beatNum === 1 ? 'One' : String(beatNum)
        scheduleCountSpeech(ctx, when, text, {
          volume: beatNum === 1 ? 1.0 : 0.9,
          pitch: 1.1,
          slotSeconds: countSlot,
          treatAsLongSyllable: beatNum === 1 || beatNum >= 10,
        })
      }
      continue
    }

    if (gapMuted) continue
    const mul = isPrimary ? beatMul : 1.0
    if (mul <= 0) continue

    const timbre = getAccentTimbre(isPrimary ? beatAccentLevel : 'NORMAL')
    const frequency = isDownbeat ? 1200 : timbre.freq
    const baseVolume = isDownbeat ? 0.9 : isPrimary ? 0.75 : 0.52
    const volume = Math.min(1, baseVolume * mul)

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
}
