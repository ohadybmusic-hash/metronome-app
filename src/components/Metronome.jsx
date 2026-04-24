import { useEffect, useMemo, useRef, useState } from 'react'
import { supabasePublic } from '../lib/supabaseClient'
import { useAuth } from '../context/useAuth'
import SetlistManager from './SetlistManager.jsx'
import Stepper from './Stepper.jsx'
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

// Maps accent level string → numeric tier (0–3) for the stacked block UI
function accentToNumeric(level) {
  switch (level) {
    case 'ACCENT3': return 3
    case 'ACCENT2': return 2  // NORMAL maps here too — visually "medium"
    case 'ACCENT1': return 1
    case 'MUTE':    return 0
    case 'NORMAL':
    default:        return 2
  }
}

// Short readable label shown under each beat column
function accentShortLabel(level) {
  switch (level) {
    case 'ACCENT3': return 'ACCT'
    case 'ACCENT2': return 'MED'  // unused direct mapping; NORMAL shows MED
    case 'ACCENT1': return 'SOFT'
    case 'MUTE':    return 'MUTE'
    case 'NORMAL':
    default:        return 'MED'
  }
}

// Tempo name from BPM
function tempoName(bpm) {
  const b = Math.round(bpm)
  if (b >= 220) return 'PRESTISSIMO'
  if (b >= 200) return 'PRESTO'
  if (b >= 168) return 'VIVACE'
  if (b >= 132) return 'ALLEGRO'
  if (b >= 120) return 'ALLEGRETTO'
  if (b >= 108) return 'MODERATO'
  if (b >=  76) return 'ANDANTE'
  if (b >=  66) return 'ADAGIO'
  if (b >=  60) return 'LARGHETTO'
  if (b >=  40) return 'LARGO'
  if (b >=  20) return 'GRAVE'
  return 'LARGHISSIMO'
}

// New stacked-block beat visualizer — 3 equal-height blocks per beat,
// color/count reflects accent level; active beat lights up.
function BeatBlocksJuicy({ met }) {
  const [hit, setHit] = useState({ i: -1, isDownbeat: false, id: 0 })

  useEffect(() => {
    return met.events.onScheduledBeat((evt) => {
      const beats = Math.max(1, met.pulsesPerMeasure || 1)
      const i = clamp(Number(evt?.pulseIndex ?? 0), 0, beats - 1)
      setHit((prev) => ({ i, isDownbeat: i === 0, id: prev.id + 1 }))
    })
  }, [met])

  const beats = Math.max(1, met.pulsesPerMeasure || 1)
  const accents = met.beatAccents || []

  return (
    <div className="metronome__accents" aria-label="Beat blocks visualizer">
      {Array.from({ length: beats }, (_, idx) => {
        const isActive = idx === hit.i
        const accentLevel = accents[idx] || 'NORMAL'
        const numFilled = accentToNumeric(accentLevel)
        const levelClass = `metronome__beat--${String(accentLevel).toLowerCase()}`

        return (
          <button
            key={idx}
            type="button"
            className={`metronome__beat ${levelClass}${isActive ? ' is-beat-active' : ''}`}
            onClick={() => met.cycleBeatAccent(idx)}
            title={`Beat ${idx + 1}: ${accentLevel}`}
            aria-label={`Beat ${idx + 1} accent: ${accentLevel}. Tap to cycle.`}
          >
            {/* 3 blocks, top (b2=red) → bottom (b0=white) */}
            {[2, 1, 0].map((tier) => {
              const filled = tier < numFilled
              return (
                <div
                  key={tier}
                  className={`beat__block beat__block--b${tier} ${filled ? 'beat__block--filled' : 'beat__block--empty'}`}
                />
              )
            })}
            <div className="beat__label">{accentShortLabel(accentLevel)}</div>
          </button>
        )
      })}
    </div>
  )
}

