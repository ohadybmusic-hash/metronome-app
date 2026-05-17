import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { WaveformCanvas } from './WaveformCanvas.jsx'

/** @typedef {'osc' | 'vcf' | 'env'} SynthwaveSynthScroll */

const WF_PADS = [
  { id: 'sine', label: 'SINE', icon: 'waves', primary: true },
  { id: 'sawtooth', label: 'SAW', icon: 'show_chart', primary: false },
  { id: 'square', label: 'SQUARE', icon: 'stop', primary: false },
  { id: 'triangle', label: 'NOISE', icon: 'grain', primary: false },
]

/** @typedef {{ attack: number, decay: number, sustain: number, release: number }} AdsrLike */
/** @typedef {'attack' | 'decay' | 'sustain' | 'release'} AdsrKey */

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0))
}

function clamp(n, lo, hi) {
  const x = Number(n)
  if (!Number.isFinite(x)) return lo
  return Math.max(lo, Math.min(hi, x))
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function invLerp(a, b, v) {
  if (a === b) return 0
  return (v - a) / (b - a)
}

/** Round a number to the nearest step, clamp to [min,max]. */
function quantizeClamp(v, min, max, step) {
  const s = Math.max(1e-9, Number(step) || 0.01)
  const q = Math.round(v / s) * s
  // Keep 3 decimals max (matches existing bars)
  return Math.round(clamp(q, min, max) * 1000) / 1000
}

const ADSR_RANGES = /** @type {const} */ ({
  attack: { min: 0.005, max: 1, step: 0.005, x0: 10, x1: 30 },
  decay: { min: 0.01, max: 1, step: 0.01, x0: 30, x1: 70 },
  sustain: { min: 0, max: 1, step: 0.02, y0: 44, y1: 14 }, // higher sustain -> higher on graph (smaller y)
  release: { min: 0.02, max: 2, step: 0.02, x0: 70, x1: 98 },
})

/**
 * @param {{
 *   label: string,
 *   paramKey: keyof AdsrLike,
 *   value: number,
 *   min: number,
 *   max: number,
 *   round: number,
 *   onChange: (key: keyof AdsrLike, v: number) => void,
 *   activeKey?: AdsrKey,
 *   onSelectKey?: (k: AdsrKey) => void,
 *   onUserGesture?: () => void,
 * }} props
 */
function SynthwaveAdsrBar({
  label,
  paramKey,
  value,
  min,
  max,
  round,
  onChange,
  activeKey,
  onSelectKey,
  onUserGesture,
}) {
  const frac = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const isMagenta = paramKey === 'attack' || paramKey === 'decay'
  const isSelected = activeKey === paramKey

  return (
    <div className="flex min-h-[100px] flex-col items-center justify-end gap-1 pb-px">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        className="relative mb-px w-[18px] touch-none rounded-full border border-primary-container/20 bg-black/40 p-[3px]"
        style={{
          flex: '1 1 auto',
          minHeight: '88px',
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          e.preventDefault()
          onUserGesture?.()
          /** @type {HTMLElement} */ (e.currentTarget).setPointerCapture(e.pointerId)
          const rect = e.currentTarget.getBoundingClientRect()
          const t = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height))
          const raw = min + t * (max - min)
          const v = Math.round((raw / round) * round * 1000) / 1000
          onChange(paramKey, Math.max(min, Math.min(max, v)))
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return
          if (!/** @type {HTMLElement} */ (e.currentTarget)?.hasPointerCapture?.(e.pointerId)) return
          onUserGesture?.()
          const rect = e.currentTarget.getBoundingClientRect()
          const t = Math.max(0, Math.min(1, (rect.bottom - e.clientY) / rect.height))
          const raw = min + t * (max - min)
          const v = Math.round((raw / round) * round * 1000) / 1000
          onChange(paramKey, Math.max(min, Math.min(max, v)))
        }}
        onPointerUp={(e) => {
          try {
            ;(/** @type {HTMLElement} */ (e.currentTarget)).releasePointerCapture(e.pointerId)
          } catch {
            /* */
          }
        }}
        onPointerCancel={(e) => {
          try {
            ;(/** @type {HTMLElement} */ (e.currentTarget)).releasePointerCapture(e.pointerId)
          } catch {
            /* */
          }
        }}
      >
        <div
          className={`pointer-events-none absolute left-1/2 inline-block max-w-[12px] -translate-x-1/2 rounded ${
            isMagenta
              ? 'bg-primary-container shadow-[0_0_8px_rgb(255_0_255_/_0.55)]'
              : 'bg-secondary-container shadow-[0_0_8px_rgb(0_251_251_/_0.6)]'
          }`}
          style={{
            height: '8px',
            width: 'calc(100% - 6px)',
            bottom: `${2 + frac * 78}%`,
          }}
        />
      </div>
      <button
        type="button"
        className={`text-[9px] font-bold uppercase ${
          isMagenta ? 'text-pink-500' : 'text-cyan-400'
        } ${isSelected ? 'drop-shadow-[0_0_6px_rgb(255_0_255_/_0.55)]' : ''}`}
        onClick={() => onSelectKey?.(/** @type {AdsrKey} */ (paramKey))}
        aria-pressed={isSelected}
        aria-label={`Select ${label}`}
      >
        {label}
      </button>
    </div>
  )
}

