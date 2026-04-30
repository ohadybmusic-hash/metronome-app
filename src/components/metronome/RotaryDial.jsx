import { useRef, useState } from 'react'
import { clamp } from '../../lib/clamp.js'
import { bpmToT, normalizeAngleRad, tToBpm } from '../../lib/metronome/bpmDial.js'

export function RotaryDial({ value, onChange, onTap, label = 'BPM', disabled = false }) {
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
            value={editing ? textValue : String(Math.round(value))}
            onChange={(e) => setTextValue(e.target.value)}
            onFocus={() => {
              setTextValue(String(Math.round(value)))
              setEditing(true)
            }}
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
