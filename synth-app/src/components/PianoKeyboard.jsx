import { useCallback, useRef, useState } from 'react'

const SLIDE_STORAGE_KEY = 'piano-keyboard-slide'

const W_BASE = 'bg-zinc-800/60 border-t border-l border-b border-zinc-700/80'
const W_OFF = 'active:bg-zinc-700/80'
const B_BASE =
  'absolute top-0 z-10 w-[5.2%] min-w-[18px] max-w-[28px] rounded-b-md border border-zinc-900 bg-zinc-950 shadow-md'

const WHITES = [
  { m: 60, label: 'C' },
  { m: 62, label: 'D' },
  { m: 64, label: 'E' },
  { m: 65, label: 'F' },
  { m: 67, label: 'G' },
  { m: 69, label: 'A' },
  { m: 71, label: 'B' },
]
const BLACKS = [
  { m: 61, left: '10.0%' },
  { m: 63, left: '24.5%' },
  { m: 66, left: '53.0%' },
  { m: 68, left: '67.5%' },
  { m: 70, left: '82.0%' },
]

const OCTAVE_SHIFT_MIN = -2
const OCTAVE_SHIFT_MAX = 2

/** @param {number} midi */
function formatNoteName(midi) {
  const names = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ]
  const n = ((midi % 12) + 12) % 12
  const oct = Math.floor(midi / 12) - 1
  return `${names[n]}${oct}`
}

function WhiteKey({
  midi,
  displayLabel,
  onKeyDown,
  onKeyUp,
  slideMode,
  active,
  lightLab,
  synthwave = false,
}) {
  const labelCls = synthwave
    ? 'text-[9px] font-bold text-primary/55 sm:text-[10px]'
    : lightLab
      ? 'text-[9px] text-on-surface-variant sm:text-[10px]'
      : 'text-[9px] text-zinc-500 sm:text-[10px]'
  return (
    <div className="relative flex-1" style={{ minWidth: 0 }}>
      <button
        type="button"
        className={
          synthwave
            ? `h-full w-full min-h-[64px] touch-manipulation select-none rounded-b-[2px] bg-secondary text-on-secondary shadow-[inset_0_-4px_0_rgba(0,251,251,0.5)] transition-colors ${
                active
                  ? 'bg-secondary-fixed shadow-[inset_0_-2px_0_rgba(236,72,153,0.45),0_0_12px_rgb(0_251_251_/_0.35)]'
                  : 'active:bg-secondary-fixed'
              }`
            : lightLab
              ? `h-full w-full min-h-[84px] touch-manipulation select-none rounded-b-[4px] border bg-gradient-to-b from-white to-[#f0f0f0] ${
                  active
                    ? 'border-secondary bg-secondary-container shadow-sm'
                    : 'border-[#cccccc] active:bg-surface-container-high'
                }`
              : `h-full w-full min-h-[84px] touch-manipulation select-none rounded-b-md ${W_BASE} ${
                  active
                    ? `border-primary shadow-[0_0_16px_rgb(var(--ds-primary-rgb)_/_0.28)]`
                    : W_OFF
                } `
        }
        style={
          synthwave
            ? undefined
            : lightLab
              ? active
                ? { background: 'linear-gradient(180deg, var(--ds-secondary-container) 0%, color-mix(in srgb, var(--ds-secondary-container) 85%, white) 100%)' }
                : undefined
              : active
                ? { backgroundColor: 'rgb(var(--ds-primary-rgb) / 0.14)' }
                : undefined
        }
        data-midi={midi}
        onPointerDown={(e) => {
          e.preventDefault()
          onKeyDown(midi, e)
        }}
        onPointerUp={(e) => {
          if (slideMode) return
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            /* */
          }
          onKeyUp(midi, e.pointerId)
        }}
        onPointerCancel={(e) => (slideMode ? null : onKeyUp(midi, e.pointerId))}
        onPointerLeave={(e) => {
          if (!slideMode && e.buttons) onKeyUp(midi, e.pointerId)
        }}
        aria-pressed={active}
        aria-label={displayLabel}
      />
      <span className={`pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 ${labelCls}`}>
        {displayLabel}
      </span>
    </div>
  )
}

