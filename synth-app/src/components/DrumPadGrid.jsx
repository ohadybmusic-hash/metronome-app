/* Pad order and keys: `DRUM_PAD_LAYOUT` in `lib/drumVoices.js` (shared with `DrumEngineBlock`). */
import { drumAuxHumanLabel } from '../lib/drumArticulations.js'
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

/** @typedef {'cyan' | 'pinkAccent' | 'kick' | 'snare'} SynthwaveTier */

/** @param {{ voice?: number | null, aux?: string }} cell */
function cellHit(cell) {
  if (typeof cell.voice === 'number') return cell.voice
  if (typeof cell.aux === 'string' && cell.aux.length > 0) return { aux: cell.aux }
  return null
}

/** @param {number | { aux: string }} hit */
function hitSrOnly(hit) {
  if (typeof hit === 'number') return SUB[hit] ?? DRUM_VOICES[hit]?.label
  return drumAuxHumanLabel(/** @type {import('../lib/drumArticulations.js').DrumAuxId} */ (hit.aux))
}

/** Stitch synthwave “Drum Lab 04” — 4×4 row-major slots 01–16; `aux` = dedicated articulation voice. */
const SYNTHWAVE_DRUM = /** @type {ReadonlyArray<{ voice?: number | null; aux?: string; slot: string; icon: string; label: string; tier: SynthwaveTier }>} */ ([
  { aux: 'rim', slot: '01', icon: 'album', label: 'Rim', tier: 'cyan' },
  { aux: 'shaker', slot: '02', icon: 'blur_on', label: 'Shkr', tier: 'cyan' },
  { aux: 'noise_hit', slot: '03', icon: 'grain', label: 'Noise', tier: 'cyan' },
  { voice: 3, slot: '04', icon: 'flare', label: 'Clap', tier: 'cyan' },
  { aux: 'hat_closed', slot: '05', icon: 'trip_origin', label: 'H-Cl', tier: 'cyan' },
  { aux: 'hat_open', slot: '06', icon: 'radio_button_unchecked', label: 'H-Op', tier: 'cyan' },
  { voice: 4, slot: '07', icon: 'lens', label: 'Ride', tier: 'cyan' },
  { voice: 7, slot: '08', icon: 'brightness_5', label: 'Crsh', tier: 'cyan' },
  { aux: 'tom_hi', slot: '09', icon: 'waves', label: 'Tom-H', tier: 'pinkAccent' },
  { aux: 'tom_mid', slot: '10', icon: 'waves', label: 'Tom-M', tier: 'pinkAccent' },
  { aux: 'tom_lo', slot: '11', icon: 'waves', label: 'Tom-L', tier: 'pinkAccent' },
  { aux: 'stab', slot: '12', icon: 'keyboard', label: 'Stab', tier: 'pinkAccent' },
  { aux: 'kick_1', slot: '13', icon: 'circle', label: 'KICK 1', tier: 'kick' },
  { aux: 'kick_2', slot: '14', icon: 'adjust', label: 'KICK 2', tier: 'kick' },
  { voice: 1, slot: '15', icon: 'noise_aware', label: 'SNRE 1', tier: 'snare' },
  { voice: 1, slot: '16', icon: 'texture', label: 'SNRE 2', tier: 'snare' },
])

const PADS = DRUM_PAD_LAYOUT.map((c) => ({
  i: c.i,
  label: c.label,
  sub: SUB[c.i],
  color: DRUM_VOICES[c.i].color,
}))

/** @typedef {'ghost' | 'plain' | 'kick' | 'snare'} ObsidianDrumTier */