/**
 * @param {{
 *   filterNorm: number,
 *   setFilterFromNorm: (n: number) => void,
 *   onUserGesture?: () => void,
 * }} props
 */
function SynthwaveCutoffKnob({ filterNorm, setFilterFromNorm, onUserGesture }) {
  const needleDeg = filterNorm * 280 - 140
  const dragRef = useRef(/** @type {{ pid: number, y0: number, v0: number } | null} */ (null))

  return (
    <button
      type="button"
      aria-label="Filter cutoff — drag up or down while held"
      className="relative flex h-12 w-12 shrink-0 cursor-ns-resize touch-none items-center justify-center rounded-full border-2 bg-[conic-gradient(from_0deg,#1a1a2a,#333345,#1a1a2a)] shadow-[0_0_14px_rgb(0_251_251_/_0.36)] outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      style={{ borderColor: 'rgb(0 251 251 / 0.48)' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        dragRef.current = { pid: e.pointerId, y0: e.clientY, v0: filterNorm }
        e.currentTarget.setPointerCapture(e.pointerId)
        onUserGesture?.()
      }}
      onPointerMove={(e) => {
        const b = dragRef.current
        if (!b || e.pointerId !== b.pid || e.buttons !== 1) return
        const dy = b.y0 - e.clientY
        setFilterFromNorm(Math.max(0, Math.min(1, b.v0 + dy * 0.006)))
      }}
      onPointerUp={(e) => {
        const b = dragRef.current
        if (b && e.pointerId === b.pid) dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* */
        }
      }}
      onPointerCancel={(e) => {
        dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* */
        }
      }}
    >
      <span
        className="pointer-events-none absolute left-1/2 top-2 block h-[14px] w-1 rounded-full bg-secondary-fixed shadow-[0_0_6px_#00fbfb]"
        style={{
          transform: `translateX(-50%) rotate(${needleDeg}deg)`,
          transformOrigin: '50% calc(100% - 4px)',
        }}
        aria-hidden
      />
    </button>
  )
}