function BlackKey({ midi, left, onKeyDown, onKeyUp, slideMode, active, ariaLabel, lightLab, synthwave = false }) {
  /** @type {import('react').CSSProperties} */
  let keyStyle
  let buttonCls
  if (lightLab) {
    keyStyle = {
      left: `calc(${left} - 2.5%)`,
      backgroundColor: active ? 'rgb(23 42 64)' : 'rgb(var(--ds-primary-rgb) / 1)',
      boxShadow: active
        ? '0 0 0 2px rgba(57, 91, 148, 0.35), inset 0 1px 0 rgb(255 255 255 / 0.12)'
        : '0 4px 8px rgb(0 0 0 / 0.18)',
      height: '58%',
      borderColor: active ? 'var(--ds-secondary)' : 'rgb(23 42 64)',
    }
    buttonCls = 'absolute top-0 z-10 w-[5.2%] min-w-[18px] max-w-[28px] rounded-b-[2px] border shadow-md'
  } else if (synthwave) {
    keyStyle = {
      left: `calc(${left} - 2.5%)`,
      backgroundColor: active ? '#5b1758' : '#121222',
      boxShadow: active
        ? '0 0 14px rgb(255_0_255_/_0.45), inset 0 0 0 1px rgb(255_171_243_/_0.45)'
        : '0 4px 8px rgb(0_0_0_/_0.55)',
      height: '64%',
      borderColor: active ? 'rgb(255_171_243_/_0.9)' : 'rgb(255_171_243_/_0.35)',
    }
    buttonCls =
      'absolute top-0 z-10 w-[5.2%] min-w-[18px] max-w-[28px] rounded-b border-x border-b border-primary/40 shadow-lg transition-colors'
  } else {
    keyStyle = {
      left: `calc(${left} - 2.5%)`,
      backgroundColor: active ? 'rgba(20, 24, 20, 0.98)' : 'rgba(8, 8, 10, 0.98)',
      boxShadow: active
        ? '0 0 14px rgb(var(--ds-primary-rgb) / 0.32), inset 0 0 0 1px rgb(var(--ds-primary-rgb) / 0.22)'
        : '0 4px 8px rgba(0,0,0,0.5)',
      height: '58%',
      borderColor: active ? 'rgb(var(--ds-primary-rgb) / 0.9)' : 'rgb(30 30 35)',
    }
    buttonCls = B_BASE
  }

  return (
    <button
      type="button"
      className={buttonCls}
      data-midi={midi}
      style={keyStyle}
      onPointerDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onKeyDown(midi, e)
      }}
      onPointerUp={(e) => {
        if (slideMode) return
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* */
        }
        onKeyUp(midi, e.pointerId)
      }}
      onPointerCancel={(e) => (slideMode ? null : onKeyUp(midi, e.pointerId))}
      onPointerLeave={(e) => {
        if (!slideMode && e.buttons) onKeyUp(midi, e.pointerId)
      }}
      aria-label={ariaLabel}
    />
  )
}

function findPianoKeyEl(clientX, clientY, rootEl) {
  if (typeof document === 'undefined' || !rootEl) return null
  const stack = document.elementsFromPoint(clientX, clientY)
  for (const el of stack) {
    if (!(el instanceof Element) || el === rootEl) continue
    if (!rootEl.contains(el)) continue
    const withMidi = el.closest?.('[data-midi]')
    if (withMidi && rootEl.contains(withMidi) && withMidi.hasAttribute('data-midi')) {
      return withMidi
    }
  }
  return null
}

