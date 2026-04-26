import { useRef } from 'react'
import { FILTER_MAX_HZ, FILTER_MIN_HZ, normToCutoff } from '../hooks/useSynth.js'

const DRAG_PX = 9

const VBW = 256
const VBH = 256
const C = VBW / 2
const R = 86
const STROKE = 12
const ANGLE0 = 2.4
const ANGLE1 = 0.1
const A_SPAN = ANGLE0 - ANGLE1

function describeArc(sx, sy, r, a0, a1) {
  const x0 = sx + r * Math.cos(a0)
  const y0 = sy + r * Math.sin(a0)
  const x1 = sx + r * Math.cos(a1)
  const y1 = sy + r * Math.sin(a1)
  const diff = a1 - a0
  const large = Math.abs(diff) > Math.PI ? 1 : 0
  const sweep = diff > 0 ? 1 : 0
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`
}

function formatHz(hz) {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`
  return `${Math.round(hz)} Hz`
}

function formatEndpoint(hz) {
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`
  return `${Math.round(hz)} Hz`
}

/**
 * Map pointer angle (atan2) to 0-1. Arc runs from ANGLE0 (low) to ANGLE1 (open).
 */
function pointerAngleToValue(a) {
  if (!Number.isFinite(a)) return 0.5
  let t = a
  if (t < 0) t += 2 * Math.PI
  if (t < ANGLE1) t = ANGLE1
  if (t > ANGLE0) t = ANGLE0
  const v = (ANGLE0 - t) / A_SPAN
  return Math.max(0, Math.min(1, v))
}

function wrapDelta(d) {
  if (d > Math.PI) return d - 2 * Math.PI
  if (d < -Math.PI) return d + 2 * Math.PI
  return d
}

export function FilterDial({ value, onChange, onUserGesture }) {
  const svgRef = useRef(null)
  const dragRef = useRef(null)

  const endA = ANGLE0 - A_SPAN * Math.max(0, Math.min(1, value))
  const track = describeArc(C, C, R, ANGLE0, ANGLE1)
  const progress = describeArc(C, C, R, ANGLE0, endA)
  const hx = C + (R - 6) * Math.cos(endA)
  const hy = C + (R - 6) * Math.sin(endA)
  const hz = formatHz(normToCutoff(value))

  const clientToAngle = (clientX, clientY) => {
    const el = svgRef.current
    if (!el) return 0
    const ctm = el.getScreenCTM()
    if (!ctm) {
      const rct = el.getBoundingClientRect()
      const s = rct.width / VBW
      const x = (clientX - rct.left) / s
      const y = (clientY - rct.top) / s
      return Math.atan2(y - C, x - C)
    }
    const p = el.createSVGPoint()
    p.x = clientX
    p.y = clientY
    const q = p.matrixTransform(ctm.inverse())
    return Math.atan2(q.y - C, q.x - C)
  }

  const toAngle = (e) => clientToAngle(e.clientX, e.clientY)

  const applyPointer = (e) => {
    const a0 = toAngle(e)
    const v0 = pointerAngleToValue(a0)
    if (!Number.isFinite(v0)) return
    onChange(v0)
    dragRef.current = {
      a0,
      v0,
      x0: e.clientX,
      y0: e.clientY,
      dragging: false,
    }
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* */
    }
    onUserGesture?.()
    applyPointer(e)
  }

  const onPointerMove = (e) => {
    const b = dragRef.current
    if (!b) return
    const dx = e.clientX - b.x0
    const dy = e.clientY - b.y0
    if (!b.dragging) {
      if (Math.hypot(dx, dy) < DRAG_PX) return
      b.dragging = true
    }
    const a = toAngle(e)
    const d = wrapDelta(a - b.a0)
    const v = Math.max(0, Math.min(1, b.v0 - d / A_SPAN))
    onChange(v)
  }

  const onPointerUp = (e) => {
    if (e.pointerId != null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* */
      }
    }
    dragRef.current = null
  }

  const minLabel = formatEndpoint(FILTER_MIN_HZ)
  const maxLabel = formatEndpoint(FILTER_MAX_HZ)
  const tickR = R + 4
  const t0x = C + tickR * Math.cos(ANGLE0)
  const t0y = C + tickR * Math.sin(ANGLE0)
  const t1x = C + tickR * Math.cos(ANGLE1)
  const t1y = C + tickR * Math.sin(ANGLE1)

  return (
    <div className="flex h-full w-full max-w-md flex-col items-center justify-center gap-1 px-3">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Filter cutoff
      </p>
      <div
        className="flex w-full max-w-[18rem] items-end justify-between px-0.5 text-[10px] tabular-nums text-zinc-500"
        aria-hidden
      >
        <span title={`Minimum: ${minLabel}`} className="shrink-0 text-left">
          {minLabel}
        </span>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="text-[9px] uppercase tracking-wider text-zinc-600">
            range
          </p>
        </div>
        <span title={`Maximum: ${maxLabel}`} className="shrink-0 text-right">
          {maxLabel}
        </span>
      </div>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
        {hz}
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VBW} ${VBH}`}
        className="max-h-[min(46vw,32vh)] w-full max-w-[min(92vw,320px)] select-none"
        style={{
          filter: 'drop-shadow(0 0 24px rgba(57, 255, 20, 0.12))',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label="Filter cutoff, logarithmic from minimum to maximum"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = 0.015
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(value - step)
            onUserGesture?.()
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(value + step)
            onUserGesture?.()
          }
        }}
      >
        <defs>
          <linearGradient id="neo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7bff5c" stopOpacity="1" />
            <stop offset="0.5" stopColor="#39ff14" stopOpacity="1" />
            <stop offset="1" stopColor="#1fa008" stopOpacity="0.95" />
          </linearGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <text
          x={t0x}
          y={t0y - 2}
          textAnchor="middle"
          className="fill-zinc-600"
          style={{ fontSize: 8 }}
        >
          Min
        </text>
        <text
          x={t1x}
          y={t1y - 2}
          textAnchor="middle"
          className="fill-zinc-600"
          style={{ fontSize: 8 }}
        >
          Max
        </text>
        <path
          d={describeArc(C, C, R + 14, ANGLE0, ANGLE1)}
          fill="none"
          stroke="rgba(57, 255, 20, 0.08)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <path
          d={track}
          fill="none"
          stroke="rgba(32, 32, 38, 0.98)"
          strokeWidth={STROKE + 2}
          strokeLinecap="round"
        />
        <path
          d={track}
          fill="none"
          stroke="rgba(55, 55, 64, 0.5)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={progress}
          fill="none"
          stroke="url(#neo)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          filter="url(#glow)"
        />
        <circle
          cx={C + (R + 1) * Math.cos(ANGLE0)}
          cy={C + (R + 1) * Math.sin(ANGLE0)}
          r="3.5"
          className="fill-zinc-600"
        />
        <circle
          cx={C + (R + 1) * Math.cos(ANGLE1)}
          cy={C + (R + 1) * Math.sin(ANGLE1)}
          r="3.5"
          className="fill-zinc-500"
        />
        <circle
          cx={hx}
          cy={hy}
          r={12}
          fill="#0a0a0c"
          stroke="#39ff14"
          strokeWidth={2.5}
          style={{ filter: 'drop-shadow(0 0 6px rgba(57, 255, 20, 0.4))' }}
        />
      </svg>
      <p className="px-2 text-center text-[10px] leading-snug text-zinc-500">
        Tap a point to jump, or drag. Left is minimum cutoff, right is maximum.
      </p>
    </div>
  )
}