function SynthwaveResoKnob({ qNorm, setQFromNorm, onUserGesture }) {
  const needleDeg = qNorm * 280 - 140
  const dragRef = useRef(/** @type {{ pid: number, y0: number, v0: number } | null} */ (null))
  return (
    <button
      type="button"
      aria-label="Filter resonance — drag up or down while held"
      className="relative flex h-12 w-12 shrink-0 cursor-ns-resize touch-none items-center justify-center rounded-full border-2 bg-[conic-gradient(from_0deg,#1a1a2a,#333345,#1a1a2a)] shadow-[0_0_14px_rgb(0_251_251_/_0.22)] outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40"
      style={{ borderColor: 'rgb(236 72 153 / 0.55)' }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        dragRef.current = { pid: e.pointerId, y0: e.clientY, v0: qNorm }
        e.currentTarget.setPointerCapture(e.pointerId)
        onUserGesture?.()
      }}
      onPointerMove={(e) => {
        const b = dragRef.current
        if (!b || e.pointerId !== b.pid || e.buttons !== 1) return
        const dy = b.y0 - e.clientY
        setQFromNorm(Math.max(0, Math.min(1, b.v0 + dy * 0.006)))
      }}
      onPointerUp={(e) => {
        const b = dragRef.current
        if (b && e.pointerId === b.pid) dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* */
        }
      }}
      onPointerCancel={(e) => {
        dragRef.current = null
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* */
        }
      }}
    >
      <span
        className="pointer-events-none absolute left-1/2 top-2 block h-[14px] w-1 rounded-full bg-primary-container shadow-[0_0_7px_#ff00ff]"
        style={{
          transform: `translateX(-50%) rotate(${needleDeg}deg)`,
          transformOrigin: '50% calc(100% - 4px)',
        }}
        aria-hidden
      />
    </button>
  )
}

/**
 * Stitch synthwave piano rack — scope + oscillator + VCF + ADSR for OSC1.
 *
 * @param {object} props
 * @param {import('react').RefObject<AnalyserNode | null>} props.analyserRef
 * @param {number} props.filterNorm
 * @param {(n: number) => void} props.setFilterFromNorm
 * @param {number} props.filterQNorm
 * @param {(n: number) => void} props.setFilterQFromNorm
 * @param {{ waveform: string, adsr: AdsrLike }} props.osc1
 * @param {(fn: (o: object) => object) => void} props.setOsc1
 * @param {() => void} props.onUserGesture
 * @param {SynthwaveSynthScroll|'fx'} [props.highlightSection]
 */