function RotaryDial({ value, onChange, onTap, label = 'BPM', disabled = false }) {
  const dialRef = useRef(null)
  const inputRef = useRef(null)
  const [textValue, setTextValue] = useState(() => String(Math.round(value)))
  const [editing, setEditing] = useState(false)
  const [ripples, setRipples] = useState([])
  const dragRef = useRef({
    active: false,
    pointerId: null,
    lastAngle: 0,
    accumulatedTurns: 0,
  })

  const minAngle = (-3 * Math.PI) / 4 // -135°
  const maxAngle = (3 * Math.PI) / 4 // +135°
  const t = bpmToT(value)
  const angle = minAngle + (maxAngle - minAngle) * t

  const angleFromPoint = (clientX, clientY) => {
    const el = dialRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const a = Math.atan2(dy, dx)
    // Convert to dial angle range with 0 at top-ish.
    return normalizeAngleRad(a - Math.PI / 2)
  }

  const setFromPoint = (clientX, clientY) => {
    const el = dialRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const rotated = angleFromPoint(clientX, clientY)
    const clampedAngle = clamp(rotated, minAngle, maxAngle)
    const tt = (clampedAngle - minAngle) / (maxAngle - minAngle)
    onChange(Math.round(tToBpm(tt)))
  }

  const onPointerDown = (e) => {
    if (disabled) return
    e.preventDefault()
    dialRef.current?.setPointerCapture?.(e.pointerId)
    const a = angleFromPoint(e.clientX, e.clientY)
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      lastAngle: a,
      accumulatedTurns: 0,
    }
    setFromPoint(e.clientX, e.clientY)
  }

  const onPointerMove = (e) => {
    if (disabled) return
    const dr = dragRef.current
    if (!dr.active || dr.pointerId !== e.pointerId) return

    // Spin control: accumulate angle deltas, with wrap handling.
    const a = angleFromPoint(e.clientX, e.clientY)
    let delta = a - dr.lastAngle
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    dr.lastAngle = a

    // Map one full rotation (~2π) to multiple sweeps of the dial range.
    // This makes it easy to traverse 1–400 quickly while preserving precision.
    const turnsPerFullRange = 1.2
    const rangePerRad = 1 / (Math.PI * 2 * turnsPerFullRange)
    dr.accumulatedTurns += delta * rangePerRad

    const nextT = clamp(t + dr.accumulatedTurns, 0, 1)
    onChange(Math.round(tToBpm(nextT)))
  }

  const onPointerUp = (e) => {
    if (disabled) return
    const dr = dragRef.current
    if (dr.pointerId !== e.pointerId) return
    dragRef.current.active = false
    dragRef.current.pointerId = null
  }

  const onWheel = (e) => {
    if (disabled) return
    e.preventDefault()
    const delta = Math.sign(e.deltaY)
    onChange(clamp(Math.round(value - delta), 1, 400))
  }

  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      onChange(clamp(Math.round(value + 1), 1, 400))
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      onChange(clamp(Math.round(value - 1), 1, 400))
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(400)
    }
  }

  const progress = (angle - minAngle) / (maxAngle - minAngle)
  const stroke = 10
  const size = 150
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = circ * clamp(progress, 0, 1)

  useEffect(() => {
    if (editing) return
    setTextValue(String(Math.round(value)))
  }, [editing, value])

  const commitText = () => {
    const raw = String(textValue || '').trim()
    if (!raw) {
      setTextValue(String(Math.round(value)))
      return
    }
    const n = Math.round(Number(raw))
    if (!Number.isFinite(n)) {
      setTextValue(String(Math.round(value)))
      return
    }
    const clamped = clamp(n, 1, 400)
    setTextValue(String(clamped))
    onChange(clamped)
  }

  const spawnRipple = (clientX, clientY) => {
    const el = dialRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clamp(clientX - rect.left, 0, rect.width)
    const y = clamp(clientY - rect.top, 0, rect.height)
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setRipples((prev) => [...prev, { id, x, y }].slice(-6))
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 520)
  }

  return (
    <div className="dial">
      <div
        ref={dialRef}
        className={`dial__knob ${disabled ? 'dial__knob--disabled' : ''}`}
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
        onKeyDown={onKeyDown}
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
          {!disabled ? (
            <button
              type="button"
              className="dial__tapArea"
              aria-label="Tap tempo"
              title="Tap tempo"
              onPointerDown={(e) => {
                // Don't interfere with manual BPM entry.
                if (editing) return
                spawnRipple(e.clientX, e.clientY)
                onTap?.()
              }}
            />
          ) : null}

          {ripples.map((r) => (
            <span
              key={r.id}
              className="dial__ripple"
              style={{ left: `${r.x}px`, top: `${r.y}px` }}
              aria-hidden="true"
            />
          ))}
          <input
            ref={inputRef}
            className="dial__value dial__valueInput"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false)
              commitText()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setTextValue(String(Math.round(value)))
                e.currentTarget.blur()
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            inputMode="numeric"
            type="text"
            aria-label="BPM"
            disabled={disabled}
          />
          <div className="dial__unit">BPM</div>
        </div>
      </div>
      <div className="dial__hint">Spin the dial (scroll/arrow keys for ±1)</div>
    </div>
  )
}

