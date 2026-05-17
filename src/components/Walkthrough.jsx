import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useDocumentVisualLayout } from '../hooks/useDocumentVisualLayout.js'
import {
  buildWalkthroughSlides,
  WALKTHROUGH_SPOTLIGHTS,
  readWalkthroughState,
  writeWalkthroughState,
} from '../lib/walkthrough.js'

const PHASE_MODAL = 'modal'
const PHASE_SPOTLIGHT = 'spotlight'

/**
 * First-run / replay walkthrough.
 *
 * Two phases:
 *  1. {@link PHASE_MODAL} — paginated welcome modal (Back / Skip / Next).
 *  2. {@link PHASE_SPOTLIGHT} — short tour over real UI controls (PLAY, BPM dial, theme switcher).
 *
 * Theme-aware via `data-visual-layout` (Obsidian / Studio Light / Synthwave) — uses the
 * Stitch DS semantic tokens already wired in `tailwind.config.js`.
 */
export default function Walkthrough({ onClose }) {
  const navigate = useNavigate()
  const visualLayout = useDocumentVisualLayout()
  const sw = visualLayout === 'synthwave'
  const lm = visualLayout === 'light'

  const [advanced, setAdvanced] = useState(() => {
    const s = readWalkthroughState()
    return typeof s.advanced === 'boolean' ? s.advanced : true
  })
  const slides = useMemo(() => buildWalkthroughSlides(advanced), [advanced])

  const [phase, setPhase] = useState(PHASE_MODAL)
  const [slideIdx, setSlideIdx] = useState(0)
  const [spotIdx, setSpotIdx] = useState(0)
  const titleId = useId()

  // Lock body scroll while either phase is up.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Esc dismisses the whole tour.
  const handleDismiss = useCallback(() => {
    writeWalkthroughState({ dismissedAt: Date.now(), advanced })
    onClose?.()
  }, [advanced, onClose])

  const handleComplete = useCallback(() => {
    writeWalkthroughState({ completedAt: Date.now(), advanced })
    onClose?.()
  }, [advanced, onClose])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDismiss])

  // Clamp slideIdx if the deck shrinks (toggling off "advanced" past its last slide).
  useEffect(() => {
    if (slideIdx > slides.length - 1) setSlideIdx(slides.length - 1)
  }, [slides.length, slideIdx])

  const startSpotlights = useCallback(() => {
    setPhase(PHASE_SPOTLIGHT)
    setSpotIdx(0)
  }, [])

  if (phase === PHASE_MODAL) {
    return (
      <ModalPortal>
        <ModalOverlay
          slides={slides}
          slideIdx={slideIdx}
          setSlideIdx={setSlideIdx}
          advanced={advanced}
          setAdvanced={setAdvanced}
          titleId={titleId}
          visualLayout={visualLayout}
          sw={sw}
          lm={lm}
          onSkip={handleDismiss}
          onFinishModal={startSpotlights}
        />
      </ModalPortal>
    )
  }

  return (
    <ModalPortal>
      <SpotlightOverlay
        spotlights={WALKTHROUGH_SPOTLIGHTS}
        spotIdx={spotIdx}
        setSpotIdx={setSpotIdx}
        navigate={navigate}
        sw={sw}
        lm={lm}
        onSkip={handleDismiss}
        onDone={handleComplete}
      />
    </ModalPortal>
  )
}

/** Portal helper. SSR-safe: renders nothing if no document is available. */
function ModalPortal({ children }) {
  if (typeof document === 'undefined' || !document.body) return null
  return createPortal(children, document.body)
}

/* -------------------------------------------------------------------------- */
/*                              Phase 1 — Modal                               */
/* -------------------------------------------------------------------------- */

