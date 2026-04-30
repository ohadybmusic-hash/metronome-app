import { useEffect, useMemo, useRef, useState } from 'react'
import './Tuner.css'
import { clamp } from '../lib/clamp.js'
import {
  centsBetween,
  freqToNoteName,
  midiToFreq,
  noteNameToMidi,
  parabolicInterpolation,
} from '../lib/tuner/pitch.js'
import { TUNING_LIBRARY } from '../lib/tuner/tuningLibrary.js'
import { buildTuningTargets } from '../lib/tuner/tuningTargets.js'
import Stepper from './Stepper.jsx'
import { useScreenWakeLock } from '../hooks/useScreenWakeLock.js'

export default function Tuner({ getAudioContext } = {}) {
  const [refToneOn, setRefToneOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [frequency, setFrequency] = useState(null)
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState(null)
  const [referencePitch, setReferencePitch] = useState(440)
  const [tuningId, setTuningId] = useState('gtr-standard')
  const [strobeMode, setStrobeMode] = useState(true)

  useScreenWakeLock(listening || refToneOn)

  const audioRef = useRef({
    ctx: null,
    refOsc: null,
    refGain: null,
    micStream: null,
    analyser: null,
    source: null,
    rafId: null,
  })

  const tuning = useMemo(
    () => TUNING_LIBRARY.find((t) => t.id === tuningId) || TUNING_LIBRARY[0],
    [tuningId],
  )
  const isChromatic = tuning?.id === 'chromatic'
  const targets = useMemo(() => buildTuningTargets(tuning, referencePitch), [referencePitch, tuning])
  const note = useMemo(() => freqToNoteName(frequency, referencePitch), [frequency, referencePitch])

  const guidance = useMemo(() => {
    if (!frequency) return null
    if (isChromatic) {
      if (!note) return null
      return { index: 0, note: note.name, midi: note.midi, freq: note.targetFreq, cents: note.cents, abs: Math.abs(note.cents) }
    }
    if (!targets.length) return null
    let best = null
    for (let i = 0; i < targets.length; i += 1) {
      const t = targets[i]
      const cents = centsBetween(frequency, t.freq)
      const abs = Math.abs(cents)
      if (!best || abs < best.abs) best = { index: i, ...t, cents, abs }
    }
    return best
  }, [frequency, isChromatic, note, targets])

  const ensureCtx = async () => {
    if (!audioRef.current.ctx) {
      if (typeof getAudioContext === 'function') {
        audioRef.current.ctx = getAudioContext()
      } else {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext
        audioRef.current.ctx = new AudioContextCtor()
      }
    }
    if (audioRef.current.ctx.state === 'suspended') {
      await audioRef.current.ctx.resume()
    }
    return audioRef.current.ctx
  }

  const stopReferenceTone = () => {
    const a = audioRef.current
    if (a.refOsc) {
      try {
        a.refOsc.stop()
      } catch {
        // ignore
      }
      a.refOsc.disconnect()
      a.refOsc = null
    }
    if (a.refGain) {
      a.refGain.disconnect()
      a.refGain = null
    }
    setRefToneOn(false)
  }

  const startReferenceTone = async () => {
    const ctx = await ensureCtx()
    stopReferenceTone()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.value = referencePitch
    gain.gain.value = 0.0

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)

    osc.start(now)

    audioRef.current.refOsc = osc
    audioRef.current.refGain = gain
    setRefToneOn(true)
  }

  const toggleReferenceTone = async () => {
    if (refToneOn) stopReferenceTone()
    else await startReferenceTone()
  }

  useEffect(() => {
    const a = audioRef.current
    if (a.refOsc) a.refOsc.frequency.setValueAtTime(referencePitch, a.ctx?.currentTime ?? 0)
  }, [referencePitch])

  const stopTuner = () => {
    const a = audioRef.current
    if (a.rafId) cancelAnimationFrame(a.rafId)
    a.rafId = null

    if (a.source) {
      a.source.disconnect()
      a.source = null
    }
    if (a.analyser) {
      a.analyser.disconnect()
      a.analyser = null
    }
    if (a.micStream) {
      for (const t of a.micStream.getTracks()) t.stop()
      a.micStream = null
    }
    setListening(false)
    setConfidence(0)
  }

  const startTuner = async () => {
    setError(null)
    const ctx = await ensureCtx()
    stopTuner()

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 8192
    analyser.smoothingTimeConstant = 0.3

    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)

    audioRef.current.micStream = stream
    audioRef.current.analyser = analyser
    audioRef.current.source = source
    setListening(true)

    const binCount = analyser.frequencyBinCount
    const freqData = new Float32Array(binCount)

    const tick = () => {
      const a = audioRef.current
      if (!a.analyser) return

      a.analyser.getFloatFrequencyData(freqData)

      // Limit the search to a practical instrument range.
      const sr = ctx.sampleRate
      const nyquist = sr / 2
      const minHz = 50
      const maxHz = 2000
      const minBin = Math.max(1, Math.floor((minHz / nyquist) * binCount))
      const maxBin = Math.min(binCount - 2, Math.ceil((maxHz / nyquist) * binCount))

      let bestBin = -1
      let bestDb = -Infinity
      let sumPower = 0
      let sumBestWindowPower = 0

      for (let i = minBin; i <= maxBin; i += 1) {
        const db = freqData[i]
        const power = Math.pow(10, db / 10)
        sumPower += power
        if (db > bestDb) {
          bestDb = db
          bestBin = i
        }
      }

      if (bestBin >= 1) {
        const m1 = freqData[bestBin - 1]
        const m2 = freqData[bestBin]
        const m3 = freqData[bestBin + 1]
        const delta = parabolicInterpolation(m1, m2, m3)
        const refinedBin = bestBin + delta
        const hz = (refinedBin / binCount) * nyquist

        // Confidence: compare peak power to total power in the band.
        const winDb = [m1, m2, m3]
        for (const db of winDb) sumBestWindowPower += Math.pow(10, db / 10)
        const conf = sumPower > 0 ? clamp(sumBestWindowPower / sumPower, 0, 1) : 0

        setFrequency(hz)
        setConfidence(conf)
      }

      a.rafId = requestAnimationFrame(tick)
    }

    audioRef.current.rafId = requestAnimationFrame(tick)
  }

  const toggleTuner = async () => {
    try {
      if (listening) stopTuner()
      else await startTuner()
    } catch (e) {
      stopTuner()
      setError(e?.message || 'Unable to start tuner')
    }
  }

  // Do NOT start the mic in useEffect. On iOS, creating/resuming a shared AudioContext or
  // getUserMedia in an async post-mount path runs *outside* the user-gesture and can lock Web
  // Audio in a "silent" state for the metronome. User taps "Start tuner".

  useEffect(() => {
    const a = audioRef.current
    const isShared = typeof getAudioContext === 'function'
    return () => {
      stopReferenceTone()
      stopTuner()
      if (isShared) {
        a.ctx = null
        return
      }
      const ctx = a.ctx
      a.ctx = null
      if (ctx && typeof ctx.close === 'function') ctx.close()
    }
  }, [getAudioContext])

  const strobeCanvasRef = useRef(null)
  const strobeRafRef = useRef(null)
  const strobePhaseRef = useRef(0)

  useEffect(() => {
    const canvas = strobeCanvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')
    if (!ctx2d) return

    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    let last = performance.now()
    const draw = () => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      const isDark = document.documentElement.dataset.theme === 'dark'
      const bg = isDark ? '#16171d' : '#ffffff'
      const accent = isDark ? 'rgba(192, 132, 252, 1)' : 'rgba(170, 59, 255, 1)'

      ctx2d.clearRect(0, 0, w, h)
      ctx2d.fillStyle = bg
      ctx2d.fillRect(0, 0, w, h)

      const cents = guidance ? guidance.cents : note ? note.cents : 0
      const conf = confidence
      const effective = strobeMode && listening && conf > 0.08

      // Strobe speed: proportional to cents deviation; near 0 cents → nearly still.
      // Use a slightly non-linear curve for extra sensitivity close to center.
      const centsNorm = clamp(cents / 50, -1, 1)
      const curved = Math.sign(centsNorm) * Math.pow(Math.abs(centsNorm), 0.7)
      const speed = effective ? clamp(curved * 7.5, -10, 10) : 0
      strobePhaseRef.current += speed * dt

      const cx = w / 2
      const cy = h / 2
      const outerR = Math.min(w, h) * 0.42
      const innerR = outerR * 0.62
      const segments = 28

      // Circular strobe: alternating wedges that rotate with pitch offset.
      ctx2d.save()
      ctx2d.translate(cx, cy)
      ctx2d.rotate(strobePhaseRef.current)
      ctx2d.globalAlpha = effective ? 1 : 0.32
      for (let i = 0; i < segments; i += 1) {
        const a0 = (i / segments) * Math.PI * 2
        const a1 = ((i + 1) / segments) * Math.PI * 2
        const bright = i % 2 === 0
        ctx2d.fillStyle = bright
          ? isDark
            ? 'rgba(243,244,246,0.85)'
            : 'rgba(8,6,13,0.82)'
          : isDark
            ? 'rgba(243,244,246,0.18)'
            : 'rgba(8,6,13,0.12)'

        ctx2d.beginPath()
        ctx2d.arc(0, 0, outerR, a0, a1)
        ctx2d.arc(0, 0, innerR, a1, a0, true)
        ctx2d.closePath()
        ctx2d.fill()
      }
      ctx2d.restore()

      // Reference ring + indicator
      const inTune = listening && conf > 0.08 ? Math.abs(cents) < 3 : false
      ctx2d.lineWidth = 4
      ctx2d.strokeStyle = isDark ? 'rgba(243,244,246,0.16)' : 'rgba(8,6,13,0.12)'
      ctx2d.beginPath()
      ctx2d.arc(cx, cy, outerR + 6, 0, Math.PI * 2)
      ctx2d.stroke()

      // Indicator dot stays fixed; pattern rotates behind it.
      ctx2d.fillStyle = inTune ? 'rgba(52, 211, 153, 0.95)' : accent
      ctx2d.beginPath()
      ctx2d.arc(cx, cy - (outerR + 6), 6.5, 0, Math.PI * 2)
      ctx2d.fill()

      // If strobe is off (or low confidence), show a simple needle for feedback.
      if (!effective) {
        const needle = clamp(cents / 50, -1, 1)
        const maxSwing = (Math.PI / 2.8) * 0.95
        const theta = needle * maxSwing
        const r = outerR + 2
        const nx = cx + Math.sin(theta) * r
        const ny = cy - Math.cos(theta) * r

        ctx2d.lineWidth = 3
        ctx2d.lineCap = 'round'
        ctx2d.strokeStyle = accent
        ctx2d.beginPath()
        ctx2d.moveTo(cx, cy)
        ctx2d.lineTo(nx, ny)
        ctx2d.stroke()

        ctx2d.fillStyle = accent
        ctx2d.beginPath()
        ctx2d.arc(cx, cy, 4.5, 0, Math.PI * 2)
        ctx2d.fill()
      }

      strobeRafRef.current = requestAnimationFrame(draw)
    }

    strobeRafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', onResize)
      if (strobeRafRef.current) cancelAnimationFrame(strobeRafRef.current)
      strobeRafRef.current = null
    }
  }, [confidence, guidance, listening, note, strobeMode])

  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-stretch justify-start px-1 sm:px-0"
    >
    <section className="tuner w-full min-w-0 max-w-full">
      <header className="tuner__header">
        <h2 className="tuner__title">Tuner</h2>
        <div className="tuner__subtitle">Alternate tunings + strobe</div>
      </header>

      <div className="tuner__panel">
        <div className="tuner__row tuner__row--config">
          <label className="tuner__label">
            Tuning
            <select className="tuner__select" value={tuningId} onChange={(e) => setTuningId(e.target.value)}>
              {Array.from(new Set(TUNING_LIBRARY.map((t) => t.category))).map((cat) => (
                <optgroup key={cat} label={cat}>
                  {TUNING_LIBRARY.filter((t) => t.category === cat).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="tuner__label">
            Reference pitch (A4)
            <div className="tuner__refPitch">
              <input
                className="tuner__range"
                type="range"
                min={415}
                max={466}
                value={referencePitch}
                onChange={(e) => setReferencePitch(Number(e.target.value))}
              />
              <div className="tuner__refStepper">
                <Stepper
                  value={referencePitch}
                  min={415}
                  max={466}
                  step={1}
                  format={(v) => `${Math.round(v)} Hz`}
                  onChange={(v) => setReferencePitch(Number(v))}
                />
              </div>
            </div>
          </label>

          <label className="tuner__toggle">
            <input type="checkbox" checked={strobeMode} onChange={(e) => setStrobeMode(e.target.checked)} />
            <span>Strobe mode</span>
          </label>
        </div>

        <div className="tuner__row tuner__row--buttons">
          <button type="button" className="tuner__btn tuner__btn--primary" onClick={toggleReferenceTone}>
            {refToneOn ? `Stop A4 (${referencePitch} Hz)` : `Play A4 (${referencePitch} Hz)`}
          </button>

          <button type="button" className="tuner__btn" onClick={toggleTuner}>
            {listening ? 'Stop tuner' : 'Start tuner'}
          </button>
        </div>

        {error ? <div className="tuner__error">{error}</div> : null}

        <div className="tuner__strobe">
          <canvas ref={strobeCanvasRef} className="tuner__strobeCanvas" height={80} />
        </div>

        <div className="tuner__readout">
          <div className="tuner__freq">
            {frequency ? `${frequency.toFixed(1)} Hz` : listening ? 'Listening…' : '—'}
          </div>
          <div className="tuner__note">
            {note ? (
              <>
                <span className="tuner__noteName">{note.name}</span>
                <span className="tuner__cents">
                  {note.cents >= 0 ? '+' : ''}
                  {note.cents.toFixed(0)} cents
                </span>
              </>
            ) : (
              <span className="tuner__muted">No pitch detected</span>
            )}
          </div>

          <div className="tuner__targets" role="list" aria-label="Tuning targets">
            {isChromatic ? (
              <div className="tuner__target is-active" role="listitem">
                <div className="tuner__targetNote">{note?.name ?? '—'}</div>
                <div className="tuner__targetHz">{note?.targetFreq ? `${note.targetFreq.toFixed(1)} Hz` : '—'}</div>
                <div className="tuner__targetCents">
                  {note?.cents == null ? '—' : `${note.cents >= 0 ? '+' : ''}${note.cents.toFixed(0)}c`}
                </div>
              </div>
            ) : (
              targets.map((t, idx) => {
                const cents = frequency ? centsBetween(frequency, t.freq) : null
                const active = guidance ? guidance.index === idx : false
                const near = cents != null ? Math.abs(cents) < 5 : false
                return (
                  <div
                    key={`${t.note}-${idx}`}
                    className={`tuner__target ${active ? 'is-active' : ''} ${near ? 'is-near' : ''}`}
                    role="listitem"
                  >
                    <div className="tuner__targetNote">{t.note}</div>
                    <div className="tuner__targetHz">{t.freq.toFixed(1)} Hz</div>
                    <div className="tuner__targetCents">
                      {cents == null ? '—' : `${cents >= 0 ? '+' : ''}${cents.toFixed(0)}c`}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="tuner__confidence">
            <div className="tuner__confidenceBar" style={{ width: `${Math.round(confidence * 100)}%` }} />
          </div>
          <div className="tuner__confidenceLabel">{Math.round(confidence * 100)}% confidence</div>
        </div>
      </div>
    </section>
    </div>
  )
}