export default function Metronome({ met, onStageModeChange, minimal = false }) {
  const auth = useAuth()

  const [stageMode, setStageMode] = useState(false)
  const [cloudModalOpen, setCloudModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Unlock AudioContext on first user gesture (avoids "no sound" until a tap).
  useEffect(() => {
    let done = false
    const unlock = async () => {
      if (done) return
      done = true
      try {
        // Don't await: keep within user gesture as much as possible.
        met.audio?.ensure?.()
      } catch {
        // ignore
      } finally {
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [met])

  // Web MIDI: allow external toggle (CC64 or Note C3).
  useEffect(() => {
    let cancelled = false
    const subs = new Set()

    const NOTE_C3 = 48
    const CC_SUSTAIN = 64

    const onMidiMessage = (e) => {
      if (cancelled) return
      const d = e?.data
      if (!d || d.length < 2) return

      const status = d[0] & 0xf0
      const a = d[1]
      const b = d[2] ?? 0

      // Note On: 0x90, note C3, velocity > 0
      if (status === 0x90 && a === NOTE_C3 && b > 0) {
        try {
          met.audio?.ensure?.()
        } catch {
          // ignore
        }
        met.toggle()
        return
      }

      // CC: 0xB0, CC #64, value > 0
      if (status === 0xb0 && a === CC_SUSTAIN && b > 0) {
        try {
          met.audio?.ensure?.()
        } catch {
          // ignore
        }
        met.toggle()
      }
    }

    async function init() {
      if (typeof navigator === 'undefined') return
      if (!('requestMIDIAccess' in navigator)) return
      try {
        const access = await navigator.requestMIDIAccess({ sysex: false })
        if (cancelled) return

        const attach = (input) => {
          if (!input) return
          input.addEventListener('midimessage', onMidiMessage)
          subs.add(() => input.removeEventListener('midimessage', onMidiMessage))
        }

        for (const input of access.inputs.values()) attach(input)

        // Hot-plug support.
        const onState = (evt) => {
          const port = evt?.port
          if (port?.type === 'input' && port?.state === 'connected') attach(port)
        }
        access.addEventListener('statechange', onState)
        subs.add(() => access.removeEventListener('statechange', onState))
      } catch {
        // ignore (permission denied / unsupported)
      }
    }

    init()
    return () => {
      cancelled = true
      for (const unsub of subs) unsub()
      subs.clear()
    }
  }, [met])

  const [screenFlashEnabled, setScreenFlashEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.screenFlash')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return false
  })

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.haptics')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return true
  })

  const [countInEnabled, setCountInEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.countIn')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return false
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

  useEffect(() => {
    met.haptics?.setEnabled?.(hapticsEnabled)
  }, [hapticsEnabled, met.haptics])

  useEffect(() => {
    localStorage.setItem('metronome.countIn', countInEnabled ? 'on' : 'off')
    met.countIn?.setEnabled?.(countInEnabled)
  }, [countInEnabled, met.countIn])

  useEffect(() => {
    localStorage.setItem('metronome.screenFlash', screenFlashEnabled ? 'on' : 'off')
  }, [screenFlashEnabled])

  const canvasRef = useRef(null)
  const rafIdRef = useRef(null)
  const [animationStyle, setAnimationStyle] = useState('blocks') // 'pendulum' | 'ring' | 'blocks'

  const flashElRef = useRef(null)
  const flashTimersRef = useRef(new Set())

  // Flash Mode: CSS overlay synced to AudioContext.currentTime (incl. subdivisions).
  useEffect(() => {
    if (!met?.events?.onScheduledPulse) return
    const unsubscribe = met.events.onScheduledPulse((evt) => {
      if (!screenFlashEnabled) return
      if (!met.isPlaying) return

      const el = flashElRef.current
      if (!el) return

      const nowAudio = met.audioClock.getAudioTime()
      if (nowAudio == null) return

      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)
      const level = evt.isMeasureDownbeat ? 1.0 : 0.5
      const color = evt.isMeasureDownbeat ? 'rgba(255, 255, 210, 1)' : 'rgba(255, 255, 255, 1)'

      const t1 = window.setTimeout(() => {
        try {
          el.style.background = color
          el.style.opacity = String(level)
        } catch {
          // ignore
        }
      }, delayMs)
      flashTimersRef.current.add(t1)

      const t2 = window.setTimeout(() => {
        try {
          el.style.opacity = '0'
        } catch {
          // ignore
        } finally {
          flashTimersRef.current.delete(t1)
          flashTimersRef.current.delete(t2)
        }
      }, delayMs + 50)
      flashTimersRef.current.add(t2)
    })

    return () => {
      unsubscribe?.()
      for (const id of flashTimersRef.current) window.clearTimeout(id)
      flashTimersRef.current.clear()
    }
  }, [met, screenFlashEnabled])

  // Stage Mode flash: Beat 1 only, semi-transparent white, 50ms.
  useEffect(() => {
    if (!stageMode) return
    if (!met?.events?.onScheduledBeat) return

    const unsubscribe = met.events.onScheduledBeat((evt) => {
      if (!stageMode) return
      if (!met.isPlaying) return
      if (evt?.pulseIndex !== 0) return

      const el = flashElRef.current
      if (!el) return

      const nowAudio = met.audioClock.getAudioTime()
      if (nowAudio == null) return

      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)
      const t1 = window.setTimeout(() => {
        try {
          el.style.background = 'rgba(255, 255, 255, 1)'
          el.style.opacity = '0.3'
        } catch {
          // ignore
        }
      }, delayMs)
      flashTimersRef.current.add(t1)

      const t2 = window.setTimeout(() => {
        try {
          el.style.opacity = '0'
        } catch {
          // ignore
        } finally {
          flashTimersRef.current.delete(t1)
          flashTimersRef.current.delete(t2)
        }
      }, delayMs + 50)
      flashTimersRef.current.add(t2)
    })

    return () => {
      unsubscribe?.()
    }
  }, [met, stageMode])

  const bpm = met.bpm
  const bpmLabel = useMemo(() => `${Math.round(bpm)} BPM`, [bpm])

  useEffect(() => {
    onStageModeChange?.(stageMode)
  }, [onStageModeChange, stageMode])

  const stageSongs = useMemo(() => {
    const setlistId = met.presets.activeSetlistId
    const songs = met.presets.songs || []
    const setlists = met.presets.setlists || []
    if (!setlistId) return songs

    const sl = setlists.find((x) => x.id === setlistId)
    if (!sl?.songIds?.length) return []

    const byId = new Map(songs.map((s) => [s.id, s]))
    return sl.songIds.map((id) => byId.get(id)).filter(Boolean)
  }, [met.presets.activeSetlistId, met.presets.setlists, met.presets.songs])

  const stageIndex = useMemo(() => {
    if (!stageSongs.length) return -1
    const idx = stageSongs.findIndex((s) => s.id === met.presets.activeSongId)
    return idx >= 0 ? idx : 0
  }, [met.presets.activeSongId, stageSongs])

  const currentStageSong = stageIndex >= 0 ? stageSongs[stageIndex] : null

  useEffect(() => {
    if (!stageMode) return
    if (!stageSongs.length) return
    if (!currentStageSong) return
    // Ensure the active song is applied when entering stage mode.
    // This does not stop the audio engine; it only updates scheduling params.
    met.presets.applySong(currentStageSong)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageMode])

  const goNextSong = () => {
    if (!stageSongs.length) return
    const idx = stageIndex >= 0 ? stageIndex : 0
    const next = stageSongs[(idx + 1) % stageSongs.length]
    if (!next) return
    met.presets.applySong(next)
  }

  const tapRef = useRef({
    times: [],
    lastTapAt: 0,
  })
  // iOS defers the synthetic `click` ~300ms after touch; `AudioContext` unlock must run with
  // `pointerup` in the same gesture. Suppress the follow-up `click` so we don't double-toggle.
  const playFabSkipClickRef = useRef(false)
  const [tapHint, setTapHint] = useState('Tap 4+ times')

  const [systemStatus, setSystemStatus] = useState(null)
  const [systemStatusError, setSystemStatusError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setSystemStatusError(null)
      const { data, error } = await supabasePublic
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

  const handleTap = () => {
    const now = performance.now()
    const tr = tapRef.current

    // Reset if user pauses tapping for 2s.
    if (tr.lastTapAt && now - tr.lastTapAt > 2000) tr.times = []
    tr.lastTapAt = now

    tr.times.push(now)
    // Keep only last 4 taps.
    while (tr.times.length > 4) tr.times.shift()

    if (tr.times.length < 4) {
      setTapHint('Tap 4 times')
      return
    }

    // 4 taps => 3 intervals; average them.
    const intervals = [tr.times[1] - tr.times[0], tr.times[2] - tr.times[1], tr.times[3] - tr.times[2]]
    const msPerBeat = average(intervals)
    const nextBpm = clamp(Math.round(60000 / msPerBeat), 1, 400)
    met.setBpm(nextBpm)
    setTapHint(`Set to ${nextBpm} BPM`)
  }

  const handlePlayFabPointerUp = (e) => {
    if (e.button !== 0) return
    if (e.isPrimary === false) return
    playFabSkipClickRef.current = true
    window.setTimeout(() => {
      playFabSkipClickRef.current = false
    }, 500)
    try {
      met.audio?.ensure?.()
    } catch {
      // ignore
    }
    met.toggle()
  }

  const handlePlayFabClick = (e) => {
    if (playFabSkipClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    try {
      met.audio?.ensure?.()
    } catch {
      // ignore
    }
    met.toggle()
  }

  useEffect(() => {
    if (animationStyle === 'blocks') return
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
      const accent = isDark ? 'rgba(200, 68, 10, 1)' : 'rgba(200, 68, 10, 1)'

      ctx2d.fillStyle = bg
      ctx2d.fillRect(0, 0, w, h)

      // Screen flash is handled via CSS overlay (see effect above).

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
            ctx2d.fillStyle = `rgba(200, 68, 10, ${glow})`
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

  // Compute slider percentage (log scale)
  const sliderPct = useMemo(() => {
    return (Math.log(clamp(bpm, 1, 400) / 1) / Math.log(400 / 1) * 100).toFixed(1)
  }, [bpm])

  return (
    <>
    <div className="metronome">
      <div ref={flashElRef} className="metronome__flashOverlay" aria-hidden="true" />

      {/* Count-in overlay */}
      {met.countIn?.active ? (
        <div className="metronome__countIn" role="status" aria-live="polite">
          {met.countIn.beatsRemaining <= 3 && met.countIn.beatsRemaining > 0
            ? `${met.countIn.beatsRemaining}…`
            : 'GET READY'}
        </div>
      ) : null}

      {/* System status banners */}
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

      {/* ── Header ── */}
      <header className="metronome__header">
        <h1 className="metronome__title">METRO</h1>
        <div className="metronome__toggles">
          {met.streak?.count > 0 ? (
            <div className="metronome__streak" title={`Daily streak: ${met.streak.count}`}>
              <span className="metronome__streakFlame" aria-hidden="true">🔥</span>
              <span className="metronome__streakNum" aria-label={`Streak ${met.streak.count}`}>
                {met.streak.count}
              </span>
            </div>
          ) : null}
          {met.auth?.isAnonymous && met.presets?.guestSyncPrompt ? (
            <button type="button" className="metronome__cloudBtn" title="Cloud sync" aria-label="Cloud sync" onClick={() => setCloudModalOpen(true)}>
              ☁
            </button>
          ) : null}
          <label className="metronome__toggle"><input type="checkbox" checked={countInEnabled} onChange={(e) => setCountInEnabled(e.target.checked)} /><span>COUNT-IN</span></label>
          <label className="metronome__toggle"><input type="checkbox" checked={screenFlashEnabled} onChange={(e) => setScreenFlashEnabled(e.target.checked)} /><span>FLASH</span></label>
          <label className="metronome__toggle"><input type="checkbox" checked={hapticsEnabled} onChange={(e) => setHapticsEnabled(e.target.checked)} /><span>HAPTICS</span></label>
          <label className="metronome__toggle"><input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} /><span>DARK</span></label>
        </div>
      </header>

      {/* Cloud modal */}
      {cloudModalOpen ? (
        <div className="metronome__modalBackdrop" role="dialog" aria-modal="true" aria-label="Cloud sync">
          <div className="metronome__modal">
            <div className="metronome__modalTitle">Save across devices</div>
            <div className="metronome__modalBody">
              {met.presets?.guestSyncPrompt || 'Create a permanent account to sync your data across devices.'}
            </div>
            <div className="metronome__modalActions">
              <button type="button" className="metronome__btn metronome__btn--primary" onClick={() => auth.linkOAuthIdentity?.({ provider: 'google' })}>Upgrade with Google</button>
              <button type="button" className="metronome__btn" onClick={() => auth.linkOAuthIdentity?.({ provider: 'apple' })}>Upgrade with Apple</button>
              <button type="button" className="metronome__btn" onClick={() => { setCloudModalOpen(false); met.presets?.clearGuestSyncPrompt?.() }}>Not now</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="metronome__panel">

        {/* ── BPM: rotary dial (primary) + fine slider ── */}
        {stageMode ? null : (
          <div className="metronome__dialHero">
            <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} onTap={handleTap} label="Tempo BPM" />
            <div className="metronome__dialMeta" aria-live="polite">
              <span className="metronome__tempoName">{tempoName(bpm)}</span>
            </div>
          </div>
        )}

        <div className="metronome__rule" />

        {stageMode ? null : (
          <div className="metronome__sliderWrap">
            <input
              className="metronome__slider metronome__slider--full"
              type="range"
              min={1}
              max={400}
              step={1}
              value={Math.round(bpm)}
              style={{ '--pct': `${sliderPct}%` }}
              onChange={(e) => {
                const t = Number(e.target.value) / 400
                met.setBpm(Math.round(clamp(1 * Math.pow(400 / 1, t), 1, 400)))
              }}
              aria-label="Fine tempo (BPM)"
            />
            <div className="metronome__sliderLabels">
              <span>1</span>
              <span>200</span>
              <span>400</span>
            </div>
          </div>
        )}

        {/* ── Beat accent blocks ── */}
        {stageMode ? null : (
          <div className="metronome__accentWrap">
            <div className="metronome__accentLabel">ACCENT MAP — TAP TO CYCLE</div>
            {animationStyle === 'blocks' ? (
              <BeatBlocksJuicy met={met} />
            ) : (
              <canvas ref={canvasRef} className="metronome__canvas" height={96} />
            )}
          </div>
        )}

        {/* ── Quick controls (tappable tiles) ── */}
        {stageMode || minimal ? null : (
          <div className="metronome__quickRow">
            <label className="metronome__label metronome__label--mini">
              TIME SIG
              <select className="metronome__select" value={met.timeSignature} onChange={(e) => met.setTimeSignature(e.target.value)}>
                <option value="2/4">2/4</option>
                <option value="3/4">3/4</option>
                <option value="4/4">4/4</option>
                <option value="5/4">5/4</option>
                <option value="3/8">3/8</option>
                <option value="5/8">5/8</option>
                <option value="6/8">6/8</option>
                <option value="7/8">7/8</option>
                <option value="9/8">9/8</option>
                <option value="12/8">12/8</option>
              </select>
            </label>
            <label className="metronome__label metronome__label--mini">
              SUBDIV
              <select className="metronome__select" value={met.subdivision} onChange={(e) => met.setSubdivision(e.target.value)}>
                <option value="quarter">Quarter</option>
                <option value="eighth">Eighth</option>
                <option value="triplet">Triplet</option>
                <option value="sixteenth">Sixteenth</option>
              </select>
            </label>
            <label className="metronome__label metronome__label--mini">
              SOUND
              <select className="metronome__select" value={met.sound} onChange={(e) => met.setSound(e.target.value)}>
                <option value="beep">Beep</option>
                <option value="voiceNumbers">Voice</option>
                <option value="voiceCount">Count</option>
              </select>
            </label>
          </div>
        )}

        {/* ── Accent cycle buttons (also appear in the new block UI above, but kept for settings drawer) ── */}

        <div className="metronome__controls">

          {/* Stage mode */}
          {stageMode ? (
            <div className="metronome__performance" role="region" aria-label="Performance Mode">
              <div className="metronome__performanceTop">
                <button type="button" className="metronome__btn" onClick={() => setStageMode(false)}>Exit</button>
                <div className="metronome__performanceDial">
                  <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} onTap={handleTap} />
                </div>
              </div>
              <div className="metronome__performanceSongWrap">
                <div className="metronome__performanceLabel">Current song</div>
                <div className="metronome__performanceSong">{currentStageSong?.name || '—'}</div>
                <div className="metronome__performanceMeta">
                  {stageSongs.length ? `Song ${stageIndex + 1} / ${stageSongs.length}` : 'No songs in setlist'}
                </div>
              </div>
              <button type="button" className="metronome__nextSongZone" onClick={goNextSong} disabled={!stageSongs.length}>
                Next Song
              </button>
            </div>
          ) : null}

          {stageMode || minimal ? null : (
            <div className="metronome__row">
              <div className="metronome__hint" aria-live="polite">{tapHint}</div>
              {stageMode ? null : (
                <button type="button" className="metronome__gearBtn metronome__gearBtn--under" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
                  ⚙ SETTINGS
                </button>
              )}
            </div>
          )}

          {stageMode || minimal ? null : (
            <div className="metronome__row metronome__row--presets">
              <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} />
            </div>
          )}
        </div>
      </section>
    </div>

        {settingsOpen ? (
          <div className="metronome__drawerBackdrop" role="dialog" aria-modal="true" aria-label="Settings">
            <button
              type="button"
              className="metronome__drawerScrim"
              aria-label="Close settings"
              onClick={() => setSettingsOpen(false)}
            />
            <div className="metronome__drawer">
              <div className="metronome__drawerHandle" />
              <div className="metronome__drawerHeader">
                <div className="metronome__drawerTitle">Settings</div>
                <button type="button" className="metronome__btn" onClick={() => setSettingsOpen(false)}>
                  Close
                </button>
              </div>

              <div className="metronome__drawerBody">
                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Subdivision settings</div>

                  <label className="metronome__label">
                    Rhythm
                    <select className="metronome__select" value={met.timeSignature} onChange={(e) => met.setTimeSignature(e.target.value)}>
                      <option value="2/4">2/4</option>
                      <option value="3/4">3/4</option>
                      <option value="4/4">4/4</option>
                      <option value="5/4">5/4 (3+2)</option>
                      <option value="3/8">3/8</option>
                      <option value="5/8">5/8 (2+3)</option>
                      <option value="6/8">6/8 (3+3)</option>
                      <option value="7/8">7/8 (2+2+3)</option>
                      <option value="9/8">9/8 (3+3+3)</option>
                      <option value="12/8">12/8 (3+3+3+3)</option>
                    </select>
                  </label>

                  <label className="metronome__label">
                    Subdivision
                    <select className="metronome__select" value={met.subdivision} onChange={(e) => met.setSubdivision(e.target.value)}>
                      <option value="quarter">Quarter</option>
                      <option value="eighth">Eighth</option>
                      <option value="triplet">Triplet</option>
                      <option value="sixteenth">Sixteenth</option>
                    </select>
                  </label>

                  <div className="metronome__label" style={{ marginTop: 10 }}>
                    Beat accents (tap to cycle)
                    <div className="metronome__accents" role="group" aria-label="Beat accents (tap to cycle)">
                      {(met.beatAccents || []).map((lvl, idx) => {
                        const numFilled = accentToNumeric(lvl)
                        const levelClass = `metronome__beat--${String(lvl || 'NORMAL').toLowerCase()}`
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`metronome__beat ${levelClass}`}
                            onClick={() => met.cycleBeatAccent(idx)}
                            title={`Beat ${idx + 1}: ${lvl}`}
                            aria-label={`Beat ${idx + 1} accent: ${lvl}`}
                          >
                            {[2, 1, 0].map((tier) => (
                              <div
                                key={tier}
                                className={`beat__block beat__block--b${tier} ${tier < numFilled ? 'beat__block--filled' : 'beat__block--empty'}`}
                              />
                            ))}
                            <div className="beat__label">{accentShortLabel(lvl)}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <label className="metronome__label">
                    Animation
                    <select className="metronome__select" value={animationStyle} onChange={(e) => setAnimationStyle(e.target.value)}>
                      <option value="pendulum">Pendulum</option>
                      <option value="ring">Progress ring</option>
                      <option value="blocks">Beat blocks</option>
                    </select>
                  </label>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Sound</div>

                  <label className="metronome__label">
                    Sound
                    <select className="metronome__select" value={met.sound} onChange={(e) => met.setSound(e.target.value)}>
                      <option value="beep">Beep</option>
                      <option value="voiceNumbers">Voice (numbers)</option>
                      <option value="voiceCount">Voice Counting (One–Four)</option>
                    </select>
                  </label>

                  <label className="metronome__label">
                    Pan
                    <input className="metronome__range" type="range" min={-1} max={1} step={0.01} value={met.pan} onChange={(e) => met.setPan(e.target.value)} />
                    <div className="metronome__rangeValue">{Number(met.pan).toFixed(2)}</div>
                  </label>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Rhythm trainer</div>

                  <label className="metronome__toggle metronome__toggle--inline">
                    <input
                      type="checkbox"
                      checked={met.rhythmTrainer?.enabled}
                      onChange={(e) => met.rhythmTrainer?.configure?.({ enabled: e.target.checked })}
                    />
                    <span>Enabled</span>
                  </label>

                  <label className="metronome__label">
                    Mode
                    <select
                      className="metronome__select"
                      value={met.rhythmTrainer?.mode}
                      onChange={(e) => met.rhythmTrainer?.configure?.({ mode: e.target.value })}
                    >
                      <option value="seconds">Seconds</option>
                      <option value="bars">Bars</option>
                    </select>
                  </label>

                  <div className="metronome__gapGrid">
                    <label className="metronome__label metronome__label--mini">
                      Start BPM
                      <Stepper
                        value={met.rhythmTrainer?.startBpm}
                        min={1}
                        max={400}
                        step={1}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ startBpm: v })}
                      />
                    </label>
                    <label className="metronome__label metronome__label--mini">
                      Target BPM
                      <Stepper
                        value={met.rhythmTrainer?.targetBpm}
                        min={1}
                        max={400}
                        step={1}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ targetBpm: v })}
                      />
                    </label>
                  </div>

                  {met.rhythmTrainer?.mode === 'seconds' ? (
                    <label className="metronome__label">
                      Duration (seconds)
                      <Stepper
                        value={met.rhythmTrainer?.durationSeconds}
                        min={5}
                        max={3600}
                        step={5}
                        format={(v) => `${Math.round(v)}s`}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ durationSeconds: v })}
                      />
                    </label>
                  ) : (
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Duration (bars)
                        <Stepper
                          value={met.rhythmTrainer?.durationBars}
                          min={1}
                          max={512}
                          step={1}
                          format={(v) => `${Math.round(v)}`}
                          onChange={(v) => met.rhythmTrainer?.configure?.({ durationBars: v })}
                        />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Bars per step
                        <Stepper
                          value={met.rhythmTrainer?.barsPerStep}
                          min={1}
                          max={64}
                          step={1}
                          format={(v) => `${Math.round(v)}`}
                          onChange={(v) => met.rhythmTrainer?.configure?.({ barsPerStep: v })}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Power features</div>

                  <label className="metronome__label">
                    Gap Training
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.internalClock.enabled} onChange={(e) => met.internalClock.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Bars Audible
                        <input className="metronome__range" type="range" min={1} max={16} value={met.internalClock.playBars} onChange={(e) => met.internalClock.setPlayBars(e.target.value)} />
                        <div className="metronome__rangeValue">{met.internalClock.playBars}</div>
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Bars Silent
                        <input className="metronome__range" type="range" min={0} max={16} value={met.internalClock.muteBars} onChange={(e) => met.internalClock.setMuteBars(e.target.value)} />
                        <div className="metronome__rangeValue">{met.internalClock.muteBars}</div>
                      </label>
                    </div>
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.internalClock.introEnabled} onChange={(e) => met.internalClock.setIntroEnabled(e.target.checked)} />
                      <span>Intro count-in (2 bars)</span>
                    </label>
                  </label>

                  <label className="metronome__label">
                    Polyrhythm
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.polyrhythm.enabled} onChange={(e) => met.polyrhythm.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Main beats
                        <Stepper value={met.polyrhythm.mainBeats} min={1} max={32} step={1} onChange={(v) => met.polyrhythm.setMainBeats(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Poly beats
                        <Stepper value={met.polyrhythm.polyBeats} min={1} max={32} step={1} onChange={(v) => met.polyrhythm.setPolyBeats(v)} />
                      </label>
                    </div>
                  </label>

                  <label className="metronome__label">
                    Automator
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.automator.enabled} onChange={(e) => met.automator.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Start BPM
                        <Stepper value={met.automator.startBpm} min={1} max={400} step={1} onChange={(v) => met.automator.setStartBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Target BPM
                        <Stepper value={met.automator.targetBpm} min={1} max={400} step={1} onChange={(v) => met.automator.setTargetBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Increment (BPM)
                        <Stepper value={met.automator.incrementBpm} min={0.5} max={50} step={0.5} format={(v) => `${Number(v).toFixed(1)}`} onChange={(v) => met.automator.setIncrementBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Change Every (Bars)
                        <Stepper value={met.automator.changeEveryBars} min={1} max={64} step={1} onChange={(v) => met.automator.setChangeEveryBars(v)} />
                      </label>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="metronome__stickyBar" role="group" aria-label="Playback controls">
          <button
            type="button"
            className="metronome__tapBtn"
            aria-label="Tap tempo"
            onClick={handleTap}
          >
            TAP
          </button>
          <button
            type="button"
            className={`metronome__fab ${met.isPlaying ? 'is-active' : ''}`}
            onTouchStart={() => {
              try {
                met.audio?.ensure?.()
              } catch {
                // ignore
              }
            }}
            onPointerUp={handlePlayFabPointerUp}
            onClick={handlePlayFabClick}
          >
            {met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            type="button"
            className="metronome__settingsBtn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            ⚙
          </button>
        </div>
    </>
  )
}