function ModalOverlay({
  slides,
  slideIdx,
  setSlideIdx,
  advanced,
  setAdvanced,
  titleId,
  sw,
  lm,
  onSkip,
  onFinishModal,
}) {
  const slide = slides[slideIdx] ?? slides[0]
  const isFirst = slideIdx === 0
  const isLast = slideIdx === slides.length - 1
  const next = () => {
    if (isLast) onFinishModal()
    else setSlideIdx((i) => Math.min(slides.length - 1, i + 1))
  }
  const back = () => setSlideIdx((i) => Math.max(0, i - 1))

  const cardClass = sw
    ? 'border border-cyan-400/30 bg-surface-container-lowest/95 shadow-[0_0_28px_rgba(236,72,153,0.18)]'
    : lm
      ? 'border border-slate-300 bg-white shadow-xl'
      : 'rounded-ds-xl border border-hairline bg-surface-container-low shadow-[var(--ds-shadow)]'

  const titleClass = sw
    ? 'font-space-grotesk text-2xl font-black uppercase tracking-[0.2em] text-pink-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.55)]'
    : lm
      ? 'font-inter text-2xl font-black tracking-tight text-slate-900'
      : 'font-headline-md text-on-surface'

  const eyebrowClass = sw
    ? 'font-space-grotesk text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80'
    : lm
      ? 'font-inter text-[10px] font-bold uppercase tracking-widest text-slate-500'
      : 'font-label-caps text-[10px] tracking-[0.2em] text-chrome/85'

  const bodyClass = sw
    ? 'font-space-grotesk text-sm leading-relaxed text-cyan-100/90'
    : lm
      ? 'font-inter text-sm leading-relaxed text-slate-700'
      : 'font-body-md text-on-surface-variant'

  const iconWrapClass = sw
    ? 'flex h-14 w-14 items-center justify-center border border-pink-500/40 bg-surface-container-lowest text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]'
    : lm
      ? 'flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-primary-container'
      : 'flex h-14 w-14 items-center justify-center rounded-ds-lg border border-hairline bg-surface-container-lowest text-chrome teal-glow'

  return (
    <>
      <button
        type="button"
        aria-label="Skip walkthrough"
        onClick={onSkip}
        tabIndex={-1}
        className="fixed inset-0 z-[300] cursor-default bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-[301] flex items-end justify-center p-4 sm:items-center"
      >
        <div className={`flex w-full max-w-md flex-col gap-4 p-5 sm:p-6 ${cardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={iconWrapClass} aria-hidden>
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {slide.icon}
                </span>
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className={eyebrowClass}>{slide.eyebrow}</span>
                <h2 id={titleId} className={titleClass}>
                  {slide.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onSkip}
              aria-label="Close walkthrough"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                lm
                  ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                  : sw
                    ? 'text-cyan-400/70 hover:text-pink-400'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-chrome'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                close
              </span>
            </button>
          </div>

          <p className={bodyClass}>{slide.body}</p>

          {slide.bullets?.length ? (
            <ul
              className={`flex flex-col gap-1.5 text-sm ${
                sw
                  ? 'font-space-grotesk text-cyan-100/80'
                  : lm
                    ? 'font-inter text-slate-700'
                    : 'text-on-surface-variant'
              }`}
            >
              {slide.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`material-symbols-outlined mt-0.5 text-[16px] ${
                      sw ? 'text-pink-500' : lm ? 'text-primary-container' : 'text-chrome'
                    }`}
                    aria-hidden
                  >
                    chevron_right
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {isFirst ? (
            <label
              className={`mt-1 flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide ${
                sw
                  ? 'text-cyan-300'
                  : lm
                    ? 'text-slate-600'
                    : 'text-on-surface-variant'
              }`}
            >
              <input
                type="checkbox"
                checked={advanced}
                onChange={(e) => {
                  const next = e.target.checked
                  setAdvanced(next)
                  writeWalkthroughState({ advanced: next })
                }}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              Show advanced features
            </label>
          ) : null}

          <Pagination total={slides.length} index={slideIdx} sw={sw} lm={lm} />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onSkip}
              className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                sw
                  ? 'text-cyan-400/70 hover:text-pink-400'
                  : lm
                    ? 'text-slate-500 hover:text-slate-800'
                    : 'text-on-surface-variant hover:text-chrome'
              }`}
            >
              Skip
            </button>
            <div className="flex items-center gap-2">
              <FooterButton variant="ghost" sw={sw} lm={lm} disabled={isFirst} onClick={back}>
                Back
              </FooterButton>
              <FooterButton variant="primary" sw={sw} lm={lm} onClick={next}>
                {isLast ? 'Got it' : 'Next'}
              </FooterButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function Pagination({ total, index, sw, lm }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const active = i === index
        const cls = active
          ? sw
            ? 'h-1.5 w-5 bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.7)]'
            : lm
              ? 'h-1.5 w-5 rounded-full bg-primary-container'
              : 'h-1.5 w-5 rounded-full bg-chrome'
          : sw
            ? 'h-1.5 w-1.5 bg-cyan-400/30'
            : lm
              ? 'h-1.5 w-1.5 rounded-full bg-slate-300'
              : 'h-1.5 w-1.5 rounded-full bg-outline/40'
        return <span key={i} className={`transition-all duration-200 ${cls}`} />
      })}
    </div>
  )
}

