import { useEffect, useMemo, useRef, useState } from 'react'
import { useMetronome } from '../hooks/useMetronome'
import { supabase } from '../lib/supabaseClient'
import SetlistManager from './SetlistManager.jsx'
import './Metronome.css'

// Safari/older canvases may not have roundRect; provide a small fallback.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(Number(r) || 0, Math.min(w, h) / 2))
    this.moveTo(x + rr, y)
    this.arcTo(x + w, y, x + w, y + h, rr)
    this.arcTo(x + w, y + h, x, y + h, rr)
    this.arcTo(x, y + h, x, y, rr)
    this.arcTo(x, y, x + w, y, rr)
    return this
  }
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function normalizeAngleRad(rad) {
  let a = rad
  while (a <= -Math.PI) a += Math.PI * 2
  while (a > Math.PI) a -= Math.PI * 2
  return a
}

function bpmToT(bpm) {
  // Log scale: finer control at low BPM.
  const min = 1
  const max = 400
  const clamped = clamp(bpm, min, max)
  return Math.log(clamped / min) / Math.log(max / min)
}

function tToBpm(t) {
  const min = 1
  const max = 400
  const tt = clamp(t, 0, 1)
  return min * Math.pow(max / min, tt)
}

function average(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function RotaryDial({ value, onChange, label = 'BPM' }) {
  const dialRef = useRef(null)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startT: 0,
    startY: 0,
  })

  const minAngle = (-3 * Math.PI) / 4 // -135°
  const maxAngle = (3 * Math.PI) / 4 // +135°
  const t = bpmToT(value)
  const angle = minAngle + (maxAngle - minAngle) * t

  const setFromPoint = (clientX, clientY) => {
    const el = dialRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const a = Math.atan2(dy, dx)

    // Convert to dial angle range with 0 at top-ish.
    const rotated = normalizeAngleRad(a - Math.PI / 2)
    const clampedAngle = clamp(rotated, minAngle, maxAngle)
    const tt = (clampedAngle - minAngle) / (maxAngle - minAngle)
    onChange(Math.round(tToBpm(tt)))
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    dialRef.current?.setPointerCapture?.(e.pointerId)
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startT: bpmToT(value),
      startY: e.clientY,
    }
    setFromPoint(e.clientX, e.clientY)
  }

  const onPointerMove = (e) => {
    const dr = dragRef.current
    if (!dr.active || dr.pointerId !== e.pointerId) return

    // Fine control: vertical drag adjusts on the same log scale.
    const dy = dr.startY - e.clientY
    const sensitivity = 1 / 280
    const tt = clamp(dr.startT + dy * sensitivity, 0, 1)
    onChange(Math.round(tToBpm(tt)))
  }

  const onPointerUp = (e) => {
    const dr = dragRef.current
    if (dr.pointerId !== e.pointerId) return
    dragRef.current.active = false
    dragRef.current.pointerId = null
  }

  const onWheel = (e) => {
    e.preventDefault()
    const delta = Math.sign(e.deltaY)
    onChange(clamp(Math.round(value - delta), 1, 400))
  }

  const progress = (angle - minAngle) / (maxAngle - minAngle)
  const stroke = 10
  const size = 150
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * clamp(progress, 0, 1)

  return (
    <div className="dial">
      <div
        ref={dialRef}
        className="dial__knob"
        role="slider"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={400}
        aria-valuenow={Math.round(value)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg className="dial__svg" viewBox="0 0 150 150" aria-hidden="true">
          <circle className="dial__track" cx="75" cy="75" r={r} />
          <circle
            className="dial__progress"
            cx="75"
            cy="75"
            r={r}
            strokeDasharray={`${dash} ${circ}`}
          />
          <g transform={`translate(75 75) rotate(${(angle * 180) / Math.PI})`}>
            <rect className="dial__pointer" x="-2" y={-r + 6} width="4" height="18" rx="2" />
          </g>
        </svg>

        <div className="dial__readout">
          <div className="dial__value">{Math.round(value)}</div>
          <div className="dial__unit">BPM</div>
        </div>
      </div>
      <div className="dial__hint">Drag up/down for fine control</div>
    </div>
  )
}