/** Stitch obsidian Synth Lab drum mock — full 4×4; `aux` pads use named articulations. */
const OBSIDIAN_DRUM = /** @type {ReadonlyArray<{ voice?: number | null; aux?: string; tier: ObsidianDrumTier; label: string; colSpan?: 2 }>} */ ([
  { aux: 'hat_open', tier: 'plain', label: 'OH' },
  { aux: 'hat_closed', tier: 'plain', label: 'CH' },
  { aux: 'pedal_chick', tier: 'plain', label: 'PEDAL' },
  { voice: 4, tier: 'plain', label: 'RIDE' },
  { aux: 'tom_hi', tier: 'ghost', label: 'T-HI' },
  { aux: 'tom_mid', tier: 'ghost', label: 'T-MID' },
  { aux: 'tom_lo', tier: 'ghost', label: 'T-LO' },
  { voice: 7, tier: 'plain', label: 'CRASH' },
  { aux: 'rim', tier: 'ghost', label: 'RIM' },
  { voice: 3, tier: 'plain', label: 'CLAP' },
  { voice: 6, tier: 'plain', label: 'PERC 1' },
  { aux: 'perc_click', tier: 'ghost', label: 'PERC 2' },
  { voice: 0, tier: 'kick', label: 'KICK', colSpan: 2 },
  { voice: 1, tier: 'snare', label: 'SNARE', colSpan: 2 },
])

function obsidianSubtitle(voice) {
  const t = voice == null ? '' : SUB[voice] ?? ''
  const flat = String(t).replace(/\s+/g, ' ').trim()
  if (flat.length <= 20) return flat.toUpperCase()
  return `${flat.slice(0, 19).trim()}…`.toUpperCase()
}

function obsidianGhostPadClass() {
  return 'relative flex min-h-0 min-w-0 cursor-pointer select-none flex-col items-center justify-center rounded-ds-xl border border-hairline bg-[var(--ds-nav-bg)] opacity-[0.72] transition-all [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:opacity-100'
}

function obsidianPlainPadClass() {
  return 'group relative flex min-h-0 min-w-0 cursor-pointer select-none flex-col items-center justify-center rounded-ds-xl border border-hairline bg-[var(--ds-nav-bg)] px-1 py-2 text-center shadow-sm transition-all [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:bg-primary-container'
}

function synthwaveTierClasses(tier) {
  switch (tier) {
    case 'kick':
      return 'bg-pink-500/20 sw-neon-border-pink shadow-[0_0_15px_rgb(236_72_153_/_0.35)] text-pink-500'
    case 'snare':
      return 'bg-cyan-500/20 sw-neon-border-cyan shadow-[0_0_15px_rgb(34_211_238_/_0.35)] text-cyan-400'
    case 'pinkAccent':
      return 'bg-surface-container-high sw-neon-border-pink text-pink-500'
    default:
      return 'bg-surface-container-high sw-neon-border-cyan text-cyan-400'
  }
}

function synthwaveSlotClass(tier) {
  switch (tier) {
    case 'kick':
      return 'text-pink-500/60'
    case 'snare':
      return 'text-cyan-400/60'
    case 'pinkAccent':
      return 'text-pink-500/40'
    default:
      return 'text-cyan-400/40'
  }
}

function synthwaveIconSize(tier) {
  return tier === 'kick' || tier === 'snare' ? 'text-2xl' : 'text-xl'
}

function synthwaveLabelClass(tier) {
  if (tier === 'kick' || tier === 'snare') return 'mt-1 text-center text-[12px] font-black uppercase tracking-tighter'
  return 'mt-1 text-center text-[10px] font-bold uppercase'
}

function synthwaveGhostPadClasses(tier) {
  switch (tier) {
    case 'pinkAccent':
      return 'opacity-[0.85]'
    default:
      return 'opacity-80'
  }
}

/** @typedef {'plain' | 'snare' | 'kick' | 'snareMain' | 'ghost'} LightLabTier */