function FooterButton({ children, onClick, disabled, variant, sw, lm }) {
  const base =
    'min-w-[5rem] px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'

  let style = ''
  if (variant === 'primary') {
    style = sw
      ? 'border border-pink-500 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:drop-shadow-[0_0_10px_rgba(236,72,153,0.6)]'
      : lm
        ? 'rounded-md bg-primary-container text-on-primary-container hover:brightness-110'
        : 'rounded-ds-lg border border-chrome/40 bg-surface-container-lowest text-chrome teal-glow hover:border-chrome'
  } else {
    style = sw
      ? 'border border-cyan-400/40 text-cyan-300 hover:border-cyan-400 hover:text-cyan-200'
      : lm
        ? 'rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100'
        : 'rounded-ds-lg border border-hairline text-on-surface hover:border-chrome/60'
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${style}`}>
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Phase 2 — Spotlights                            */
/* -------------------------------------------------------------------------- */

const SPOTLIGHT_PADDING = 10
const SPOTLIGHT_RADIUS = 14

function SpotlightOverlay({ spotlights, spotIdx, setSpotIdx, navigate, sw, lm, onSkip, onDone }) {
  const step = spotlights[spotIdx]
  const [rect, setRect] = useState(/** @type {DOMRect | null} */ (null))
  const [missing, setMissing] = useState(false)
  const tooltipRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  // Navigate to the right tab before searching for the target.
  useEffect(() => {
    if (!step?.tabPath) return
    if (typeof window === 'undefined') return
    if (window.location.pathname.replace(/\/+$/, '') !== step.tabPath) {
      navigate(step.tabPath)
    }
  }, [step, navigate])

  // Resolve target rect. Retry briefly because tab content may mount async.
  useEffect(() => {
    if (!step) return
    let cancelled = false
    let attempts = 0
    let raf = 0
    let timer = 0

    function findEl() {
      return document.querySelector(`[data-walkthrough="${step.target}"]`)
    }

    function tick() {
      if (cancelled) return
      const el = findEl()
      if (el) {
        const r = el.getBoundingClientRect()
        setRect(r)
        setMissing(false)
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } catch {
          /* */
        }
        return
      }
      attempts += 1
      if (attempts > 30) {
        setRect(null)
        setMissing(true)
        return
      }
      timer = window.setTimeout(() => {
        raf = window.requestAnimationFrame(tick)
      }, 60)
    }

    setRect(null)
    setMissing(false)
    raf = window.requestAnimationFrame(tick)

    function update() {
      const el = findEl()
      if (!el) return
      setRect(el.getBoundingClientRect())
    }

    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)

    let ro
    try {
      ro = new ResizeObserver(update)
      const el = findEl()
      if (el) ro.observe(el)
    } catch {
      ro = null
    }

    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      if (ro) ro.disconnect()
    }
  }, [step])

  const isLast = spotIdx === spotlights.length - 1
  const next = () => {
    if (isLast) onDone()
    else setSpotIdx((i) => i + 1)
  }
  const back = () => setSpotIdx((i) => Math.max(0, i - 1))

  // Compute tooltip placement (below the cutout when there's room, else above).
  const tooltip = useMemo(() => {
    if (!rect) return null
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tipW = Math.min(360, vw - 24)
    const cutTop = Math.max(0, rect.top - SPOTLIGHT_PADDING)
    const cutBottom = Math.min(vh, rect.bottom + SPOTLIGHT_PADDING)
    const cutCenterX = rect.left + rect.width / 2
    const spaceBelow = vh - cutBottom
    const spaceAbove = cutTop
    const placeBelow = spaceBelow >= 200 || spaceBelow >= spaceAbove
    const top = placeBelow ? cutBottom + 12 : Math.max(12, cutTop - 12 - 200)
    const left = Math.min(Math.max(12, cutCenterX - tipW / 2), vw - tipW - 12)
    return { top, left, width: tipW, placeBelow }
  }, [rect])

  const overlay = rect ? (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[300] transition-all duration-200"
      style={{
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        borderRadius: SPOTLIGHT_RADIUS,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
        outline: sw
          ? '2px solid rgba(236,72,153,0.85)'
          : lm
            ? '2px solid rgba(15,23,42,0.7)'
            : '2px solid rgba(0,251,251,0.7)',
        outlineOffset: 0,
      }}
    />
  ) : (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[300] bg-black/70" />
  )

  const cardClass = sw
    ? 'border border-cyan-400/30 bg-surface-container-lowest/95 shadow-[0_0_28px_rgba(236,72,153,0.18)]'
    : lm
      ? 'border border-slate-300 bg-white shadow-xl rounded-lg'
      : 'rounded-ds-lg border border-hairline bg-surface-container-low shadow-[var(--ds-shadow)]'

  const titleClass = sw
    ? 'font-space-grotesk text-base font-black uppercase tracking-[0.2em] text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.55)]'
    : lm
      ? 'font-inter text-base font-black tracking-tight text-slate-900'
      : 'font-headline-md text-base text-on-surface'

  const bodyClass = sw
    ? 'font-space-grotesk text-xs leading-relaxed text-cyan-100/90'
    : lm
      ? 'font-inter text-xs leading-relaxed text-slate-700'
      : 'font-body-md text-xs text-on-surface-variant'

  return (
    <>
      {/* Click outside (overlay backdrop) -> skip. We use a separate transparent backdrop so the spotlight cutout stays interactive. */}
      <button
        type="button"
        aria-label="Skip spotlight tour"
        tabIndex={-1}
        onClick={onSkip}
        className="fixed inset-0 z-[299] cursor-default"
      />
      {overlay}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        className={`pointer-events-auto fixed z-[302] flex flex-col gap-3 p-4 ${cardClass}`}
        style={
          tooltip
            ? { top: tooltip.top, left: tooltip.left, width: tooltip.width }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(360px, calc(100vw - 24px))' }
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span
              className={
                sw
                  ? 'font-space-grotesk text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400/80'
                  : lm
                    ? 'font-inter text-[10px] font-bold uppercase tracking-widest text-slate-500'
                    : 'font-label-caps text-[10px] tracking-[0.2em] text-chrome/85'
              }
            >
              Spotlight {spotIdx + 1} / {spotlights.length}
            </span>
            <h3 className={titleClass}>{step?.title}</h3>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Close walkthrough"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
              lm
                ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                : sw
                  ? 'text-cyan-400/70 hover:text-pink-400'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-chrome'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              close
            </span>
          </button>
        </div>
        <p className={bodyClass}>{step?.body}</p>
        {missing ? (
          <p
            className={`text-[11px] italic ${
              sw ? 'text-pink-300' : lm ? 'text-slate-500' : 'text-on-surface-variant'
            }`}
          >
            (Couldn’t locate this control — continuing…)
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <Pagination total={spotlights.length} index={spotIdx} sw={sw} lm={lm} />
          <div className="flex items-center gap-2">
            <FooterButton variant="ghost" sw={sw} lm={lm} disabled={spotIdx === 0} onClick={back}>
              Back
            </FooterButton>
            <FooterButton variant="primary" sw={sw} lm={lm} onClick={next}>
              {isLast ? 'Done' : 'Next'}
            </FooterButton>
          </div>
        </div>
      </div>
    </>
  )
}
