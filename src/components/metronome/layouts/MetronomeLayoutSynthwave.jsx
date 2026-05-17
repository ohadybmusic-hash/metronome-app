import { clamp } from '../../../lib/clamp.js'
import { useLiveBeatIndex } from '../../../hooks/useLiveBeatIndex.js'
import { useSynthwaveMetronomeSubView } from '../../../hooks/useSynthwaveMetronomeSubView.js'
import { accentToNumeric } from '../../../lib/metronome/beatAccentLabels.js'
import { STITCH_SYNTHWAVE_HERO_IMAGE_URL, writeSynthwaveMetronomeView } from '../../../lib/metronomeSynthwaveView.js'

/** Which stacked row (0=ACC, 1=MID, 2=LOW) is active for this accent level — matches Stitch grid mock. */
function accentActiveRow(level) {
  const n = accentToNumeric(level)
  if (n >= 3) return 0
  if (n === 2) return 1
  if (n === 1) return 2
  return -1
}

const ROW_META = /** @type {const} */ ([
  { label: 'ACC', activeClass: 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)] border border-white/20 text-surface-container-lowest' },
  { label: 'MID', activeClass: 'bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)] border border-white/20 text-surface-container-lowest' },
  {
    label: 'LOW',
    activeClass: 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.7)] border border-white/20 text-white',
  },
])

function StitchGridBeatColumn({ beatIndex, level, isLive, onCycle }) {
  const activeRow = accentActiveRow(level)
  return (
    <button
      type="button"
      className="flex flex-col gap-2"
      aria-label={`Beat ${beatIndex + 1}, tap to cycle accent`}
      onClick={() => onCycle(beatIndex)}
    >
      {[0, 1, 2].map((row) => {
        const on = activeRow === row
        const dim = !on ? 'bg-surface-container border border-cyan-400/20 opacity-50' : ''
        return (
          <div
            key={row}
            className={`flex h-12 items-center justify-center rounded ${on ? ROW_META[row].activeClass : dim} ${isLive && on ? 'ring-1 ring-white/30' : ''}`}
          >
            {on ? (
              <span className="font-space-grotesk text-[12px] font-black leading-4 tracking-[0.05em]">{ROW_META[row].label}</span>
            ) : null}
          </div>
        )
      })}
    </button>
  )
}