export function PianoKeyboard({
  variant = 'default',
  isKeyActive,
  onNoteOn,
  onNoteUp,
  onUserGesture,
}) {
  const lightLab = variant === 'lightLab'
  const synthwave = variant === 'synthwave'
  const [octaveShift, setOctaveShift] = useState(0)
  const [slideMode, setSlideMode] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(SLIDE_STORAGE_KEY) === '0') {
        return false
      }
    } catch {
      /* */
    }
    return true
  })
  const keyboardGroupRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  /** pointerId -> last midi for slide (primary button only) */
  const slideByPointerRef = useRef(/** @type {Map<number, number>} */ (new Map()))
  const semitone = octaveShift * 12
  const t = (baseMidi) => baseMidi + semitone

  const endSlideForPointer = useCallback(
    (pointerId) => {
      const root = keyboardGroupRef.current
      if (!root) return
      if (!slideByPointerRef.current.has(pointerId)) return
      const last = slideByPointerRef.current.get(pointerId) ?? 0
      onNoteUp(last, pointerId)
      slideByPointerRef.current.delete(pointerId)
      try {
        if (root.hasPointerCapture?.(pointerId)) {
          root.releasePointerCapture(pointerId)
        }
      } catch {
        /* */
      }
    },
    [onNoteUp],
  )

  const onKeyPointerDown = (midi, e) => {
    if (e.button !== 0) return
    onUserGesture?.()
    onNoteOn(midi, e.pointerId)
    if (slideMode) {
      slideByPointerRef.current.set(e.pointerId, midi)
      const root = keyboardGroupRef.current
      if (root) {
        try {
          root.setPointerCapture(e.pointerId)
        } catch {
          /* */
        }
      }
    } else {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onGroupPointerMove = (e) => {
    if (!slideMode) return
    if (!(e.buttons & 1)) return
    if (!slideByPointerRef.current.has(e.pointerId)) return
    const root = keyboardGroupRef.current
    if (!root) return
    const el = findPianoKeyEl(e.clientX, e.clientY, root)
    if (!el) return
    const raw = el.getAttribute('data-midi')
    const m = raw != null ? Number.parseInt(raw, 10) : NaN
    if (!Number.isFinite(m)) return
    const last = slideByPointerRef.current.get(e.pointerId)
    if (m === last) return
    if (last != null) onNoteUp(last, e.pointerId)
    onUserGesture?.()
    onNoteOn(m, e.pointerId)
    slideByPointerRef.current.set(e.pointerId, m)
  }

  const onGroupPointerUpLike = (e) => {
    if (!slideMode) return
    if (e.pointerId == null) return
    endSlideForPointer(e.pointerId)
  }

  const rangeLo = formatNoteName(t(60))
  const rangeHi = formatNoteName(t(71))
  const canDown = octaveShift > OCTAVE_SHIFT_MIN
  const canUp = octaveShift < OCTAVE_SHIFT_MAX

  return (
    <div
      className={
        lightLab
          ? 'flex h-full w-full min-h-0 flex-col border-t border-hairline bg-surface-container-lowest pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2'
          : synthwave
            ? 'flex h-full w-full min-h-0 flex-col rounded-t-lg border-x border-t-2 border-cyan-500/40 bg-surface-container-high px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[inset_0_1px_0_rgb(0_251_251_/_0.08)]'
            : 'flex h-full w-full min-h-0 flex-col border-t border-zinc-800/80 bg-zinc-950/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2'
      }
    >
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-2 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            if (canDown) setOctaveShift((s) => s - 1)
          }}
          disabled={!canDown}
          className={
            lightLab
              ? 'touch-manipulation rounded-md border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface disabled:opacity-35 active:scale-95'
              : synthwave
                ? 'touch-manipulation rounded-md border border-cyan-500/35 bg-surface-container-low px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-secondary-fixed shadow-[0_0_8px_rgb(0_251_251_/_0.12)] disabled:opacity-35 active:scale-95'
                : 'touch-manipulation rounded-md border border-zinc-700 bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-35 active:scale-95'
          }
          aria-label="Octave down"
        >
          8ve −
        </button>
        <span
          className={`min-w-0 text-center text-[9px] tabular-nums sm:text-[10px] ${lightLab ? 'text-on-surface-variant' : synthwave ? 'font-bold text-primary-fixed-dim' : 'text-zinc-500'}`}
        >
          {rangeLo}–{rangeHi}
        </span>
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            if (canUp) setOctaveShift((s) => s + 1)
          }}
          disabled={!canUp}
          className={
            lightLab
              ? 'touch-manipulation rounded-md border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface disabled:opacity-35 active:scale-95'
              : synthwave
                ? 'touch-manipulation rounded-md border border-cyan-500/35 bg-surface-container-low px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-secondary-fixed shadow-[0_0_8px_rgb(0_251_251_/_0.12)] disabled:opacity-35 active:scale-95'
                : 'touch-manipulation rounded-md border border-zinc-700 bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-35 active:scale-95'
          }
          aria-label="Octave up"
        >
          8ve +
        </button>
        <span
          className={`h-3 w-px ${lightLab ? 'bg-outline-variant' : synthwave ? 'bg-cyan-500/35' : 'bg-zinc-800'}`}
          aria-hidden="true"
        />
        <label
          className={`flex cursor-pointer select-none items-center gap-1.5 text-[9px] sm:text-[10px] ${lightLab ? 'text-on-surface-variant' : synthwave ? 'font-semibold text-primary/80' : 'text-zinc-500'}`}
        >
          <input
            type="checkbox"
            className={
              lightLab
                ? 'size-3.5 touch-manipulation rounded border-outline-variant bg-surface-container-lowest accent-secondary'
                : synthwave
                  ? 'size-3.5 touch-manipulation rounded border-primary-container/40 bg-surface-container-lowest accent-secondary-container'
                  : 'size-3.5 touch-manipulation rounded border-zinc-600 bg-zinc-900'
            }
            checked={slideMode}
            onChange={(e) => {
              const on = e.target.checked
              setSlideMode(on)
              try {
                if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(SLIDE_STORAGE_KEY, on ? '1' : '0')
                }
              } catch {
                /* */
              }
            }}
            aria-label="Glide: slide on keys to play a run of notes"
          />
          Glide
        </label>
      </div>
      <div
        ref={keyboardGroupRef}
        data-piano-keyboard
        role="group"
        aria-label="Piano, one octave"
        className={
          synthwave
            ? 'relative mx-auto flex h-full min-h-[5.75rem] w-full max-w-md flex-1 touch-none gap-1 sm:max-w-lg'
            : 'relative mx-auto flex h-full w-full min-h-0 max-w-md flex-1 touch-none px-1 sm:max-w-lg'
        }
        onPointerMove={onGroupPointerMove}
        onPointerUp={onGroupPointerUpLike}
        onPointerCancel={onGroupPointerUpLike}
      >
        {WHITES.map((k) => {
          const m = t(k.m)
          return (
            <WhiteKey
              key={k.m}
              midi={m}
              displayLabel={formatNoteName(m)}
              onKeyDown={onKeyPointerDown}
              onKeyUp={onNoteUp}
              slideMode={slideMode}
              active={isKeyActive(m)}
              lightLab={lightLab}
              synthwave={synthwave}
            />
          )
        })}
        {BLACKS.map((k) => {
          const m = t(k.m)
          return (
            <BlackKey
              key={k.m}
              midi={m}
              left={k.left}
              onKeyDown={onKeyPointerDown}
              onKeyUp={onNoteUp}
              slideMode={slideMode}
              active={isKeyActive(m)}
              ariaLabel={formatNoteName(m)}
              lightLab={lightLab}
              synthwave={synthwave}
            />
          )
        })}
      </div>
    </div>
  )
}
