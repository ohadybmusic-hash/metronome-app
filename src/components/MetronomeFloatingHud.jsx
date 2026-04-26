import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Stepper from './Stepper.jsx'
import './MetronomeFloatingHud.css'

const STORAGE_KEY = 'metronome-float-hud-pos-v1'
const STORAGE_EXPANDED_KEY = 'metronome-float-hud-expanded-v1'
const DRAG_TOGGLE_PX = 8

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function getMetronomeFloatContainer() {
  if (typeof document === 'undefined' || !document.body) return null
  return document.getElementById('metronome-float-portal') ?? document.body
}

/**
 * Draggable overlay on non-metronome tabs: transport, BPM, beat, advanced mode flags, rhythm trainer.
 * @param {{ met: object, active?: boolean }} props
 */
export default function MetronomeFloatingHud({ met, active = true }) {
  const rootRef = useRef(null)
  const dragRef = useRef({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startLeft: 0,
    startTop: 0,
    didDrag: false,
  })
  const playFabSkipClickRef = useRef(false)
  const playFabLastPhysicalAt = useRef(0)

  /** null = use default bottom-right anchor */
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const p = JSON.parse(raw)
      if (typeof p?.left === 'number' && typeof p?.top === 'number') return p
    } catch {
      /* */
    }
    return null
  })

  const persistPos = useCallback((next) => {
    setPos(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* */
    }
  }, [])

  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const v = window.localStorage.getItem(STORAGE_EXPANDED_KEY)
      if (v === '0') return false
      if (v === '1') return true
    } catch {
      /* */
    }
    return true
  })

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_EXPANDED_KEY, next ? '1' : '0')
      } catch {
        /* */
      }
      return next
    })
  }, [])

  const onHandlePointerDown = useCallback(
    (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const el = rootRef.current
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      const rect = el.getBoundingClientRect()
      const d = dragRef.current
      d.pointerId = e.pointerId
      d.startClientX = e.clientX
      d.startClientY = e.clientY
      d.startLeft = pos ? pos.left : rect.left
      d.startTop = pos ? pos.top : rect.top
      d.didDrag = false
      if (!pos) {
        persistPos({ left: rect.left, top: rect.top })
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* */
      }
    },
    [pos, persistPos],
  )

  const onHandlePointerMove = useCallback((e) => {
    const d = dragRef.current
    if (d.pointerId !== e.pointerId) return
    const el = rootRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const dx = e.clientX - d.startClientX
    const dy = e.clientY - d.startClientY
    if (dx * dx + dy * dy > DRAG_TOGGLE_PX * DRAG_TOGGLE_PX) {
      d.didDrag = true
    }
    const nextLeft = clamp(d.startLeft + dx, 8, window.innerWidth - w - 8)
    const nextTop = clamp(d.startTop + dy, 8, window.innerHeight - h - 8)
    setPos({ left: nextLeft, top: nextTop })
  }, [])

  const flushPosFromDom = useCallback(() => {
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    persistPos({ left: rect.left, top: rect.top })
  }, [persistPos])

  const onHandlePointerUp = useCallback(
    (e) => {
      const d = dragRef.current
      if (d.pointerId !== e.pointerId) return
      const pid = d.pointerId
      d.pointerId = null
      try {
        e.currentTarget.releasePointerCapture(pid)
      } catch {
        /* */
      }
      if (!d.didDrag) {
        toggleExpanded()
      }
      flushPosFromDom()
    },
    [flushPosFromDom, toggleExpanded],
  )

  const onHandleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      toggleExpanded()
    },
    [toggleExpanded],
  )

  useEffect(() => {
    const onWin = () => {
      const el = rootRef.current
      if (!el || !pos) return
      const w = el.offsetWidth
      const h = el.offsetHeight
      const nextLeft = clamp(pos.left, 8, window.innerWidth - w - 8)
      const nextTop = clamp(pos.top, 8, window.innerHeight - h - 8)
      if (nextLeft !== pos.left || nextTop !== pos.top) {
        persistPos({ left: nextLeft, top: nextTop })
      }
    }
    window.addEventListener('resize', onWin)
    return () => window.removeEventListener('resize', onWin)
  }, [pos, persistPos])

  /** 1-based beat aligned to click time — `met.pulse` is updated for the *next* scheduled beat (lookahead), so it reads one ahead. */
  const [audibleBeat, setAudibleBeat] = useState(/** @type {number | null} */ (null))
  const beatTimersRef = useRef(/** @type {Set<ReturnType<typeof setTimeout>>} */ (new Set()))
  const getAudioTimeRef = useRef(met?.audioClock?.getAudioTime)

  useEffect(() => {
    getAudioTimeRef.current = met?.audioClock?.getAudioTime
  })

  useEffect(() => {
    const clearTimers = () => {
      for (const id of beatTimersRef.current) {
        window.clearTimeout(id)
      }
      beatTimersRef.current.clear()
    }

    if (!met?.isPlaying || typeof met?.events?.onScheduledBeat !== 'function') {
      clearTimers()
      setAudibleBeat(null)
      return undefined
    }

    const unsub = met.events.onScheduledBeat((evt) => {
      const getT = getAudioTimeRef.current
      if (typeof getT !== 'function') return
      const nowAudio = getT()
      if (nowAudio == null) return
      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)
      const tid = window.setTimeout(() => {
        beatTimersRef.current.delete(tid)
        const n = Number(evt?.pulseNumber)
        if (Number.isFinite(n) && n >= 1) setAudibleBeat(n)
      }, delayMs)
      beatTimersRef.current.add(tid)
    })

    return () => {
      unsub?.()
      clearTimers()
      setAudibleBeat(null)
    }
  }, [met?.isPlaying, met?.events])

  const runPlayUserAction = useCallback(
    (e) => {
      if (e?.pointerType === 'mouse' && e.button !== 0) return
      const now = performance.now()
      if (playFabLastPhysicalAt.current > 0 && now - playFabLastPhysicalAt.current < 50) return
      playFabLastPhysicalAt.current = now

      playFabSkipClickRef.current = true
      window.setTimeout(() => {
        playFabSkipClickRef.current = false
      }, 500)
      try {
        met?.audio?.ensure?.()
      } catch {
        /* */
      }
      met?.toggle?.()
    },
    [met],
  )

  const onPlayClick = useCallback(
    (e) => {
      if (playFabSkipClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      try {
        met?.audio?.ensure?.()
      } catch {
        /* */
      }
      met?.toggle?.()
    },
    [met],
  )

  if (!active || !met) return null

  const target = getMetronomeFloatContainer()
  if (!target) return null

  const bpm = Math.round(Number(met.bpm) || 0)
  const beats = Math.max(1, Number(met.pulsesPerMeasure) || 1)
  const cycleLabel =
    met.isPlaying && audibleBeat != null ? `${audibleBeat} / ${beats}` : `— / ${beats}`

  const rt = met.rhythmTrainer
  const advOther = []
  if (met.automator?.enabled) advOther.push('Automator')
  if (met.polyrhythm?.enabled) advOther.push('Polyrhythm')
  if (met.internalClock?.enabled) advOther.push('Gap')

  const playLabel = met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE' : 'PLAY'

  const style = pos
    ? { left: pos.left, top: pos.top, right: 'auto', bottom: 'auto' }
    : undefined

  return createPortal(
    <div
      ref={rootRef}
      className={`metronomeFloatHud${expanded ? ' metronomeFloatHud--expanded' : ' metronomeFloatHud--compact'}${pos ? '' : ' metronomeFloatHud--anchorBr'}`}
      style={style}
      role="region"
      aria-label="Metronome quick controls"
    >
      <div className="metronomeFloatHud__mainRow">
        <button
          type="button"
          className="metronomeFloatHud__handle"
          aria-label={expanded ? 'Minimize bar (or drag to move)' : 'Expand bar (or drag to move)'}
          aria-expanded={expanded}
          title={expanded ? 'Tap: smaller · Drag: move' : 'Tap: full · Drag: move'}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onKeyDown={onHandleKeyDown}
        >
          <span className="metronomeFloatHud__grip" aria-hidden />
        </button>
        <button
          type="button"
          className="metronomeFloatHud__step"
          aria-label="Decrease BPM by 1"
          onClick={(e) => {
            e.stopPropagation()
            met.setBpm(bpm - 1)
          }}
        >
          −
        </button>
        <div className="metronomeFloatHud__center">
          <div className="metronomeFloatHud__bpm">
            <span className="metronomeFloatHud__bpmVal">{bpm}</span>
            <span className="metronomeFloatHud__bpmUnit">BPM</span>
          </div>
          <div className="metronomeFloatHud__cycle" aria-live="polite">
            Beat <span className="metronomeFloatHud__cycleNums">{cycleLabel}</span>
          </div>
        </div>
        <button
          type="button"
          className="metronomeFloatHud__step"
          aria-label="Increase BPM by 1"
          onClick={(e) => {
            e.stopPropagation()
            met.setBpm(bpm + 1)
          }}
        >
          +
        </button>
        <button
          type="button"
          className={`metronomeFloatHud__play ${met.isPlaying || met.countIn?.active ? 'metronomeFloatHud__play--on' : ''}`}
          aria-label={playLabel}
          title={playLabel}
          onTouchStart={() => {
            try {
              met?.audio?.ensure?.()
            } catch {
              /* */
            }
          }}
          onPointerUp={runPlayUserAction}
          onTouchEnd={runPlayUserAction}
          onClick={onPlayClick}
        >
          {playLabel}
        </button>
      </div>

      <div className="metronomeFloatHud__footer">
        <div className="metronomeFloatHud__flags" aria-label="Advanced modes">
          <span
            className={`metronomeFloatHud__flag ${rt?.enabled ? 'metronomeFloatHud__flag--on' : 'metronomeFloatHud__flag--off'}`}
          >
            Rhythm trainer {rt?.enabled ? 'on' : 'off'}
          </span>
          {advOther.map((label) => (
            <span key={label} className="metronomeFloatHud__flag metronomeFloatHud__flag--on">
              {label}
            </span>
          ))}
        </div>

        <details className="metronomeFloatHud__details" onClick={(e) => e.stopPropagation()}>
          <summary className="metronomeFloatHud__summary">Rhythm trainer settings</summary>
          <div className="metronomeFloatHud__panel">
            <label className="metronomeFloatHud__toggle">
              <input
                type="checkbox"
                checked={Boolean(rt?.enabled)}
                onChange={(e) => rt?.configure?.({ enabled: e.target.checked })}
              />
              <span>Enabled</span>
            </label>

            <label className="metronomeFloatHud__field">
              <span className="metronomeFloatHud__fieldLabel">Mode</span>
              <select
                className="metronomeFloatHud__select"
                value={rt?.mode ?? 'seconds'}
                onChange={(e) => rt?.configure?.({ mode: e.target.value })}
              >
                <option value="seconds">Seconds</option>
                <option value="bars">Bars</option>
              </select>
            </label>

            <label className="metronomeFloatHud__field">
              <span className="metronomeFloatHud__fieldLabel">Start BPM</span>
              <Stepper
                value={rt?.startBpm ?? bpm}
                min={1}
                max={400}
                step={1}
                onChange={(v) => rt?.configure?.({ startBpm: v })}
              />
            </label>

            <label className="metronomeFloatHud__toggle">
              <input
                type="checkbox"
                checked={Boolean(rt?.targetEnabled)}
                onChange={(e) => rt?.configure?.({ targetEnabled: e.target.checked })}
              />
              <span>Target BPM (stop at goal)</span>
            </label>

            {rt?.targetEnabled ? (
              <label className="metronomeFloatHud__field">
                <span className="metronomeFloatHud__fieldLabel">Target BPM</span>
                <Stepper
                  value={rt?.targetBpm ?? bpm}
                  min={1}
                  max={400}
                  step={1}
                  onChange={(v) => rt?.configure?.({ targetBpm: v })}
                />
              </label>
            ) : null}

            <label className="metronomeFloatHud__field">
              <span className="metronomeFloatHud__fieldLabel">Increment (BPM / step)</span>
              <Stepper
                value={rt?.incrementBpm ?? 1}
                min={0.5}
                max={50}
                step={0.5}
                format={(v) => `${Number(v).toFixed(1)}`}
                onChange={(v) => rt?.configure?.({ incrementBpm: v })}
              />
            </label>

            {rt?.mode === 'seconds' ? (
              <label className="metronomeFloatHud__field">
                <span className="metronomeFloatHud__fieldLabel">Every (seconds)</span>
                <Stepper
                  value={rt?.everySeconds ?? 5}
                  min={1}
                  max={600}
                  step={1}
                  format={(v) => `${Math.round(v)}s`}
                  onChange={(v) => rt?.configure?.({ everySeconds: v })}
                />
              </label>
            ) : (
              <label className="metronomeFloatHud__field">
                <span className="metronomeFloatHud__fieldLabel">Every (bars)</span>
                <Stepper
                  value={rt?.everyBars ?? 1}
                  min={1}
                  max={64}
                  step={1}
                  onChange={(v) => rt?.configure?.({ everyBars: v })}
                />
              </label>
            )}
          </div>
        </details>
      </div>
    </div>,
    target,
  )
}