/** Stitch 05 — MATRIX_SYNC wheel (horizontal beat strips + tempo disc + Reset / Engage / Tap). */
function SynthwaveWheelLayout({
  met,
  bpm,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const liveBeat = useLiveBeatIndex(met)
  const beats = Math.max(1, Math.min(met.pulsesPerMeasure || 4, 8))
  const ringRotateDeg = ((clamp(bpm, 20, 400) - 20) / 380) * 360

  const ensureAudio = () => {
    try {
      met.audio?.ensure?.()
    } catch {
      /* */
    }
  }

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-between overflow-hidden p-gutter">
      {/* Beat strips */}
      <div className="flex w-full max-w-md justify-between gap-2 px-4 py-6">
        {Array.from({ length: beats }, (_, i) => (
          <div
            key={i}
            className={`relative h-3 flex-1 overflow-hidden rounded-sm border ${
              i === liveBeat
                ? 'border-primary-container/40 bg-primary-container/20'
                : 'border-outline-variant/30 bg-surface-container'
            }`}
          >
            {i === liveBeat ? (
              <div className="absolute inset-0 animate-pulse bg-primary-container shadow-[0_0_15px_#ff00ff]" />
            ) : null}
          </div>
        ))}
      </div>

      {/* Wheel */}
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div className="absolute h-80 w-80 rounded-full bg-primary/5 blur-[80px]" aria-hidden />
        <div
          data-walkthrough="bpm-dial"
          className="relative flex h-[280px] w-[280px] items-center justify-center rounded-full border-4 border-surface-container-highest bg-surface-container-lowest/80 backdrop-blur-md sw-stitch-tempo-glow md:h-[340px] md:w-[340px]"
        >
          <div className="absolute inset-2 rounded-full border border-secondary-fixed/20" />
          <div className="absolute inset-[-10px] rotate-45 rounded-full border border-dashed border-primary/20" aria-hidden />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-4">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              arrow_drop_down
            </span>
          </div>
          <div className="z-10 text-center">
            <span className="block text-[84px] font-bold leading-none tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(255,171,243,0.8)] md:text-[100px]">
              {Math.round(bpm)}
            </span>
            <span className="mt-2 block font-space-grotesk text-[14px] font-semibold uppercase leading-5 tracking-[0.4em] text-secondary-fixed opacity-80">
              BPM
            </span>
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-full border-t-4 border-secondary-fixed shadow-[0_-4px_15px_rgba(0,251,251,0.5)]"
            style={{ transform: `rotate(${ringRotateDeg}deg)` }}
          />
        </div>
        <div className="z-10 mt-8 flex gap-12">
          <button
            type="button"
            className="group flex h-14 w-14 items-center justify-center rounded-none border border-secondary-fixed/40 bg-surface-container-low transition-all active:scale-95 hover:bg-secondary-fixed/10"
            aria-label="Decrease BPM"
            onClick={() => met.setBpm(clamp(Math.round(bpm) - 1, 1, 400))}
          >
            <span className="material-symbols-outlined text-secondary-fixed group-hover:drop-shadow-[0_0_5px_rgba(0,251,251,1)]">
              remove
            </span>
          </button>
          <button
            type="button"
            className="group flex h-14 w-14 items-center justify-center rounded-none border border-secondary-fixed/40 bg-surface-container-low transition-all active:scale-95 hover:bg-secondary-fixed/10"
            aria-label="Increase BPM"
            onClick={() => met.setBpm(clamp(Math.round(bpm) + 1, 1, 400))}
          >
            <span className="material-symbols-outlined text-secondary-fixed group-hover:drop-shadow-[0_0_5px_rgba(0,251,251,1)]">add</span>
          </button>
        </div>
      </div>

      {/* Transport — Reset / Engage / Tap */}
      <div className="mb-24 grid w-full max-w-sm grid-cols-3 gap-4 md:mb-8">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="flex w-full items-center justify-center border border-outline/30 bg-surface-container py-4 transition-colors hover:bg-surface-bright active:scale-95"
            aria-label="Reset tempo"
            onClick={() => {
              met.setBpm(120)
              ensureAudio()
            }}
          >
            <span className="material-symbols-outlined text-on-surface-variant">replay</span>
          </button>
          <span className="font-space-grotesk text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">Reset</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            data-walkthrough="play-fab"
            className="flex w-full items-center justify-center bg-primary py-4 font-bold text-on-primary shadow-[0_0_20px_rgba(255,0,255,0.4)] transition-all hover:brightness-110 active:scale-95"
            onTouchStart={ensureAudio}
            onPointerUp={handlePlayFabPointerUp}
            onTouchEnd={handlePlayFabTouchEnd}
            onClick={handlePlayFabClick}
            aria-label={met.isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {met.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <span className="font-space-grotesk text-[10px] font-medium uppercase tracking-widest text-primary">Engage</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className="flex w-full items-center justify-center border border-outline/30 bg-surface-container py-4 transition-colors hover:bg-surface-bright active:scale-95"
            aria-label="Tap tempo"
            onClick={handleTap}
          >
            <span className="material-symbols-outlined text-on-surface-variant">touch_app</span>
          </button>
          <span className="font-space-grotesk text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">Tap</span>
        </div>
      </div>

      <div className="absolute bottom-24 left-6 hidden flex-col gap-1 border-l-2 border-secondary-fixed/30 pl-3 md:flex" aria-hidden>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-secondary-fixed">Signal: Online</span>
        <span className="text-[10px] font-bold uppercase tracking-tighter text-primary/60">Sync: Master</span>
      </div>
    </div>
  )
}

/** Stitch 06 — BPM matrix card + ACC/MID/LOW columns + slider + play cluster. */
function SynthwaveGridLayout({
  met,
  bpm,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const liveBeat = useLiveBeatIndex(met)
  const beats = Math.max(1, Math.min(met.pulsesPerMeasure || 4, 8))
  const sigDisplay = met.timeSignature.replace(/\//g, ' / ')

  const ensureAudio = () => {
    try {
      met.audio?.ensure?.()
    } catch {
      /* */
    }
  }

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center overflow-hidden px-4 pb-24 pt-4">
      <div className="absolute left-6 top-4 flex flex-col items-start gap-1">
        <div className="font-space-grotesk text-[12px] font-bold uppercase leading-4 tracking-tight text-pink-500">TEMPO TRAINER PRO</div>
        <div className="h-1 w-24 bg-gradient-to-r from-pink-500 to-transparent" />
      </div>

      <div
        data-walkthrough="bpm-dial"
        className="relative mb-6 mt-12 w-full max-w-md overflow-hidden rounded-xl border border-cyan-400/30 bg-surface-container-lowest p-4 shadow-[0_0_30px_rgba(0,255,255,0.05)]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <img src={STITCH_SYNTHWAVE_HERO_IMAGE_URL} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.05em] text-cyan-400/60">BPM Matrix</span>
            <span className="text-[48px] font-bold leading-none tracking-tighter text-secondary-fixed [text-shadow:0_0_10px_rgba(0,255,255,0.8)] md:text-[56px]">
              {Math.round(bpm)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.05em] text-pink-500/60">Signature</span>
            <span className="text-2xl font-semibold italic text-pink-500 md:text-[32px] md:leading-10">{sigDisplay}</span>
          </div>
        </div>
      </div>

      <div
        className="mb-8 grid w-full max-w-md gap-3"
        style={{ gridTemplateColumns: `repeat(${beats}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: beats }, (_, i) => (
          <StitchGridBeatColumn
            key={i}
            beatIndex={i}
            level={met.beatAccents?.[i]}
            isLive={i === liveBeat}
            onCycle={(idx) => met.cycleBeatAccent(idx)}
          />
        ))}
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="relative pt-4">
          <label className="absolute -top-1 left-3 z-20 border-l border-r border-cyan-400/50 bg-surface-dim px-2 font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.2em] text-cyan-400">
            Tempo Slider
          </label>
          <div className="relative overflow-hidden rounded-lg border border-cyan-400/30 bg-surface-container-low p-6">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-cyan-400/50">remove</span>
              <input
                type="range"
                min={20}
                max={400}
                value={Math.round(bpm)}
                aria-label="Tempo BPM"
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-variant accent-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                onChange={(e) => met.setBpm(Number(e.target.value))}
              />
              <span className="material-symbols-outlined text-cyan-400/50">add</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-cyan-400/30 bg-surface-container-high px-4 py-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm text-pink-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                timer
              </span>
              <span className="font-space-grotesk text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-on-surface">Timer</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded border border-cyan-400/30 bg-surface-container-high px-4 py-2 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm text-cyan-400">volume_up</span>
              <span className="font-space-grotesk text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-on-surface">Audio</span>
            </button>
          </div>
          <button
            type="button"
            data-walkthrough="play-fab"
            className="relative flex h-24 w-24 items-center justify-center rounded-full bg-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.6)] transition-all duration-150 active:scale-90 active:brightness-125"
            onTouchStart={ensureAudio}
            onPointerUp={handlePlayFabPointerUp}
            onTouchEnd={handlePlayFabTouchEnd}
            onClick={handlePlayFabClick}
            aria-label={met.isPlaying ? 'Pause' : 'Play'}
          >
            <div className="absolute inset-0 scale-110 animate-pulse rounded-full border-4 border-white/20" />
            <span className="material-symbols-outlined text-5xl text-black" style={{ fontVariationSettings: "'FILL' 1" }}>
              {met.isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            className="flex h-20 w-20 flex-col items-center justify-center rounded border-2 border-cyan-400 bg-cyan-400/10 transition-all active:bg-cyan-400 active:text-black"
            aria-label="Tap tempo"
            onClick={handleTap}
          >
            <span className="font-space-grotesk text-[12px] font-black uppercase text-cyan-400">TAP</span>
            <span className="material-symbols-outlined text-cyan-400">touch_app</span>
          </button>
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-1/4 -right-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" aria-hidden />
      <div className="pointer-events-none fixed top-1/4 -left-20 h-64 w-64 rounded-full bg-pink-500/10 blur-[100px]" aria-hidden />
    </div>
  )
}

/**
 * Stitch MATRIX_SYNC synthwave metronome — separate HTML mocks for wheel (05) vs grid (06).
 * Sub-view is chosen in Settings / metronome drawer (not on-canvas), matching exported screens.
 */
export function MetronomeLayoutSynthwave({
  met,
  bpm,
  tempoLabel: _tempoLabel,
  tapHint: _tapHint,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  void _tempoLabel
  void _tapHint
  const view = useSynthwaveMetronomeSubView()

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-dim font-space-grotesk text-on-surface">
      {/* Sub-view toggle — Wheel / Grid */}
      <div className="absolute right-4 top-3 z-20 flex gap-0 overflow-hidden rounded border border-pink-500/30">
        {(['wheel', 'grid'] /** @type {const} */).map((v) => (
          <button
            key={v}
            type="button"
            className={`px-3 py-1 font-space-grotesk text-[10px] font-bold uppercase tracking-widest transition-colors ${view === v ? 'bg-pink-500 text-black' : 'bg-surface-container-low text-pink-500/70 hover:text-pink-500'}`}
            onClick={() => writeSynthwaveMetronomeView(v)}
            aria-pressed={view === v}
          >
            {v}
          </button>
        ))}
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[5] opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02))`,
          backgroundSize: '100% 4px, 3px 100%',
        }}
        aria-hidden
      />

      {view === 'wheel' ? (
        <SynthwaveWheelLayout
          met={met}
          bpm={bpm}
          handleTap={handleTap}
          handlePlayFabClick={handlePlayFabClick}
          handlePlayFabPointerUp={handlePlayFabPointerUp}
          handlePlayFabTouchEnd={handlePlayFabTouchEnd}
        />
      ) : (
        <SynthwaveGridLayout
          met={met}
          bpm={bpm}
          handleTap={handleTap}
          handlePlayFabClick={handlePlayFabClick}
          handlePlayFabPointerUp={handlePlayFabPointerUp}
          handlePlayFabTouchEnd={handlePlayFabTouchEnd}
        />
      )}
    </div>
  )
}