/** Stitch light 4×4 lab grid — `aux` = dedicated articulation. Order: row-major. */
const LIGHT_LAB = /** @type {ReadonlyArray<{ voice?: number | null; aux?: string; tier: LightLabTier; label: string; face: string }>} */ ([
  { voice: 7, tier: 'plain', label: 'Crash', face: 'C1' },
  { voice: 4, tier: 'plain', label: 'Ride', face: 'R1' },
  { aux: 'hat_open', tier: 'plain', label: 'OH', face: 'H2' },
  { aux: 'hat_closed', tier: 'plain', label: 'CH', face: 'H1' },
  { aux: 'tom_hi', tier: 'ghost', label: 'Tom 1', face: 'T1' },
  { aux: 'tom_mid', tier: 'ghost', label: 'Tom 2', face: 'T2' },
  { aux: 'tom_lo', tier: 'ghost', label: 'Tom 3', face: 'T3' },
  { voice: 3, tier: 'plain', label: 'Clap', face: 'CP' },
  { aux: 'rim', tier: 'ghost', label: 'Rim', face: 'RS' },
  { voice: 1, tier: 'snare', label: 'Snare 1', face: 'S1' },
  { voice: 1, tier: 'snare', label: 'Snare 2', face: 'S2' },
  { voice: 5, tier: 'plain', label: 'Cowbell', face: 'CB' },
  { aux: 'kick_2', tier: 'kick', label: 'Sub Kick', face: 'B2' },
  { aux: 'kick_1', tier: 'kick', label: 'Kick', face: 'B1' },
  { voice: 1, tier: 'snareMain', label: 'Main Sn', face: 'S3' },
  { aux: 'fx_wash', tier: 'ghost', label: 'FX Pad', face: 'FX' },
])

/** Tactile pad face — Stitch drum lab (`linear-gradient` raised chip). */
const LIGHT_LAB_TACTILE =
  'cursor-pointer select-none flex-col items-center justify-center rounded border border-outline-variant bg-gradient-to-b from-white to-[#f1f3f5] shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-all hover:border-primary active:scale-[0.98] active:bg-gradient-to-b active:from-[#f1f3f5] active:to-white active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)]'

/** Kick/snare lane — `secondary-fixed` fill + primary rim from mock. */
const LIGHT_LAB_ACCENT_DRUM =
  'cursor-pointer select-none flex-col items-center justify-center rounded border-2 border-primary bg-secondary-fixed shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-transform hover:brightness-[1.02] active:scale-95'

function lightLabTierWrap(tier) {
  switch (tier) {
    case 'ghost':
      return 'cursor-pointer select-none flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98] hover:border-primary/40'
    case 'snare':
    case 'kick':
    case 'snareMain':
      return LIGHT_LAB_ACCENT_DRUM
    default:
      return LIGHT_LAB_TACTILE
  }
}

function lightLabLabelClass(tier) {
  switch (tier) {
    case 'kick':
    case 'snare':
    case 'snareMain':
      return 'font-label-caps text-[9px] text-on-secondary-fixed'
    default:
      return 'font-label-caps text-[9px] text-surface-tint'
  }
}

function lightLabFaceClass(tier) {
  switch (tier) {
    case 'kick':
    case 'snare':
    case 'snareMain':
      return 'font-mono text-sm font-bold tabular-nums tracking-tight text-on-secondary-fixed'
    default:
      return 'font-mono text-sm font-bold tabular-nums tracking-tight text-primary'
  }
}

/**
 * `div` pads (not `<button>`) so **two fingers** can strike two pads at once on
 * mobile; `touch-action: none` avoids the browser eating a second touch.
 *
 * @param {object} props
 * @param {(index: number) => void} props.onPadDown
 * @param {'obsidian' | 'synthwave' | 'lightLab' | undefined} [props.variant]
 */
