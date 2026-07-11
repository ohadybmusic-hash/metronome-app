import { clamp } from '../../../lib/clamp.js'
import { cycleSubdivision, cycleTimeSignature } from '../../../lib/metronome/meterCycle.js'

const NOTE_ICON_PROPS = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  fill: 'currentColor',
  'aria-hidden': true,
  focusable: false,
}

function QuarterNoteIcon() {
  return (
    <svg {...NOTE_ICON_PROPS}>
      <rect x="13.2" y="3" width="1.4" height="14.4" />
      <ellipse cx="10.5" cy="17.4" rx="3.4" ry="2.5" transform="rotate(-22 10.5 17.4)" />
    </svg>
  )
}

function EighthNoteIcon() {
  return (
    <svg {...NOTE_ICON_PROPS}>
      <rect x="6.6" y="5" width="1.3" height="13" />
      <rect x="16.5" y="5" width="1.3" height="13" />
      <polygon points="6.6,5 17.8,5 17.8,7.6 6.6,7.6" />
      <ellipse cx="4.6" cy="18" rx="2.7" ry="2" transform="rotate(-22 4.6 18)" />
      <ellipse cx="14.5" cy="18" rx="2.7" ry="2" transform="rotate(-22 14.5 18)" />
    </svg>
  )
}

function TripletNoteIcon() {
  return (
    <svg {...NOTE_ICON_PROPS}>
      <text
        x="12"
        y="4.4"
        fontSize="6.4"
        fontWeight="700"
        fontStyle="italic"
        textAnchor="middle"
        fontFamily="serif"
      >
        3
      </text>
      <rect x="2.6" y="7" width="1.1" height="11.2" />
      <rect x="11.45" y="7" width="1.1" height="11.2" />
      <rect x="20.3" y="7" width="1.1" height="11.2" />
      <polygon points="2.6,7 21.4,7 21.4,9 2.6,9" />
      <ellipse cx="1.4" cy="18.2" rx="2.1" ry="1.6" transform="rotate(-22 1.4 18.2)" />
      <ellipse cx="10.25" cy="18.2" rx="2.1" ry="1.6" transform="rotate(-22 10.25 18.2)" />
      <ellipse cx="19.1" cy="18.2" rx="2.1" ry="1.6" transform="rotate(-22 19.1 18.2)" />
    </svg>
  )
}

function SixteenthNoteIcon() {
  return (
    <svg {...NOTE_ICON_PROPS} width={100} style={{ opacity: 0.5 }}>
      {/* 4 connected sixteenth notes (beamed group of 4) */}
      <rect x="6.2" y="3.6" width="1.2" height="14.6" />
      <rect x="10.2" y="3.6" width="1.2" height="14.6" />
      <rect x="14.2" y="3.6" width="1.2" height="14.6" />
      <rect x="18.2" y="3.6" width="1.2" height="14.6" />
      <polygon points="6.2,3.6 19.4,3.6 19.4,5.6 6.2,5.6" />
      <polygon points="6.2,7.2 19.4,7.2 19.4,9.2 6.2,9.2" />
      <ellipse cx="4.4" cy="18.1" rx="2.3" ry="1.8" transform="rotate(-22 4.4 18.1)" />
      <ellipse cx="8.4" cy="18.1" rx="2.3" ry="1.8" transform="rotate(-22 8.4 18.1)" />
      <ellipse cx="12.4" cy="18.1" rx="2.3" ry="1.8" transform="rotate(-22 12.4 18.1)" />
      <ellipse cx="16.4" cy="18.1" rx="2.3" ry="1.8" transform="rotate(-22 16.4 18.1)" />
    </svg>
  )
}

const SUB_ICONS = [QuarterNoteIcon, EighthNoteIcon, TripletNoteIcon, SixteenthNoteIcon]
const SOUND_ORDER = [
  'beep',
  'voiceNumbers',
  'voiceCount',
  'drum:kick',
  'drum:snare',
  'drum:hat',
  'drum:clap',
  'drum:ride',
  'drum:cowbell',
  'drum:crashRide',
  'drum:crash1',
]

/**
 * Stitch light metronome — aligned with `08-metronome-light-main.html` rack + Master Clock LCD.
 */