export function SynthwaveSynthRack({
  analyserRef,
  filterNorm,
  setFilterFromNorm,
  filterQNorm,
  setFilterQFromNorm,
  osc1,
  setOsc1,
  onUserGesture,
  highlightSection = 'osc',
}) {
  const gradId = useId().replace(/:/g, '')

  useEffect(() => {
    if (!highlightSection || highlightSection === 'fx') return
    const id = `sw-synth-${highlightSection}`
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }, [highlightSection])

  const adsr = osc1.adsr
  /** @type {(key: keyof AdsrLike, v: number) => void} */
  const setAdsrKV = (key, v) => {
    setOsc1((o) => ({ ...o, adsr: { ...o.adsr, [key]: v } }))
  }

  const [activeEnvKey, setActiveEnvKey] = useState(/** @type {AdsrKey} */ ('attack'))

  const envGraph = useMemo(() => {
    const a = clamp(adsr.attack, ADSR_RANGES.attack.min, ADSR_RANGES.attack.max)
    const d = clamp(adsr.decay, ADSR_RANGES.decay.min, ADSR_RANGES.decay.max)
    const s = clamp01(adsr.sustain)
    const r = clamp(adsr.release, ADSR_RANGES.release.min, ADSR_RANGES.release.max)

    const xA = lerp(
      ADSR_RANGES.attack.x0,
      ADSR_RANGES.attack.x1,
      clamp01(invLerp(ADSR_RANGES.attack.min, ADSR_RANGES.attack.max, a)),
    )
    const xD = lerp(
      ADSR_RANGES.decay.x0,
      ADSR_RANGES.decay.x1,
      clamp01(invLerp(ADSR_RANGES.decay.min, ADSR_RANGES.decay.max, d)),
    )
    const xR = lerp(
      ADSR_RANGES.release.x0,
      ADSR_RANGES.release.x1,
      clamp01(invLerp(ADSR_RANGES.release.min, ADSR_RANGES.release.max, r)),
    )
    const yS = lerp(ADSR_RANGES.sustain.y0, ADSR_RANGES.sustain.y1, s)

    // Peak rises when sustain is low (matches existing feel).
    const peak = Math.max(6, Math.min(30, (1 - s * 0.85) * 28))

    // Keep points ordered and readable.
    const xAttack = Math.max(8, Math.min(34, xA))
    const xDecay = Math.max(xAttack + 10, Math.min(78, xD))
    const xRelease = Math.max(xDecay + 8, Math.min(98, xR))

    return {
      xAttack,
      xDecay,
      xRelease,
      peakY: peak,
      sustainY: yS,
    }
  }, [adsr.attack, adsr.decay, adsr.release, adsr.sustain])

  const envDragRef = useRef(
    /** @type {{ pid: number, key: AdsrKey, rect: DOMRect } | null} */ (null),
  )

  const applyEnvPointFromClient = (clientX, clientY, key, rect) => {
    const nx = clamp01((clientX - rect.left) / rect.width)
    const ny = clamp01((clientY - rect.top) / rect.height)
    const x = nx * 100
    const y = ny * 54

    if (key === 'attack') {
      const t = clamp01(invLerp(ADSR_RANGES.attack.x0, ADSR_RANGES.attack.x1, x))
      const v = quantizeClamp(lerp(ADSR_RANGES.attack.min, ADSR_RANGES.attack.max, t), ADSR_RANGES.attack.min, ADSR_RANGES.attack.max, ADSR_RANGES.attack.step)
      setAdsrKV('attack', v)
      return
    }
    if (key === 'decay') {
      const t = clamp01(invLerp(ADSR_RANGES.decay.x0, ADSR_RANGES.decay.x1, x))
      const v = quantizeClamp(lerp(ADSR_RANGES.decay.min, ADSR_RANGES.decay.max, t), ADSR_RANGES.decay.min, ADSR_RANGES.decay.max, ADSR_RANGES.decay.step)
      setAdsrKV('decay', v)
      return
    }
    if (key === 'release') {
      const t = clamp01(invLerp(ADSR_RANGES.release.x0, ADSR_RANGES.release.x1, x))
      const v = quantizeClamp(lerp(ADSR_RANGES.release.min, ADSR_RANGES.release.max, t), ADSR_RANGES.release.min, ADSR_RANGES.release.max, ADSR_RANGES.release.step)
      setAdsrKV('release', v)
      return
    }
    // sustain (y inverted)
    const t = clamp01(invLerp(ADSR_RANGES.sustain.y0, ADSR_RANGES.sustain.y1, y))
    const v = quantizeClamp(t, ADSR_RANGES.sustain.min, ADSR_RANGES.sustain.max, ADSR_RANGES.sustain.step)
    setAdsrKV('sustain', v)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden pb-3 pt-0 [-webkit-overflow-scrolling:touch]">
      <section
        id="sw-synth-osc"
        className="lcd-inset-sw relative mb-px flex min-h-[128px] flex-col rounded-lg border border-cyan-500/35 bg-surface-container-lowest"
      >
        <div className="relative z-[1] h-[calc(100%-72px)] min-h-[94px] w-full shrink-0 p-2">
          <WaveformCanvas analyserRef={analyserRef} tone="synthwave" />
        </div>
        <div className="pointer-events-none absolute left-3 right-3 top-[5.75rem] z-[2] flex h-14 items-end justify-center gap-px sm:gap-0.5">
          {[12, 20, 30, 16, 26, 10, 20, 32, 24, 14].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-[1px] bg-secondary-fixed shadow-[0_0_6px_rgb(0_251_251_/_0.55)] sm:w-1.5"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <div className="absolute left-3 right-3 top-2 z-[3] flex items-start justify-between text-[10px]">
          <span className="font-bold uppercase tracking-widest text-secondary-fixed">Live Waveform</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-error" />
            <span className="font-bold uppercase tracking-wider text-error">Active</span>
          </span>
        </div>
        <div className="absolute bottom-1.5 left-3 right-3 z-[3] flex justify-between font-label-sm text-[8px] uppercase text-cyan-900/65">
          <span>20Hz</span>
          <span>1.2kHz</span>
          <span>22kHz</span>
        </div>
      </section>

      <div id="sw-synth-vcf" className="grid h-[10.5rem] shrink-0 grid-cols-2 gap-2">
        <section className="flex flex-col gap-1.5 rounded-lg border border-cyan-500/25 bg-surface-container p-2">
          <h3 className="border-b border-primary-fixed-dim/25 pb-0.5 font-label-sm text-[10px] font-bold uppercase tracking-[0.2em] text-primary-fixed-dim">
            OSCILLATOR 01
          </h3>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
            {WF_PADS.map((w) => {
              const on = osc1.waveform === w.id
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    setOsc1((o) => ({ ...o, waveform: w.id }))
                  }}
                  aria-pressed={on}
                  className={`flex min-h-[2.85rem] flex-col items-center justify-center gap-0.5 rounded active:scale-95 ${
                    on && w.primary
                      ? 'glow-pink-sw bg-primary-container text-on-primary-container'
                      : on
                        ? 'border border-primary/35 bg-surface-container-high text-primary shadow-[inset_0_0_0_1px_rgb(var(--ds-primary-rgb)/0.2)]'
                        : 'border border-primary/28 bg-surface-container-high text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden>
                    {w.icon}
                  </span>
                  <span className="text-[9px] font-bold">{w.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-1.5 rounded-lg border border-cyan-500/25 bg-surface-container p-2">
          <h3 className="border-b border-secondary-fixed/22 pb-0.5 text-center font-label-sm text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-fixed">
            VCF FILTER
          </h3>
          <div className="flex flex-1 items-center justify-around gap-3">
            <div className="flex flex-col items-center gap-1">
              <SynthwaveCutoffKnob
                filterNorm={filterNorm}
                setFilterFromNorm={setFilterFromNorm}
                onUserGesture={onUserGesture}
              />
              <span className="text-[8px] font-bold uppercase tracking-tighter text-secondary-fixed">Cutoff</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <SynthwaveResoKnob qNorm={filterQNorm} setQFromNorm={setFilterQFromNorm} onUserGesture={onUserGesture} />
              <span className="text-[8px] font-bold uppercase tracking-tighter text-secondary-fixed">Reso</span>
            </div>
          </div>
        </section>
      </div>

      <section
        id="sw-synth-env"
        className="flex shrink-0 flex-col gap-2 rounded-lg border border-pink-500/28 bg-surface-container-low p-2 pb-5"
      >
        <div className="flex items-center justify-between border-b border-pink-500/12 pb-1">
          <h3 className="font-label-sm text-[10px] font-bold uppercase tracking-[0.2em] text-primary-fixed">
            ADSR ENVELOPE
          </h3>
          <div className="flex gap-2">
            <span
              className="h-3 w-1 shadow-[0_0_5px_#ff00ff]"
              style={{ background: 'var(--ds-primary-container)' }}
            />
            <span className="h-3 w-1 bg-secondary-container shadow-[0_0_5px_#00fbfb]" />
          </div>
        </div>
        <div className="flex min-h-[8.5rem] flex-1 gap-3">
          <div className="lcd-inset-sw relative min-h-[120px] min-w-0 flex-1 overflow-hidden rounded border border-primary/28 bg-surface-container-highest">
            <svg
              className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)]"
              viewBox="0 0 100 54"
              preserveAspectRatio="none"
              role="application"
              aria-label="ADSR envelope graph"
              onPointerDown={(e) => {
                if (e.button !== 0) return
                onUserGesture?.()
                const rect = e.currentTarget.getBoundingClientRect()
                envDragRef.current = { pid: e.pointerId, key: activeEnvKey, rect }
                e.currentTarget.setPointerCapture(e.pointerId)
                applyEnvPointFromClient(e.clientX, e.clientY, activeEnvKey, rect)
              }}
              onPointerMove={(e) => {
                const s = envDragRef.current
                if (!s || s.pid !== e.pointerId || e.buttons !== 1) return
                onUserGesture?.()
                applyEnvPointFromClient(e.clientX, e.clientY, s.key, s.rect)
              }}
              onPointerUp={(e) => {
                const s = envDragRef.current
                if (s && s.pid === e.pointerId) envDragRef.current = null
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId)
                } catch {
                  /* */
                }
              }}
              onPointerCancel={() => {
                envDragRef.current = null
              }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff00ff" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#ff00ff" stopOpacity="0.18" />
                </linearGradient>
              </defs>
              <polygon
                fill={`url(#${gradId})`}
                points={`0 52 ${envGraph.xAttack},${envGraph.peakY}, ${envGraph.xDecay},${envGraph.sustainY} ${envGraph.xRelease},${envGraph.sustainY} 100 52`}
                opacity="0.85"
              />
              <polyline
                fill="none"
                stroke="#ff00ff"
                strokeWidth="2"
                points={`2 52 ${envGraph.xAttack},${envGraph.peakY}, ${envGraph.xDecay},${envGraph.sustainY} ${envGraph.xRelease},${envGraph.sustainY} 97 52`}
              />

              {/* Handles */}
              {(
                [
                  { k: 'attack', cx: envGraph.xAttack, cy: envGraph.peakY, c: 'fill-secondary-fixed' },
                  { k: 'decay', cx: envGraph.xDecay, cy: envGraph.sustainY, c: 'fill-secondary-fixed' },
                  { k: 'sustain', cx: Math.min(92, envGraph.xDecay + 14), cy: envGraph.sustainY, c: 'fill-secondary-fixed' },
                  { k: 'release', cx: envGraph.xRelease, cy: envGraph.sustainY, c: 'fill-secondary-fixed' },
                ]
              ).map((h) => {
                const isActive = activeEnvKey === h.k
                return (
                  <circle
                    key={h.k}
                    className={`${h.c} ${isActive ? 'drop-shadow-[0_0_8px_rgb(0_251_251_/_0.95)]' : 'drop-shadow-[0_0_4px_rgb(0_251_251_/_0.8)]'}`}
                    cx={h.cx}
                    cy={h.cy}
                    r={isActive ? 3.2 : 2.6}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      e.stopPropagation()
                      onUserGesture?.()
                      setActiveEnvKey(/** @type {AdsrKey} */ (h.k))
                      const svg = e.currentTarget.ownerSVGElement
                      const rect = svg?.getBoundingClientRect?.()
                      if (!rect) return
                      envDragRef.current = { pid: e.pointerId, key: /** @type {AdsrKey} */ (h.k), rect }
                      // Capture on the SVG so its onPointerMove handler runs for dragging.
                      svg?.setPointerCapture?.(e.pointerId)
                      applyEnvPointFromClient(e.clientX, e.clientY, /** @type {AdsrKey} */ (h.k), rect)
                    }}
                  />
                )
              })}
            </svg>
          </div>
          <div className="flex h-full shrink-0 items-end justify-between gap-1.5 pr-px pl-0.5" role="group" aria-label="ADSR sliders">
            <div className="sr-only" aria-live="polite">
              Selected: {activeEnvKey}
            </div>
            <SynthwaveAdsrBar
              label="A"
              paramKey="attack"
              value={adsr.attack}
              min={0.005}
              max={1}
              round={0.005}
              onChange={setAdsrKV}
              activeKey={activeEnvKey}
              onSelectKey={(k) => setActiveEnvKey(k)}
              onUserGesture={onUserGesture}
            />
            <SynthwaveAdsrBar
              label="D"
              paramKey="decay"
              value={adsr.decay}
              min={0.01}
              max={1}
              round={0.01}
              onChange={setAdsrKV}
              activeKey={activeEnvKey}
              onSelectKey={(k) => setActiveEnvKey(k)}
              onUserGesture={onUserGesture}
            />
            <SynthwaveAdsrBar
              label="S"
              paramKey="sustain"
              value={adsr.sustain}
              min={0}
              max={1}
              round={0.02}
              onChange={setAdsrKV}
              activeKey={activeEnvKey}
              onSelectKey={(k) => setActiveEnvKey(k)}
              onUserGesture={onUserGesture}
            />
            <SynthwaveAdsrBar
              label="R"
              paramKey="release"
              value={adsr.release}
              min={0.02}
              max={2}
              round={0.02}
              onChange={setAdsrKV}
              activeKey={activeEnvKey}
              onSelectKey={(k) => setActiveEnvKey(k)}
              onUserGesture={onUserGesture}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
