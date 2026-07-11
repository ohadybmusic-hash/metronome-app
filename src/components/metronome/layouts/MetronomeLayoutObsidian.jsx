import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveBeatIndex } from '../../../hooks/useLiveBeatIndex.js'
import { bpmToT, normalizeAngleRad, tToBpm } from '../../../lib/metronome/bpmDial.js'
import { cycleSubdivision, cycleTimeSignature, METRONOME_TIME_SIGNATURES } from '../../../lib/metronome/meterCycle.js'
import { RotaryDial } from '../RotaryDial.jsx'

/** Stitch export `01-metronome-wheel.html` — console texture (hosted). */
const STITCH_CONSOLE_TEXTURE =
  'https://lh3.googleusercontent.com/aida/ADBb0ujqXhkLf6vQ-_YuIdFegcXwB70Z7W9tGH31svEy-6jm1pmNdUqbmItFnJXFwAwHfqbe0sEpn3Gte9_P8RmgoGS7kA0mkuygaN3fyLllHyQbRKxo9x2Css0t-usJmbEf__IhSLDqCfB9uNV0al0g6SPgc87_6NK8VZxDCpcX7t88rYBc2bEltyeLx1Y5u8uM2BA2p9REDKwbOnDcbCErsUYmSlj9uy1-bOd30ILKjYHXrvXUvCpIt0Xk_oz2bhV5dHkXNNMYHH8j29I'

const SUBDIVISION_LABELS = /** @type {const} */ ({
  quarter: 'Quarter',
  eighth: 'Eighth',
  triplet: 'Triplet',
  sixteenth: 'Sixteenth',
})

/**
 * Obsidian metronome — pixel-faithful to Stitch “Metronome (Wheel) · Obsidian (Final)”.
 * Header + bottom nav remain the app shell; this is the scroll-free wheel canvas only.
 *
 * @param {object} props
 * @param {object} props.met  useMetronome API
 * @param {number} props.bpm
 * @param {string} props.tempoLabel
 * @param {string | null} props.tapHint
 * @param {() => void} props.handleTap
 * @param {(e: import('react').SyntheticEvent) => void} props.handlePlayFabClick
 * @param {(e: import('react').PointerEvent) => void} props.handlePlayFabPointerUp
 * @param {(e: import('react').TouchEvent) => void} props.handlePlayFabTouchEnd
 * @param {() => void} [props.onOpenSettings]
 */
