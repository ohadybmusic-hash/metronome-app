import { useCallback, useRef, useState } from 'react'

const SLIDE_STORAGE_KEY = 'piano-keyboard-slide'

const NE = '#39ff14'
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

function WhiteKey({ midi, displayLabel, onKeyDown, onKeyUp, slideMode, active }) {
  return (
    <div className="relative flex-1" style={{ minWidth: 0 }}>
      <button
        type="button"
        className={`h-full w-full min-h-[84px] touch-manipulation select-none rounded-b-md ${W_BASE} ${
          active ? 'border-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.35)]' : W_OFF
        } `}
        style={active ? { backgroundColor: 'rgba(57, 255, 20, 0.16)' } : undefined}
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
      <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500 sm:text-[10px]">
        {displayLabel}
      </span>
    </div>
  )
}

function BlackKey({ midi, left, onKeyDown, onKeyUp, slideMode, active, ariaLabel }) {
  return (
    <button
      type="button"
      className={B_BASE}
      data-midi={midi}
      style={{
        left: `calc(${left} - 2.5%)`,
        backgroundColor: active
          ? 'rgba(20, 24, 20, 0.98)'
          : 'rgba(8, 8, 10, 0.98)',
        boxShadow: active
          ? `0 0 14px rgba(57, 255, 20, 0.45), inset 0 0 0 1px ${NE}44`
          : '0 4px 8px rgba(0,0,0,0.5)',
        height: '58%',
        borderColor: active ? NE : 'rgb(30 30 35)',
      }}
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
  isKeyActive,
  onNoteOn,
  onNoteUp,
  onUserGesture,
}) {
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
    <div className="flex h-full w-full min-h-0 flex-col border-t border-zinc-800/80 bg-zinc-950/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-center gap-1.5 px-2 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            if (canDown) setOctaveShift((s) => s - 1)
          }}
          disabled={!canDown}
          className="touch-manipulation rounded-md border border-zinc-700 bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-35 active:scale-95"
          aria-label="Octave down"
        >
          8ve −
        </button>
        <span className="min-w-0 text-center text-[9px] tabular-nums text-zinc-500 sm:text-[10px]">
          {rangeLo}–{rangeHi}
        </span>
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            if (canUp) setOctaveShift((s) => s + 1)
          }}
          disabled={!canUp}
          className="touch-manipulation rounded-md border border-zinc-700 bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-zinc-200 disabled:opacity-35 active:scale-95"
          aria-label="Octave up"
        >
          8ve +
        </button>
        <span className="h-3 w-px bg-zinc-800" aria-hidden="true" />
        <label className="flex cursor-pointer select-none items-center gap-1.5 text-[9px] text-zinc-500 sm:text-[10px]">
          <input
            type="checkbox"
            className="size-3.5 touch-manipulation rounded border-zinc-600 bg-zinc-900"
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
        className="relative mx-auto flex h-full w-full min-h-0 max-w-md flex-1 touch-none px-1 sm:max-w-lg"
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
            />
          )
        })}
      </div>
    </div>
  )
}
