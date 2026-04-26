/* Pad order and keys: `DRUM_PAD_LAYOUT` in `lib/drumVoices.js` (shared with `DrumEngineBlock`). */
import { DRUM_PAD_LAYOUT, DRUM_VOICES } from '../lib/drumVoices.js'

const SUB = {
  7: 'Crash hit',
  6: 'Crash-ride wash',
  5: 'Dual square',
  4: 'Metallic stick',
  3: 'Noise + BP 1.5 kHz',
  2: 'Noise + HP 7 kHz',
  0: 'Sine 150→40 Hz',
  1: 'Body + snap',
}
const PADS = DRUM_PAD_LAYOUT.map((c) => ({
  i: c.i,
  label: c.label,
  sub: SUB[c.i],
  color: DRUM_VOICES[c.i].color,
}))

/**
 * `div` pads (not `<button>`) so **two fingers** can strike two pads at once on
 * mobile; `touch-action: none` avoids the browser eating a second touch.
 *
 * @param {object} props
 * @param {(index: number) => void} props.onPadDown
 */
export function DrumPadGrid({ onPadDown }) {
  return (
    <div className="touch-none grid h-full min-h-0 w-full min-w-0 grid-cols-2 grid-rows-4 gap-2.5 p-2.5 sm:gap-3.5 sm:p-4">
      {PADS.map((p) => (
        <div
          key={p.i}
          role="button"
          tabIndex={0}
          className="flex min-h-0 min-w-0 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-3xl border-2 border-zinc-800/90 bg-zinc-950/80 py-1 text-center text-zinc-200 shadow-md active:scale-[0.98] sm:gap-1.5 sm:py-1.5"
          style={
            {
              background: `radial-gradient(120% 100% at 50% 100%, ${p.color}18 0%, rgba(5,5,6,0.95) 55%)`,
              boxShadow: `0 0 0 1px ${p.color}25`,
            }
          }
          onPointerDown={(e) => {
            if (e.button != null && e.button !== 0) return
            e.preventDefault()
            e.stopPropagation()
            onPadDown(p.i)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPadDown(p.i)
            }
          }}
        >
          <span
            className="text-base font-bold tracking-wide sm:text-lg"
            style={{ color: p.color }}
          >
            {p.label}
          </span>
          <span className="line-clamp-2 max-w-full px-1 text-center text-[10px] leading-tight text-zinc-500 sm:text-xs">
            {p.sub}
          </span>
        </div>
      ))}
    </div>
  )
}