export function MetronomeLayoutObsidian({
  met,
  bpm,
  tempoLabel: _tempoLabel,
  tapHint,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
  onOpenSettings,
}) {
  void _tempoLabel
  const liveBeat = useLiveBeatIndex(met)
  const beats = Math.min(Math.max(1, met.pulsesPerMeasure || 1), 8)
  const subdivisionWord =
    SUBDIVISION_LABELS[/** @type {keyof typeof SUBDIVISION_LABELS} */ (met.subdivision)] ?? 'Quarter'

  const minAngle = (-3 * Math.PI) / 4 // -135°
  const maxAngle = (3 * Math.PI) / 4 // +135°
  const t = bpmToT(bpm)
  const angle = minAngle + (maxAngle - minAngle) * t

  const dialShellRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const dotDragRef = useRef({
    active: false,
    pointerId: /** @type {number | null} */ (null),
    startT: 0,
    lastAngle: 0,
    accumulatedTurns: 0,
  })

  // Signature picker
  const [sigPickerOpen, setSigPickerOpen] = useState(false)
  const [sigCustomNumer, setSigCustomNumer] = useState(() => (met.timeSignature || '4/4').split('/')[0] || '4')
  const [sigCustomDenom, setSigCustomDenom] = useState(() => (met.timeSignature || '4/4').split('/')[1] || '4')
  const sigClickTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  // Subdivision picker
  const [subPickerOpen, setSubPickerOpen] = useState(false)
  const subClickTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const handleSigClick = () => {
    if (sigClickTimerRef.current) {
      clearTimeout(sigClickTimerRef.current)
      sigClickTimerRef.current = null
      const parts = (met.timeSignature || '4/4').split('/')
      setSigCustomNumer(parts[0] || '4')
      setSigCustomDenom(parts[1] || '4')
      setSigPickerOpen(true)
    } else {
      sigClickTimerRef.current = setTimeout(() => {
        sigClickTimerRef.current = null
        met.setTimeSignature(cycleTimeSignature(met.timeSignature, 1))
      }, 240)
    }
  }

  const handleSubClick = () => {
    if (subClickTimerRef.current) {
      clearTimeout(subClickTimerRef.current)
      subClickTimerRef.current = null
      setSubPickerOpen(true)
    } else {
      subClickTimerRef.current = setTimeout(() => {
        subClickTimerRef.current = null
        met.setSubdivision(cycleSubdivision(met.subdivision, 1))
      }, 240)
    }
  }

  const angleFromPoint = (clientX, clientY) => {
    const el = dialShellRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = clientX - cx
    const dy = clientY - cy
    const a = Math.atan2(dy, dx)
    return normalizeAngleRad(a - Math.PI / 2)
  }

  const [bpmEditing, setBpmEditing] = useState(false)
  const [bpmDraft, setBpmDraft] = useState(() => String(Math.round(bpm)))
  const bpmInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  useEffect(() => {
    if (bpmEditing) return
    setBpmDraft(String(Math.round(bpm)))
  }, [bpm, bpmEditing])

  useEffect(() => {
    if (!bpmEditing) return
    // iOS/Safari: delay focus to next tick
    const id = requestAnimationFrame(() => {
      try {
        bpmInputRef.current?.focus?.()
        bpmInputRef.current?.select?.()
      } catch {
        /* */
      }
    })
    return () => cancelAnimationFrame(id)
  }, [bpmEditing])

  const commitBpmDraft = () => {
    const raw = Number(String(bpmDraft).replace(/[^\d.]/g, ''))
    if (!Number.isFinite(raw)) {
      setBpmDraft(String(Math.round(bpm)))
      setBpmEditing(false)
      return
    }
    const next = Math.min(400, Math.max(1, Math.round(raw)))
    met.setBpm(next)
    setBpmEditing(false)
  }

  const nudgeBpm = (delta) => {
    const next = Math.min(400, Math.max(1, Math.round(bpm + delta)))
    met.setBpm(next)
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-x-hidden overflow-y-auto bg-[#0b0c0e] px-4 py-4 font-body-md text-on-surface">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-5 mix-blend-overlay" aria-hidden>
        <img alt="" className="h-full w-full object-cover" decoding="async" src={STITCH_CONSOLE_TEXTURE} />
      </div>

      {/* Upper status — Signature | Subdivision (Stitch LCD strip) */}
      <div className="relative z-[1] flex w-full max-w-xs items-center justify-between overflow-hidden rounded-lg border border-neutral-800 bg-surface-container-lowest p-2 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
        <div
          className="scan-line-obsidian absolute inset-0 opacity-20"
          aria-hidden
        />
        <button
          type="button"
          className="relative z-[1] flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Tap to cycle signature, double-tap to open list"
          title="Tap to cycle · Double-tap to pick"
          onClick={handleSigClick}
        >
          <span className="font-meter-label text-meter-label uppercase text-outline">Signature</span>
          <span className="font-headline-md text-primary active-glow-obsidian">{met.timeSignature}</span>
        </button>
        <div className="relative z-[1] h-8 w-px bg-neutral-800" aria-hidden />
        <button
          type="button"
          className="relative z-[1] flex flex-col items-end text-right outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Tap to cycle subdivision, double-tap to open list"
          title="Tap to cycle · Double-tap to pick"
          onClick={handleSubClick}
        >
          <span className="font-meter-label text-meter-label uppercase text-outline">Subdivision</span>
          <span className="font-headline-md text-primary active-glow-obsidian">{subdivisionWord}</span>
        </button>
      </div>

      {/* Dial module — Stitch chassis + transparent RotaryDial (see Metronome.css) */}
      <div
        ref={dialShellRef}
        data-walkthrough="bpm-dial"
        className="relative z-[1] flex h-72 w-72 shrink-0 items-center justify-center"
      >
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full border-[10px] border-[#16181c] bg-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)]"
          aria-hidden
        />
        <div className="absolute inset-2 rounded-full border-4 border-neutral-800/30" aria-hidden />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
          <div className="absolute h-full w-1 py-4" style={{ transform: 'rotate(45deg)' }}>
            <div className="h-2 w-full rounded-full bg-primary/20" />
          </div>
          <div className="absolute h-full w-1 py-4" style={{ transform: 'rotate(135deg)' }}>
            <div className="h-2 w-full rounded-full bg-primary/20" />
          </div>
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="BPM — drag the dot"
          aria-valuemin={1}
          aria-valuemax={400}
          aria-valuenow={Math.round(bpm)}
          className="absolute left-1/2 top-1/2 z-[15] h-3 w-3 cursor-pointer touch-none rounded-full bg-primary shadow-[0_0_15px_#8ad2de] outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
          style={{
            transform: `translate(-50%, -50%) translate(${Math.sin(angle) * 124}px, ${-Math.cos(angle) * 124}px)`,
          }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const a = angleFromPoint(e.clientX, e.clientY)
            dotDragRef.current = {
              active: true,
              pointerId: e.pointerId,
              startT: t,
              lastAngle: a,
              accumulatedTurns: 0,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const dr = dotDragRef.current
            if (!dr.active || dr.pointerId !== e.pointerId) return
            if (!e.buttons) return
            const a = angleFromPoint(e.clientX, e.clientY)
            let delta = a - dr.lastAngle
            if (delta > Math.PI) delta -= Math.PI * 2
            if (delta < -Math.PI) delta += Math.PI * 2
            dr.lastAngle = a
            const rangePerRad = 1 / (Math.PI * 2 * 1.2)
            dr.accumulatedTurns += delta * rangePerRad
            const nextT = Math.min(1, Math.max(0, dr.startT + dr.accumulatedTurns))
            met.setBpm(Math.min(400, Math.max(1, Math.round(tToBpm(nextT)))))
          }}
          onPointerUp={(e) => {
            const dr = dotDragRef.current
            if (dr.pointerId !== e.pointerId) return
            dr.active = false
            dr.pointerId = null
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* */
            }
          }}
          onPointerCancel={(e) => {
            const dr = dotDragRef.current
            if (dr.pointerId !== e.pointerId) return
            dr.active = false
            dr.pointerId = null
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
              e.preventDefault()
              met.setBpm(Math.min(400, Math.max(1, Math.round(bpm + 1))))
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
              e.preventDefault()
              met.setBpm(Math.min(400, Math.max(1, Math.round(bpm - 1))))
            } else if (e.key === 'Home') {
              e.preventDefault()
              met.setBpm(1)
            } else if (e.key === 'End') {
              e.preventDefault()
              met.setBpm(400)
            }
          }}
        />

        <div className="metronome-obsidian-wheel__dialHost relative z-10 flex h-full w-full items-center justify-center">
          <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} label="BPM" />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="flex h-48 w-48 flex-col items-center justify-center overflow-hidden rounded-full border-4 border-[#1e2126] bg-[#0d0e10] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
            <div className="scan-line-obsidian absolute inset-0 opacity-10" aria-hidden />
            <span className="font-label-caps relative z-[1] mb-1 text-[11px] uppercase tracking-[0.1em] text-outline">
              BPM
            </span>
            <span className="sr-only" aria-live="polite" aria-atomic="true">{Math.round(bpm)} BPM</span>
            {bpmEditing ? (
              <input
                ref={bpmInputRef}
                type="number"
                inputMode="numeric"
                min={1}
                max={400}
                step={1}
                aria-label="Enter BPM"
                value={bpmDraft}
                onChange={(e) => setBpmDraft(e.target.value)}
                onBlur={commitBpmDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitBpmDraft()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setBpmDraft(String(Math.round(bpm)))
                    setBpmEditing(false)
                  }
                }}
                className="pointer-events-auto relative z-[1] w-[6ch] bg-transparent text-center font-display-numeral text-[48px] font-extrabold leading-none tracking-[-0.04em] text-primary outline-none active-glow-obsidian"
              />
            ) : (
              <button
                type="button"
                className="pointer-events-auto relative z-[1] bg-transparent p-0 font-display-numeral text-[48px] font-extrabold leading-none tracking-[-0.04em] text-primary active-glow-obsidian outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
                title="Double-click to type BPM"
                aria-label="BPM (double-click to type)"
                onDoubleClick={() => setBpmEditing(true)}
              >
                {Math.round(bpm)}
              </button>
            )}
            <div className="relative z-[1] mt-2 flex gap-1">
              {Array.from({ length: beats }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i === liveBeat ? 'bg-primary shadow-[0_0_8px_#8ad2de]' : 'bg-neutral-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Physical control surface — 3 columns */}
      <div className="relative z-[1] grid w-full max-w-sm grid-cols-3 gap-4">
        <button
          type="button"
          className="flex flex-col items-center justify-center rounded-xl border border-[#1e2126] bg-[#16181c] py-4 shadow-lg transition-transform active:scale-95"
          aria-label="Tap tempo"
          onClick={handleTap}
        >
          <span className="material-symbols-outlined text-2xl text-outline-variant">touch_app</span>
          <span className="mt-1 font-label-caps text-[9px] tracking-[0.1em] text-outline">TAP TEMPO</span>
        </button>
        <button
          type="button"
          data-walkthrough="play-fab"
          className="flex flex-col items-center justify-center rounded-xl border-2 border-primary/30 bg-primary-container py-4 shadow-[0_0_20px_rgba(138,210,222,0.3)] transition-all active:brightness-125"
          onTouchStart={() => {
            try {
              met.audio?.ensure?.()
            } catch {
              /* */
            }
          }}
          onPointerUp={handlePlayFabPointerUp}
          onTouchEnd={handlePlayFabTouchEnd}
          onClick={handlePlayFabClick}
        >
          <span
            className="material-symbols-outlined text-4xl text-on-primary-container"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {met.isPlaying ? 'pause' : 'play_arrow'}
          </span>
          <span className="mt-1 font-label-caps text-[9px] tracking-[0.1em] text-on-primary-container">
            {met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE' : 'START'}
          </span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center justify-center rounded-xl border border-[#1e2126] bg-[#16181c] py-4 shadow-lg transition-transform active:scale-95"
          aria-label="Sound and metronome settings"
          onClick={() => onOpenSettings?.()}
        >
          <span className="material-symbols-outlined text-2xl text-outline-variant">volume_up</span>
          <span className="mt-1 font-label-caps text-[9px] tracking-[0.1em] text-outline">SOUND</span>
        </button>
      </div>

      {/* Precision adjustment strip */}
      <div className="relative z-[1] flex w-full max-w-xs items-center justify-between rounded-full border border-[#1e2126] bg-[#16181c] px-1 py-1">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:text-primary"
          aria-label="Decrease BPM by one"
          onClick={() => nudgeBpm(-1)}
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <div className="h-4 w-px bg-neutral-800" aria-hidden />
        <span className="font-label-caps text-[10px] tracking-[0.1em] text-neutral-400">FINE ADJUST</span>
        <div className="h-4 w-px bg-neutral-800" aria-hidden />
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-outline transition-colors hover:text-primary"
          aria-label="Increase BPM by one"
          onClick={() => nudgeBpm(1)}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {tapHint ? (
        <p className="relative z-[1] text-center font-meter-label text-[10px] text-on-surface-variant">{tapHint}</p>
      ) : null}

      {/* ── Signature picker modal (portaled to body to escape stacking traps) ── */}
      {sigPickerOpen && typeof document !== 'undefined' ? createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Time Signature"
          onClick={() => setSigPickerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#0d0e10] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-center font-label-caps text-xs uppercase tracking-widest text-outline">
              Time Signature
            </h3>
            <p className="mb-3 text-center text-[10px] text-neutral-400">Tap once to select a preset</p>
            <div className="mb-4 grid grid-cols-5 gap-2">
              {METRONOME_TIME_SIGNATURES.map((sig) => (
                <button
                  key={sig}
                  type="button"
                  className={`rounded-xl border py-3 text-xs font-bold transition-all ${
                    met.timeSignature === sig
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(138,210,222,0.2)]'
                      : 'border-neutral-700 text-neutral-400 hover:border-primary/40 hover:text-primary'
                  }`}
                  onClick={() => { met.setTimeSignature(sig); setSigPickerOpen(false) }}
                >
                  {sig}
                </button>
              ))}
            </div>
            <div className="border-t border-neutral-800 pt-4">
              <p className="mb-3 text-center text-[10px] uppercase tracking-widest text-neutral-400">Custom</p>
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                    onClick={() => setSigCustomNumer((n) => String(Math.min(32, Number(n) + 1)))}
                    aria-label="Increase numerator"
                  >
                    <span className="material-symbols-outlined text-base">expand_less</span>
                  </button>
                  <span className="text-3xl font-extrabold leading-none text-white">{sigCustomNumer}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                    onClick={() => setSigCustomNumer((n) => String(Math.max(1, Number(n) - 1)))}
                    aria-label="Decrease numerator"
                  >
                    <span className="material-symbols-outlined text-base">expand_more</span>
                  </button>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-400">Beats</span>
                </div>
                <span className="text-4xl font-light text-neutral-600">/</span>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                    onClick={() => {
                      const opts = [2, 4, 8, 16]
                      const idx = opts.indexOf(Number(sigCustomDenom))
                      setSigCustomDenom(String(opts[Math.min(opts.length - 1, idx + 1)]))
                    }}
                    aria-label="Increase denominator"
                  >
                    <span className="material-symbols-outlined text-base">expand_less</span>
                  </button>
                  <span className="text-3xl font-extrabold leading-none text-white">{sigCustomDenom}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                    onClick={() => {
                      const opts = [2, 4, 8, 16]
                      const idx = opts.indexOf(Number(sigCustomDenom))
                      setSigCustomDenom(String(opts[Math.max(0, idx - 1)]))
                    }}
                    aria-label="Decrease denominator"
                  >
                    <span className="material-symbols-outlined text-base">expand_more</span>
                  </button>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-400">Note</span>
                </div>
              </div>
              <button
                type="button"
                className="mt-4 w-full rounded-xl border border-primary/30 bg-primary/10 py-2.5 text-sm font-bold text-primary hover:bg-primary/20"
                onClick={() => {
                  met.setTimeSignature(`${sigCustomNumer}/${sigCustomDenom}`)
                  setSigPickerOpen(false)
                }}
              >
                Apply {sigCustomNumer}/{sigCustomDenom}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-xl py-2 text-xs text-neutral-400 hover:text-neutral-300"
              onClick={() => setSigPickerOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body,
      ) : null}

      {/* ── Subdivision picker modal (portaled to body to escape stacking traps) ── */}
      {subPickerOpen && typeof document !== 'undefined' ? createPortal(
        <div
          className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Subdivision"
          onClick={() => setSubPickerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#0d0e10] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-center font-label-caps text-xs uppercase tracking-widest text-outline">
              Subdivision
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'quarter', label: 'Quarter', desc: '♩' },
                { key: 'eighth', label: 'Eighth', desc: '♩♩' },
                { key: 'triplet', label: 'Triplet', desc: '3×' },
                { key: 'sixteenth', label: 'Sixteenth', desc: '♩♩♩♩' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  className={`flex flex-col items-center justify-center rounded-2xl border py-5 transition-all ${
                    met.subdivision === key
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(138,210,222,0.15)]'
                      : 'border-neutral-700 text-neutral-400 hover:border-primary/40 hover:text-primary'
                  }`}
                  onClick={() => { met.setSubdivision(key); setSubPickerOpen(false) }}
                >
                  <span className="mb-1 text-xl">{desc}</span>
                  <span className="font-label-caps text-xs font-bold uppercase tracking-wider">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-xl py-2 text-xs text-neutral-400 hover:text-neutral-300"
              onClick={() => setSubPickerOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body,
      ) : null}
    </main>
  )
}