export function MetronomeLayoutLight({
  met,
  bpm,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const subIndex = Math.max(
    0,
    ['quarter', 'eighth', 'triplet', 'sixteenth'].indexOf(met.subdivision),
  )

  const cycleSub = (delta) => {
    met.setSubdivision(cycleSubdivision(met.subdivision, delta))
  }

  const setClickVolumeFromAngle = (angleRad) => {
    // Map [-135°, +135°] to [0..1]
    const minA = (-3 * Math.PI) / 4
    const maxA = (3 * Math.PI) / 4
    const t = (angleRad - minA) / (maxA - minA)
    met.setClickVolume(clamp(t, 0, 1))
  }

  const onKnobPointer = (e, { kind }) => {
    const el = e.currentTarget
    if (!el?.getBoundingClientRect) return
    e.preventDefault()
    el.setPointerCapture?.(e.pointerId)

    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angleFromPoint = (clientX, clientY) => {
      const dx = clientX - cx
      const dy = clientY - cy
      const a = Math.atan2(dy, dx)
      // normalize so 0 is at top-ish for a knob
      const rot = a - Math.PI / 2
      // wrap to [-pi, pi]
      if (rot > Math.PI) return rot - Math.PI * 2
      if (rot < -Math.PI) return rot + Math.PI * 2
      return rot
    }

    const apply = (clientX, clientY) => {
      const a = angleFromPoint(clientX, clientY)
      const minA = (-3 * Math.PI) / 4
      const maxA = (3 * Math.PI) / 4
      const clampedA = clamp(a, minA, maxA)

      if (kind === 'volume') {
        setClickVolumeFromAngle(clampedA)
      } else if (kind === 'sound') {
        const t = (clampedA - minA) / (maxA - minA)
        const idx = Math.round(clamp(t, 0, 1) * (SOUND_ORDER.length - 1))
        met.setSound(SOUND_ORDER[idx] || 'beep')
      }
    }

    apply(e.clientX, e.clientY)

    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return
      apply(ev.clientX, ev.clientY)
    }
    const onUp = (ev) => {
      if (ev.pointerId !== e.pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      try {
        el.releasePointerCapture?.(e.pointerId)
      } catch {
        /* */
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2 bg-background p-6 font-inter text-on-background wide:grid wide:grid-cols-12">
      <section className="rack-panel-light col-span-12 flex flex-col gap-2 rounded p-3 wide:col-span-8">
        <header className="mb-1 flex items-center justify-between">
          <span className="font-label-caps text-label-caps uppercase text-outline">Master Clock</span>
          <span className="font-label-caps text-label-caps uppercase text-primary">Sync: Int</span>
        </header>
        <div
          data-walkthrough="bpm-dial"
          className="lcd-display-light relative flex h-32 min-h-[8rem] flex-col items-center justify-center overflow-hidden rounded p-3"
        >
          <div className="absolute left-3 top-2 flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="font-label-caps text-[9px] text-primary">SIGNAL</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display-mono text-7xl font-black tracking-tighter text-primary">{Math.round(bpm)}</span>
            <span className="font-display-mono text-xl font-bold text-outline">BPM</span>
          </div>
          <div className="absolute bottom-2 right-3">
            <span className="font-label-caps text-[9px] text-outline">PRECISION QUARTZ</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            className="flex h-10 w-20 items-center justify-center rounded border border-[var(--ds-rack-border)] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-background active:translate-y-px"
            onClick={handleTap}
          >
            TAP
          </button>
          <button
            type="button"
            className="flex h-10 w-20 items-center justify-center rounded border border-[var(--ds-rack-border)] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-background active:translate-y-px"
            onClick={() => met.setBpm(clamp(Math.round(bpm) - 5, 1, 400))}
          >
            − 5
          </button>
          <button
            type="button"
            className="flex h-10 w-20 items-center justify-center rounded border border-[var(--ds-rack-border)] bg-white text-[11px] font-bold uppercase tracking-[0.08em] shadow-sm transition-all hover:bg-background active:translate-y-px"
            onClick={() => met.setBpm(clamp(Math.round(bpm) + 5, 1, 400))}
          >
            + 5
          </button>
        </div>
      </section>

      <section className="rack-panel-light col-span-12 flex flex-col gap-4 rounded p-3 wide:col-span-4">
        <div>
          <span className="mb-2 block text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-on-surface-variant">
            Time Signature
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div className="well-inset-light rounded p-3 text-center">
              <span className="block font-inter text-lg font-semibold leading-tight tracking-tight text-primary">
                {met.timeSignature.split('/')[0] || '4'}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-outline">Numerator</span>
            </div>
            <div className="well-inset-light rounded p-3 text-center">
              <span className="block font-inter text-lg font-semibold leading-tight tracking-tight text-primary">
                {met.timeSignature.split('/')[1] || '4'}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-outline">Denominator</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center gap-2">
            <button
              type="button"
              className="rounded border border-[var(--ds-rack-border)] px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, -1))}
            >
              Prev meter
            </button>
            <button
              type="button"
              className="rounded border border-[var(--ds-rack-border)] px-3 py-1 text-xs font-semibold hover:bg-white"
              onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, 1))}
            >
              Next meter
            </button>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[11px] font-bold uppercase leading-4 tracking-[0.08em] text-on-surface-variant">
            Subdivision
          </span>
          <div className="flex items-center justify-between rounded bg-surface-dim p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <button
              type="button"
              className="rounded p-2 text-primary hover:bg-surface-variant"
              aria-label="Previous subdivision"
              onClick={() => cycleSub(-1)}
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => {
                const Icon = SUB_ICONS[i]
                return (
                  <button
                    key={i}
                    type="button"
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded transition-colors ${i === subIndex ? 'bg-surface-variant text-primary' : 'text-outline hover:bg-surface-variant/70'}`}
                    aria-label={`Subdivision ${['Quarter', 'Eighth', 'Triplet', 'Sixteenth'][i]}`}
                    onClick={() => met.setSubdivision(['quarter', 'eighth', 'triplet', 'sixteenth'][i])}
                  >
                    <Icon />
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="rounded p-2 text-primary hover:bg-surface-variant"
              aria-label="Next subdivision"
              onClick={() => cycleSub(1)}
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mt-auto">
          <button
            type="button"
            data-walkthrough="play-fab"
            className="flex w-full items-center justify-center gap-2 rounded bg-secondary py-6 text-lg font-bold uppercase tracking-tight text-on-secondary shadow-lg transition-all hover:bg-on-secondary-container active:scale-95"
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
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            {met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE ENGINE' : 'START ENGINE'}
          </button>
        </div>
      </section>

      <section className="rack-panel-light col-span-12 grid grid-cols-1 gap-4 rounded p-3 wide:grid-cols-4">
        <div className="flex flex-col items-center">
          <span className="mb-4 text-[10px] font-bold uppercase text-on-surface-variant">Click volume</span>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--ds-rack-border)] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div
              className="absolute top-1 h-4 w-1 origin-bottom rounded-full bg-secondary"
              style={{ transform: `rotate(${(-135 + 270 * clamp(Number(met.clickVolume) || 0, 0, 1)).toFixed(1)}deg)` }}
            />
            <div
              className="h-10 w-10 rounded-full border border-outline-variant/30 bg-background"
              role="slider"
              aria-label="Click volume"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={Number(met.clickVolume) || 0}
              tabIndex={0}
              onPointerDown={(e) => onKnobPointer(e, { kind: 'volume' })}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  met.setClickVolume(clamp((Number(met.clickVolume) || 0) + 0.05, 0, 1))
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  met.setClickVolume(clamp((Number(met.clickVolume) || 0) - 0.05, 0, 1))
                } else if (e.key === 'Home') {
                  e.preventDefault()
                  met.setClickVolume(0)
                } else if (e.key === 'End') {
                  e.preventDefault()
                  met.setClickVolume(1)
                }
              }}
            />
          </div>
          <div className="mt-3 rounded px-2 py-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            <span className="text-xs font-medium tracking-wide text-primary">
              {Math.round(clamp(Number(met.clickVolume) || 0, 0, 1) * 100)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="mb-4 text-[10px] font-bold uppercase text-on-surface-variant">Sound</span>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[var(--ds-rack-border)] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div
              className="absolute top-1 h-4 w-1 origin-bottom rounded-full bg-secondary"
              style={{
                transform: `rotate(${(-135 + 270 * (Math.max(0, SOUND_ORDER.indexOf(met.sound)) / (SOUND_ORDER.length - 1))).toFixed(1)}deg)`,
              }}
            />
            <div
              className="h-10 w-10 rounded-full border border-outline-variant/30 bg-background"
              role="button"
              tabIndex={0}
              aria-label="Sound"
              title="Drag to change sound, click to cycle"
              onPointerDown={(e) => onKnobPointer(e, { kind: 'sound' })}
              onClick={() => {
                const idx = SOUND_ORDER.indexOf(met.sound)
                const next = SOUND_ORDER[(idx + 1) % SOUND_ORDER.length] || 'beep'
                met.setSound(next)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const idx = SOUND_ORDER.indexOf(met.sound)
                  const next = SOUND_ORDER[(idx + 1) % SOUND_ORDER.length] || 'beep'
                  met.setSound(next)
                }
              }}
            />
          </div>
          <select
            className="mt-3 max-w-[8rem] rounded border border-outline-variant bg-white px-1 py-0.5 text-xs"
            value={met.sound}
            onChange={(e) => met.setSound(e.target.value)}
            aria-label="Click sound"
          >
            <option value="beep">Beep</option>
            <option value="voiceNumbers">Voice</option>
            <option value="voiceCount">Count</option>
            <optgroup label="Drums (Synth Lab kit)">
              <option value="drum:kick">Kick</option>
              <option value="drum:snare">Snare</option>
              <option value="drum:hat">Hi-hat</option>
              <option value="drum:clap">Clap</option>
              <option value="drum:ride">Ride</option>
              <option value="drum:cowbell">Cowbell</option>
              <option value="drum:crashRide">Crash/Ride</option>
              <option value="drum:crash1">Crash</option>
            </optgroup>
          </select>
        </div>
        <div className="flex flex-col gap-2 wide:col-span-2">
          <span className="mb-1 text-[10px] font-bold uppercase text-on-surface-variant">Master output peak</span>
          <div className="flex flex-col gap-1.5 rounded bg-surface-dim p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
            {['L', 'R'].map((ch) => (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-3 text-[8px] font-bold">{ch}</span>
                <div className="flex h-2 flex-1 gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${i < 4 ? 'bg-secondary' : i === 4 ? 'bg-secondary-fixed-dim' : 'bg-surface-variant'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