export function DrumPadGrid({ onPadDown, variant }) {
  const obsidian = variant === 'obsidian'
  const synthwave = variant === 'synthwave'
  const lightLab = variant === 'lightLab'

  if (lightLab) {
    return (
      <div className="touch-none grid h-full min-h-0 w-full min-w-0 grid-cols-4 grid-rows-4 gap-2 p-2 sm:gap-3 sm:p-3">
        {LIGHT_LAB.map((cell, idx) => {
          const hit = cellHit(cell)
          const interactive = hit != null
          const padCls = `flex min-h-0 min-w-0 ${lightLabTierWrap(cell.tier)}`

          const face = (
            <>
              <span className={lightLabLabelClass(cell.tier)}>{cell.label}</span>
              <span className={lightLabFaceClass(cell.tier)}>{cell.face}</span>
              {interactive ? <span className="sr-only">{hitSrOnly(hit)}</span> : null}
            </>
          )

          if (!interactive) {
            return (
              <div key={idx} className={padCls} aria-hidden>
                {face}
              </div>
            )
          }

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              className={padCls}
              onPointerDown={(e) => {
                if (e.button != null && e.button !== 0) return
                e.preventDefault()
                e.stopPropagation()
                onPadDown(hit)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPadDown(hit)
                }
              }}
            >
              {face}
            </div>
          )
        })}
      </div>
    )
  }

  if (synthwave) {
    return (
      <div className="touch-none grid h-full min-h-0 w-full min-w-0 grid-cols-4 grid-rows-4 gap-3 p-0">
        {SYNTHWAVE_DRUM.map((cell, idx) => {
          const hit = cellHit(cell)
          const interactive = hit != null
          const face = (
            <>
              <span className={`absolute left-2 top-2 text-[8px] font-bold ${synthwaveSlotClass(cell.tier)}`}>{cell.slot}</span>
              <span className={`material-symbols-outlined ${synthwaveIconSize(cell.tier)}`} aria-hidden>
                {cell.icon}
              </span>
              <span className={synthwaveLabelClass(cell.tier)}>{cell.label}</span>
              {interactive ? <span className="sr-only">{hitSrOnly(hit)}</span> : null}
            </>
          )

          const padSurface = `relative flex aspect-square min-h-0 min-w-0 select-none flex-col items-center justify-center rounded-md transition-transform ${synthwaveTierClasses(cell.tier)}`

          if (!interactive) {
            return (
              <div key={idx} className={`${padSurface} ${synthwaveGhostPadClasses(cell.tier)}`} aria-hidden>
                {face}
              </div>
            )
          }

          const usedGhostLook = cell.aux != null

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              className={`${padSurface} sw-drum-pad-hit cursor-pointer active:scale-95 ${usedGhostLook ? synthwaveGhostPadClasses(cell.tier) : ''}`}
              onPointerDown={(e) => {
                if (e.button != null && e.button !== 0) return
                e.preventDefault()
                e.stopPropagation()
                onPadDown(hit)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPadDown(hit)
                }
              }}
            >
              {face}
            </div>
          )
        })}
      </div>
    )
  }

  if (obsidian) {
    return (
      <div className="touch-none grid h-full min-h-0 w-full min-w-0 grid-cols-4 grid-rows-4 gap-2 p-0 pb-4">
        {OBSIDIAN_DRUM.map((cell, idx) => {
          const colSpan = cell.colSpan === 2 ? 'col-span-2' : ''
          const hit = cellHit(cell)
          if (hit == null) {
            return (
              <div key={idx} className={`${obsidianGhostPadClass()} ${colSpan}`} aria-hidden>
                <span className="font-label-caps text-[11px] uppercase tracking-[0.08em] text-chrome-muted">{cell.label}</span>
              </div>
            )
          }

          const tier = /** @type {ObsidianDrumTier} */ (cell.tier)

          if (tier === 'ghost') {
            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                className={`${obsidianGhostPadClass()} ${colSpan}`}
                onPointerDown={(e) => {
                  if (e.button != null && e.button !== 0) return
                  e.preventDefault()
                  e.stopPropagation()
                  onPadDown(hit)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onPadDown(hit)
                  }
                }}
              >
                <span className="font-label-caps text-[11px] uppercase tracking-[0.08em] text-chrome-muted">{cell.label}</span>
                <span className="sr-only">{hitSrOnly(hit)}</span>
              </div>
            )
          }

          if (tier === 'kick' || tier === 'snare') {
            const vi = /** @type {number} */ (cell.voice)
            let padCls =
              tier === 'kick'
                ? 'synth-lab-active-glow relative flex min-h-0 min-w-0 cursor-pointer flex-col items-center justify-center rounded-ds-xl border-2 border-primary bg-primary/20 px-3 py-3 text-center transition-all [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:brightness-125'
                : 'relative flex min-h-0 min-w-0 cursor-pointer flex-col items-center justify-center rounded-ds-xl border-2 border-secondary/50 bg-surface-container-high px-3 py-3 text-center transition-all [-webkit-tap-highlight-color:transparent] active:scale-[0.98] active:bg-secondary/40'
            padCls = `${padCls} ${colSpan}`
            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                className={padCls}
                onPointerDown={(e) => {
                  if (e.button != null && e.button !== 0) return
                  e.preventDefault()
                  e.stopPropagation()
                  onPadDown(hit)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onPadDown(hit)
                  }
                }}
              >
                <div
                  className={`absolute left-2 top-1 h-1 w-1 rounded-full ${
                    tier === 'kick' ? 'bg-primary shadow-[0_0_6px_rgb(var(--ds-primary-rgb))]' : 'bg-secondary shadow-[0_0_6px_rgb(255_182_136_/_0.55)]'
                  }`}
                  aria-hidden
                />
                <span
                  className={`font-label-caps text-[11px] uppercase tracking-[0.08em] ${
                    tier === 'kick' ? 'text-primary' : 'text-secondary'
                  }`}
                >
                  {cell.label}
                </span>
                <span className={`mt-1 px-1 text-center text-[10px] font-bold leading-tight ${tier === 'kick' ? 'text-primary/60' : 'text-secondary/60'}`}>
                  {obsidianSubtitle(vi)}
                </span>
                <span className="sr-only">{hitSrOnly(hit)}</span>
              </div>
            )
          }

          let padCls = obsidianPlainPadClass()
          padCls = `${padCls} ${colSpan}`

          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              className={padCls}
              onPointerDown={(e) => {
                if (e.button != null && e.button !== 0) return
                e.preventDefault()
                e.stopPropagation()
                onPadDown(hit)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPadDown(hit)
                }
              }}
            >
              <span className="font-label-caps text-[11px] uppercase tracking-[0.08em] text-chrome-muted group-active:text-on-primary-container">{cell.label}</span>
              <span className="sr-only">{hitSrOnly(hit)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="touch-none grid h-full min-h-0 w-full min-w-0 grid-cols-2 grid-rows-4 gap-2.5 p-2.5 sm:gap-3.5 sm:p-4">
      {PADS.map((p) => {
        return (
          <div
            key={p.i}
            role="button"
            tabIndex={0}
            className="flex min-h-0 min-w-0 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-3xl border-2 border-zinc-800/90 bg-zinc-950/80 py-1 text-center text-zinc-200 shadow-md active:scale-[0.98] sm:gap-1.5 sm:py-1.5"
            style={{
              background: `radial-gradient(120% 100% at 50% 100%, ${p.color}18 0%, rgba(5,5,6,0.95) 55%)`,
              boxShadow: `0 0 0 1px ${p.color}25`,
            }}
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
            <span className="text-base font-bold tracking-wide sm:text-lg" style={{ color: p.color }}>
              {p.label}
            </span>
            <span className="line-clamp-2 max-w-full px-1 text-center text-[10px] leading-tight text-zinc-500 sm:text-xs">
              {p.sub}
            </span>
          </div>
        )
      })}
    </div>
  )
}