export default function Metronome() {
  const met = useMetronome({
    initialBpm: 120,
    initialTimeSignature: '4/4',
    initialSubdivision: 'quarter',
  })

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.haptics')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return true
  })

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('metronome.theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  })

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('metronome.theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('metronome.haptics', hapticsEnabled ? 'on' : 'off')
  }, [hapticsEnabled])

  const canvasRef = useRef(null)
  const rafIdRef = useRef(null)
  const [animationStyle, setAnimationStyle] = useState('pendulum') // 'pendulum' | 'ring' | 'blocks'

  const bpm = met.bpm
  const bpmLabel = useMemo(() => `${Math.round(bpm)} BPM`, [bpm])

  const tapRef = useRef({
    times: [],
    lastTapAt: 0,
  })
  const [tapHint, setTapHint] = useState('Tap 4+ times')

  const [systemStatus, setSystemStatus] = useState(null)
  const [systemStatusError, setSystemStatusError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSystemStatusError(null)
      const { data, error } = await supabase
        .from('system_status')
        .select('maintenance_mode, banner_message, song_of_the_day, updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        setSystemStatusError(error.message)
        return
      }
      setSystemStatus(data ?? null)
    }
    load()
    const id = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const onTap = () => {
    const now = performance.now()
    const tr = tapRef.current

    if (tr.lastTapAt && now - tr.lastTapAt > 2500) tr.times = []
    tr.lastTapAt = now
    tr.times.push(now)
    if (tr.times.length > 8) tr.times.shift()

    if (tr.times.length < 4) {
      setTapHint('Tap 4+ times')
      return
    }

    const intervals = []
    for (let i = 1; i < tr.times.length; i += 1) {
      intervals.push(tr.times[i] - tr.times[i - 1])
    }

    const msPerBeat = average(intervals)
    const nextBpm = clamp(Math.round(60000 / msPerBeat), 1, 400)
    met.setBpm(nextBpm)
    setTapHint(`Set to ${nextBpm} BPM`)
  }

  // Haptics: schedule vibration pulses aligned to the Web Audio clock.
  useEffect(() => {
    if (!met?.events?.onScheduledBeat) return
    if (!('vibrate' in navigator)) return

    const timeouts = new Set()
    const unsubscribe = met.events.onScheduledBeat((evt) => {
      if (!hapticsEnabled) return
      if (!met.isPlaying) return
      if (evt.accent === 'muted') return
      if (met.internalClock?.enabled && met.internalClock?.isMuted) return

      const nowAudio = met.audioClock.getAudioTime()
      if (nowAudio == null) return
      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)

      const pattern = evt.pulseIndex === 0 ? [18] : [10]
      const id = window.setTimeout(() => {
        try {
          navigator.vibrate(pattern)
        } catch {
          // ignore
        } finally {
          timeouts.delete(id)
        }
      }, delayMs)
      timeouts.add(id)
    })

    return () => {
      unsubscribe?.()
      for (const id of timeouts) window.clearTimeout(id)
    }
  }, [hapticsEnabled, met])

  // Media Session: allow lock screen play/pause.
  useEffect(() => {
    const ms = navigator.mediaSession
    if (!ms) return

    try {
      ms.metadata = new MediaMetadata({
        title: 'Metronome',
        artist: `${Math.round(met.bpm)} BPM • ${met.timeSignature} • ${met.subdivision}`,
        album: 'Practice',
      })
    } catch {
      // ignore
    }

    const onPlay = () => met.start()
    const onPause = () => met.stop()
    const onStop = () => met.stop()

    try {
      ms.setActionHandler('play', onPlay)
      ms.setActionHandler('pause', onPause)
      ms.setActionHandler('stop', onStop)
    } catch {
      // ignore
    }

    ms.playbackState = met.isPlaying ? 'playing' : 'paused'

    return () => {
      try {
        ms.setActionHandler('play', null)
        ms.setActionHandler('pause', null)
        ms.setActionHandler('stop', null)
      } catch {
        // ignore
      }
    }
  }, [met, met.bpm, met.isPlaying, met.subdivision, met.timeSignature])

  useEffect(() => {
    const canvas = canvasRef.current
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

    const draw = () => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      const audioNow = met.audioClock.getAudioTime()
      const nextPulseTime = met.audioClock.getNextPulseTime()
      const secondsPerPulse = met.audioClock.getSecondsPerPulse()
      const nextPulseIndex = met.audioClock.getPulseIndex()

      ctx2d.clearRect(0, 0, w, h)

      // Phase within the current pulse, and progress across the measure.
      let pulsePhase = 0
      let measureProgress = 0
      if (audioNow != null && secondsPerPulse > 0) {
        const lastPulseTime = nextPulseTime - secondsPerPulse
        pulsePhase = clamp((audioNow - lastPulseTime) / secondsPerPulse, 0, 1)
        const pulsesPerMeasure = met.pulsesPerMeasure || 1
        const pulsesCompleted = nextPulseIndex
        measureProgress = clamp((pulsesCompleted + pulsePhase) / pulsesPerMeasure, 0, 1)
      }

      // Flash synced to the audio clock (useful in all styles).
      const flash = clamp(1 - pulsePhase / 0.16, 0, 1)

      const isDark = document.documentElement.dataset.theme === 'dark'
      const bg = isDark ? '#16171d' : '#ffffff'
      const fg = isDark ? '#f3f4f6' : '#08060d'
      const accent = isDark ? 'rgba(192, 132, 252, 1)' : 'rgba(170, 59, 255, 1)'

      ctx2d.fillStyle = bg
      ctx2d.fillRect(0, 0, w, h)

      if (flash > 0) {
        ctx2d.fillStyle = isDark
          ? `rgba(192, 132, 252, ${0.18 * flash})`
          : `rgba(170, 59, 255, ${0.12 * flash})`
        ctx2d.fillRect(0, 0, w, h)
      }

      const x = w / 2
      const yMid = h / 2

      if (animationStyle === 'pendulum') {
        // Needle swings left -> right within each beat.
        const pivotY = Math.max(18, yMid - Math.min(62, h * 0.25))
        const length = Math.min(78, h * 0.42)
        const maxSwing = (Math.PI / 3) * 0.95
        const theta = (-0.5 + pulsePhase) * 2 * maxSwing

        const tipX = x + Math.sin(theta) * length
        const tipY = pivotY + Math.cos(theta) * length

        ctx2d.lineWidth = 3.5
        ctx2d.lineCap = 'round'
        ctx2d.strokeStyle = isDark ? 'rgba(243,244,246,0.25)' : 'rgba(8,6,13,0.18)'
        ctx2d.beginPath()
        ctx2d.moveTo(x, pivotY)
        ctx2d.lineTo(tipX, tipY)
        ctx2d.stroke()

        // High contrast needle tip
        ctx2d.fillStyle = accent
        ctx2d.beginPath()
        ctx2d.arc(tipX, tipY, 9.5, 0, Math.PI * 2)
        ctx2d.fill()

        // Pivot cap
        ctx2d.fillStyle = isDark ? 'rgba(243,244,246,0.6)' : 'rgba(8,6,13,0.55)'
        ctx2d.beginPath()
        ctx2d.arc(x, pivotY, 4.5, 0, Math.PI * 2)
        ctx2d.fill()
      } else if (animationStyle === 'ring') {
        const r = Math.min(w, h) * 0.32
        const cx = x
        const cy = yMid
        const start = -Math.PI / 2
        const end = start + measureProgress * Math.PI * 2

        ctx2d.lineWidth = 10
        ctx2d.lineCap = 'round'
        ctx2d.strokeStyle = isDark ? 'rgba(243,244,246,0.12)' : 'rgba(8,6,13,0.10)'
        ctx2d.beginPath()
        ctx2d.arc(cx, cy, r, 0, Math.PI * 2)
        ctx2d.stroke()

        ctx2d.strokeStyle = accent
        ctx2d.beginPath()
        ctx2d.arc(cx, cy, r, start, end)
        ctx2d.stroke()

        // A small pulse marker
        const markerAng = start + pulsePhase * Math.PI * 2
        const mx = cx + Math.cos(markerAng) * r
        const my = cy + Math.sin(markerAng) * r
        ctx2d.fillStyle = accent
        ctx2d.beginPath()
        ctx2d.arc(mx, my, 7, 0, Math.PI * 2)
        ctx2d.fill()
      } else if (animationStyle === 'blocks') {
        const beats = Math.max(1, met.pulsesPerMeasure || 1)
        const activeIndex = clamp(nextPulseIndex, 0, beats - 1)
        const blockGap = Math.max(6, Math.min(12, w * 0.02))
        const maxBlocks = Math.min(beats, 12)
        const rowBeats = beats > 12 ? maxBlocks : beats
        const size = Math.min(34, (w - blockGap * (rowBeats + 1)) / rowBeats)
        const totalW = rowBeats * size + (rowBeats + 1) * blockGap
        const left = x - totalW / 2
        const top = yMid - size / 2

        for (let i = 0; i < rowBeats; i += 1) {
          const isActive = i === activeIndex
          const isPast = i < activeIndex

          const xx = left + blockGap + i * (size + blockGap)
          const yy = top

          const base = isDark ? 'rgba(243,244,246,0.14)' : 'rgba(8,6,13,0.10)'
          const filled = isDark ? 'rgba(243,244,246,0.34)' : 'rgba(8,6,13,0.24)'
          const active = accent

          ctx2d.fillStyle = isActive ? active : isPast ? filled : base
          ctx2d.strokeStyle = isDark ? 'rgba(243,244,246,0.20)' : 'rgba(8,6,13,0.16)'
          ctx2d.lineWidth = 2

          const r = 8
          ctx2d.beginPath()
          ctx2d.roundRect(xx, yy, size, size, r)
          ctx2d.fill()
          ctx2d.stroke()

          if (isActive) {
            const glow = clamp(0.35 + flash * 0.35, 0, 0.7)
            ctx2d.fillStyle = isDark ? `rgba(192, 132, 252, ${glow})` : `rgba(170, 59, 255, ${glow})`
            ctx2d.beginPath()
            ctx2d.roundRect(xx + 5, yy + 5, size - 10, size - 10, r - 3)
            ctx2d.fill()
          }
        }
      }

      ctx2d.fillStyle = fg
      ctx2d.font = '600 12px system-ui, Segoe UI, Roboto, sans-serif'
      ctx2d.textAlign = 'center'
      ctx2d.fillText(met.isPlaying ? `Pulse ${met.pulse}/${met.pulsesPerMeasure}` : 'Stopped', x, h - 8)

      rafIdRef.current = window.requestAnimationFrame(draw)
    }

    rafIdRef.current = window.requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', onResize)
      if (rafIdRef.current) window.cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [animationStyle, met, met.audioClock, met.isPlaying, met.pulse, met.pulsesPerMeasure])

  return (
    <div className="metronome">
      {systemStatus?.maintenance_mode ? (
        <div className="metronome__status metronome__status--warn" role="status">
          <strong>Maintenance mode</strong>
          <span>{systemStatus.banner_message || 'Some features may be unavailable.'}</span>
        </div>
      ) : systemStatus?.banner_message ? (
        <div className="metronome__status" role="status">
          <span>{systemStatus.banner_message}</span>
        </div>
      ) : null}

      {systemStatusError ? (
        <div className="metronome__status metronome__status--muted" role="status">
          Status unavailable: {systemStatusError}
        </div>
      ) : null}

      <header className="metronome__header">
        <div>
          <h1 className="metronome__title">Metronome</h1>
          <div className="metronome__subtitle">{bpmLabel}</div>
        </div>

        <div className="metronome__toggles">
          <label className="metronome__toggle">
            <input
              type="checkbox"
              checked={hapticsEnabled}
              onChange={(e) => setHapticsEnabled(e.target.checked)}
            />
            <span>Haptics</span>
          </label>
          <label className="metronome__toggle">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
            <span>Dark mode</span>
          </label>
        </div>
      </header>

      <section className="metronome__panel">
        <canvas ref={canvasRef} className="metronome__canvas" height={160} />

        <div className="metronome__controls">
          <div className="metronome__topGrid">
            <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} />

            <div className="metronome__settings">
              <label className="metronome__label">
                Rhythm
                <select
                  className="metronome__select"
                  value={met.timeSignature}
                  onChange={(e) => met.setTimeSignature(e.target.value)}
                >
                  <option value="4/4">4/4 (regular)</option>
                  <option value="7/8">7/8 (2+2+3)</option>
                </select>
              </label>

              <label className="metronome__label">
                Subdivision
                <select
                  className="metronome__select"
                  value={met.subdivision}
                  onChange={(e) => met.setSubdivision(e.target.value)}
                >
                  <option value="quarter">Quarter</option>
                  <option value="eighth">Eighth</option>
                  <option value="triplet">Triplet</option>
                </select>
              </label>

              <label className="metronome__label">
                Animation
                <select
                  className="metronome__select"
                  value={animationStyle}
                  onChange={(e) => setAnimationStyle(e.target.value)}
                >
                  <option value="pendulum">Pendulum</option>
                  <option value="ring">Progress ring</option>
                  <option value="blocks">Beat blocks</option>
                </select>
              </label>
            </div>
          </div>

          <div className="metronome__row">
            <div className="metronome__subtitle metronome__subtitle--inline">{bpmLabel}</div>
            <div className="metronome__hint" aria-live="polite">
              {tapHint}
            </div>
          </div>

          <div className="metronome__row metronome__row--presets">
            <SetlistManager met={met} />
          </div>
        </div>

        <div className="metronome__stickyBar" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="metronome__btn metronome__btn--primary metronome__btn--sticky"
            onClick={met.toggle}
          >
            {met.isPlaying ? 'Stop' : 'Start'}
          </button>
          <button type="button" className="metronome__btn metronome__btn--sticky" onClick={onTap} title="Tap tempo">
            Tap tempo
          </button>
        </div>
      </section>
    </div>
  )
}

