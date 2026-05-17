import { useEffect, useState } from 'react'

/**
 * Obsidian Synth Lab drum rack (Stitch HTML parity): paper texture, LCD scope, sample/FX strip, pad viewport.
 *
 * @param {{ met: object, synthRef: import('react').RefObject<{ getObsidianDrumSampleLine?: () => string } | null>, recordingActive: boolean, children: import('react').ReactNode, paperTextureUrl: string }} props
 */
export default function SynthLabShellObsidian({ met, synthRef, recordingActive, children, paperTextureUrl }) {
  const [sampleLine, setSampleLine] = useState('Sample: —')
  const [macro, setMacro] = useState(() => ({ pitchSemis: 0, decayNotches: 0, sendFxAmount: 1 }))

  useEffect(() => {
    const read = () => {
      try {
        const fn = synthRef?.current?.getObsidianDrumSampleLine
        setSampleLine(typeof fn === 'function' ? fn() : 'Sample: —')
      } catch {
        setSampleLine('Sample: —')
      }
    }
    read()
    const id = setInterval(read, 400)
    return () => clearInterval(id)
  }, [synthRef])

  useEffect(() => {
    const read = () => {
      try {
        const fn = synthRef?.current?.getActiveDrumMacroReadout
        const r = typeof fn === 'function' ? fn() : null
        if (r && typeof r === 'object') {
          setMacro({
            pitchSemis: Number.isFinite(Number(r.pitchSemis)) ? Number(r.pitchSemis) : 0,
            decayNotches: Number.isFinite(Number(r.decayNotches)) ? Number(r.decayNotches) : 0,
            sendFxAmount: Math.max(0, Math.min(1, Number(r.sendFxAmount) || 0)),
          })
        }
      } catch {
        /* ignore */
      }
    }
    read()
    const id = setInterval(read, 120)
    return () => clearInterval(id)
  }, [synthRef])

  const bpm = Number(met?.bpm)
  const tempoDisplay = Number.isFinite(bpm) ? bpm.toFixed(2) : '—'

  const knobDeg = (n) => {
    const clamped = Math.max(-24, Math.min(24, Math.round(Number(n) || 0)))
    return (clamped / 24) * 120
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-background font-body-md text-on-background antialiased selection:bg-primary-container selection:text-on-primary-container">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
        aria-hidden
        style={{ backgroundImage: `url("${paperTextureUrl}")` }}
      />

      {/* LCD scope: sibling before <main> (matches preview dom-order — not nested inside main). */}
      <section className="relative z-[1] mx-auto mb-2 flex h-32 w-full max-w-5xl flex-none flex-col overflow-hidden rounded-ds-xl border border-hairline bg-surface-container-lowest px-2 pt-2 synth-lab-lcd-inset shadow-[0_1px_0_0_rgba(255,255,255,0.05),var(--ds-shadow)]">
        {/* Substantive content first in DOM; scanline overlay follows (below in paint stack via z-index). */}
        <div className="relative z-[5] flex min-h-0 flex-1 flex-col">
          {/* Top row: meter + tempo + status */}
          <div className="relative flex shrink-0 items-start justify-between gap-3 px-3 pt-0">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex flex-col">
                <span className="font-meter-label text-meter-label uppercase text-primary opacity-60">Master Out</span>
                <div className="mt-1 flex gap-1" aria-hidden>
                  <div className="h-4 w-1.5 bg-primary" />
                  <div className="h-4 w-1.5 bg-primary" />
                  <div className="h-4 w-1.5 bg-primary opacity-70" />
                  <div className="h-4 w-1.5 bg-primary opacity-20" />
                  <div className="h-4 w-1.5 bg-secondary opacity-15" />
                </div>
              </div>
              <div className="flex flex-col border-l border-hairline pl-4">
                <span className="font-meter-label text-meter-label uppercase text-primary opacity-60">Tempo</span>
                <span className="font-display-numeral text-[30px] leading-none text-primary drop-shadow-[0_0_8px_rgba(79,152,163,0.4)]">
                  {tempoDisplay}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
              <span className="rounded bg-primary/10 px-1 font-meter-label uppercase text-primary">Drum Mode</span>
              <span className="font-meter-label uppercase text-on-surface-variant">Synth Lab v2.4</span>
            </div>
          </div>

          {/* Middle row: scope graphic (no buttons overlaying it). */}
          <div className="relative z-[4] min-h-0 flex-1 px-3 pb-2 pt-1">
            <div className="relative h-full w-full overflow-hidden rounded-lg border border-hairline bg-surface-container-low">
              <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
                <svg className="h-full w-full stroke-primary fill-none stroke-2" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <path d="M 0 50 Q 25 10, 50 50 T 100 50 T 150 50 T 200 50 T 250 50 T 300 50 T 350 50 T 400 50" />
                </svg>
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" aria-hidden />
            </div>
          </div>

          {/* Bottom row: controls (no longer absolutely positioned over the scope). */}
          <div className="relative z-[6] flex shrink-0 items-center gap-2 px-3 pb-2">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface-container p-2 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high hover:text-primary active:scale-95 active:brightness-125"
              title="Undo last kit change"
              aria-label="Undo last synth patch change"
              onClick={() => synthRef?.current?.undoPatch?.()}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden>
                history
              </span>
            </button>
            <button
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-surface-container p-2 transition-colors duration-150 hover:bg-surface-container-high active:scale-95 active:brightness-125 ${
                recordingActive
                  ? 'border-error text-error shadow-[inset_0_0_0_1px_rgba(251,113,133,0.35)]'
                  : 'border-hairline text-on-surface-variant hover:text-error'
              }`}
              title={recordingActive ? 'Stop recording' : 'Record synth output'}
              aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
              aria-pressed={recordingActive}
              onClick={() => void synthRef?.current?.toggleRecording?.()}
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
                fiber_manual_record
              </span>
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface-container p-2 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high hover:text-primary active:scale-95 active:brightness-125 [-webkit-tap-highlight-color:transparent]"
              title="Warm up audio engine"
              aria-label="Initialize audio engine"
              onClick={() => void synthRef?.current?.initAudio?.()}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden>
                graphic_eq
              </span>
            </button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1] synth-lab-scanline opacity-[0.25]" aria-hidden />
      </section>

      <main className="relative z-[1] mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 overflow-hidden px-2 pb-2">
        <section className="flex h-24 shrink-0 gap-2">
          <button
            type="button"
            className="group flex min-w-0 flex-1 cursor-pointer flex-col justify-between rounded-ds-xl border border-hairline bg-[var(--ds-nav-bg)] p-2 text-left transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-surface-container active:scale-[0.99]"
            onClick={() => synthRef?.current?.openDrumEditor?.()}
          >
            <div className="mb-1 flex items-center justify-between border-b border-hairline pb-1">
              <span className="min-w-0 truncate font-label-caps text-label-caps text-chrome-muted">{sampleLine}</span>
              <span className="material-symbols-outlined shrink-0 text-[14px] text-primary group-hover:text-primary-fixed-dim" aria-hidden>
                edit
              </span>
            </div>
            <div className="flex flex-1 items-center justify-around gap-4">
              <div className="flex flex-col items-center">
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Pitch — drag up/down"
                  className="relative flex h-8 w-8 cursor-ns-resize touch-none items-center justify-center rounded-full border-2 border-primary/30 synth-lab-knob-shadow [-webkit-tap-highlight-color:transparent]"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    if (e.button != null && e.button !== 0) return
                    e.preventDefault()
                    e.stopPropagation()
                    const y0 = e.clientY
                    let lastNotch = 0
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const onMove = (ev) => {
                      if (ev.pointerId !== e.pointerId) return
                      if (!ev.buttons) return
                      const dy = y0 - ev.clientY
                      const notch = Math.max(-24, Math.min(24, Math.round(dy / 18)))
                      const step = notch - lastNotch
                      if (!step) return
                      lastNotch = notch
                      synthRef?.current?.adjustActiveDrumMacro?.({ pitchSemisDelta: step, decayDelta: 0 })
                    }
                    const onUp = (ev) => {
                      if (ev.pointerId !== e.pointerId) return
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId)
                      } catch {
                        /* */
                      }
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                      window.removeEventListener('pointercancel', onUp)
                    }
                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                    window.addEventListener('pointercancel', onUp)
                  }}
                >
                  <div
                    className="absolute top-0 h-3 w-1 origin-bottom rounded-full bg-primary"
                    style={{ transform: `rotate(${knobDeg(macro.pitchSemis)}deg)` }}
                    aria-hidden
                  />
                </div>
                <span className="mt-1 font-meter-label uppercase text-chrome-muted">Pitch</span>
              </div>
              <div className="flex flex-col items-center">
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="Decay — drag up/down"
                  className="relative flex h-8 w-8 cursor-ns-resize touch-none items-center justify-center rounded-full border-2 border-primary/30 synth-lab-knob-shadow [-webkit-tap-highlight-color:transparent]"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => {
                    if (e.button != null && e.button !== 0) return
                    e.preventDefault()
                    e.stopPropagation()
                    const y0 = e.clientY
                    let lastNotch = 0
                    e.currentTarget.setPointerCapture(e.pointerId)
                    const onMove = (ev) => {
                      if (ev.pointerId !== e.pointerId) return
                      if (!ev.buttons) return
                      const dy = y0 - ev.clientY
                      const notch = Math.max(-24, Math.min(24, Math.round(dy / 18)))
                      const step = notch - lastNotch
                      if (!step) return
                      lastNotch = notch
                      synthRef?.current?.adjustActiveDrumMacro?.({ pitchDelta: 0, decayNotchesDelta: step })
                    }
                    const onUp = (ev) => {
                      if (ev.pointerId !== e.pointerId) return
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId)
                      } catch {
                        /* */
                      }
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                      window.removeEventListener('pointercancel', onUp)
                    }
                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                    window.addEventListener('pointercancel', onUp)
                  }}
                >
                  <div
                    className="absolute top-0 h-3 w-1 origin-bottom rounded-full bg-primary"
                    style={{ transform: `rotate(${knobDeg(macro.decayNotches)}deg)` }}
                    aria-hidden
                  />
                </div>
                <span className="mt-1 font-meter-label uppercase text-chrome-muted">Decay</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            className="flex w-32 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-ds-xl border border-hairline bg-[var(--ds-nav-bg)] p-2 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-surface-container active:scale-[0.99]"
            onClick={() => synthRef?.current?.openDrumFxPanel?.()}
          >
            <span className="material-symbols-outlined text-primary" aria-hidden>
              blur_on
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">FX Rack</span>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Drums FX send amount"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(macro.sendFxAmount * 100)}
              className="mt-1 h-2 w-full touch-none cursor-ew-resize overflow-hidden rounded-full bg-hairline"
              onPointerDown={(e) => {
                if (e.button != null && e.button !== 0) return
                e.preventDefault()
                e.stopPropagation()
                const el = e.currentTarget
                const setFromClientX = (clientX) => {
                  const rect = el.getBoundingClientRect()
                  const t = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)))
                  synthRef?.current?.setDrumMasterFxSend?.(t)
                }
                el.setPointerCapture(e.pointerId)
                setFromClientX(e.clientX)
                const onMove = (ev) => {
                  if (ev.pointerId !== e.pointerId) return
                  if (!ev.buttons) return
                  setFromClientX(ev.clientX)
                }
                const onUp = (ev) => {
                  if (ev.pointerId !== e.pointerId) return
                  try {
                    el.releasePointerCapture(e.pointerId)
                  } catch {
                    /* */
                  }
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                  window.removeEventListener('pointercancel', onUp)
                }
                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
                window.addEventListener('pointercancel', onUp)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="synth-lab-active-glow h-full rounded-full bg-primary"
                style={{ width: `${Math.round(macro.sendFxAmount * 100)}%` }}
              />
            </div>
          </button>
        </section>

        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden pb-4">{children}</section>
      </main>
    </div>
  )
}
