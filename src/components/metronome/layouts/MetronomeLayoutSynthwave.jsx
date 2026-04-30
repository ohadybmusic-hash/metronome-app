import { clamp } from '../../../lib/clamp.js'
import { useLiveBeatIndex } from '../../../hooks/useLiveBeatIndex.js'
import { cycleTimeSignature } from '../../../lib/metronome/meterCycle.js'

/**
 * Stitch “Synthwave wheel” layout (neon wheel + tap row).
 */
export function MetronomeLayoutSynthwave({
  met,
  bpm,
  tempoLabel,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const liveBeat = useLiveBeatIndex(met)
  const beats = Math.min(Math.max(1, met.pulsesPerMeasure || 1), 8)

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#0e0e1e] bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[length:32px_32px] px-4 py-6 font-space-grotesk text-[#e3e0f7]">
      <div className="scanline-overlay-sw pointer-events-none fixed inset-0 z-[90]" aria-hidden="true" />

      <div className="relative z-[1] flex w-full max-w-md flex-col items-center gap-6">
        <div className="mb-1 flex gap-4" aria-hidden="true">
          {Array.from({ length: beats }, (_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full border ${i === liveBeat ? 'border-transparent bg-[#ff00ff] shadow-[0_0_15px_rgba(255,0,255,0.4)]' : 'border-[#a4899d] bg-[#333345]'}`}
            />
          ))}
        </div>

        <div className="relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border-4 border-[#ff00ff] bg-[#0d0d1c] shadow-[0_0_15px_rgba(255,0,255,0.4)]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'conic-gradient(from 0deg, transparent, #ff00ff, transparent)',
              filter: 'blur(20px)',
            }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col items-center">
            <span className="mb-[-4px] text-xs font-medium uppercase tracking-[0.3em] text-[#00dddd]">BPM</span>
            <span className="font-inter text-[84px] font-black leading-none tracking-tight text-[#00dddd] [text-shadow:0_0_8px_rgba(0,251,251,0.8)]">
              {Math.round(bpm)}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#ffabf3]">{met.timeSignature}</span>
              <div className="h-1 w-1 rounded-full bg-[#a4899d]" />
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-[#00fbfb]">{tempoLabel}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-4 rounded-full border border-[#a4899d]/20">
            <div className="absolute left-1/2 top-0 h-4 w-1 -translate-x-1/2 bg-[#ff00ff]" />
            <div className="absolute bottom-0 left-1/2 h-4 w-1 -translate-x-1/2 bg-[#a4899d]/40" />
            <div className="absolute left-0 top-1/2 h-1 w-4 -translate-y-1/2 bg-[#a4899d]/40" />
            <div className="absolute right-0 top-1/2 h-1 w-4 -translate-y-1/2 bg-[#a4899d]/40" />
          </div>
        </div>

        <button
          type="button"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#ff00ff] text-[#510051] shadow-[0_0_15px_rgba(255,0,255,0.4)] transition-transform active:scale-95"
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
          aria-label={met.isPlaying ? 'Pause' : 'Play'}
        >
          <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {met.isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <div className="grid w-full max-w-sm grid-cols-3 gap-2 px-4">
          <button
            type="button"
            className="flex h-12 items-center justify-center rounded-lg border border-[#a4899d]/30 bg-[#29283a] text-[#00fbfb] transition-colors hover:bg-[#383749] active:scale-95"
            aria-label="Decrease BPM"
            onClick={() => met.setBpm(clamp(Math.round(bpm) - 1, 1, 400))}
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <button
            type="button"
            className="flex h-12 items-center justify-center rounded-lg border border-[#00fbfb]/30 bg-[#0d0d1c] text-sm font-semibold uppercase tracking-wide text-[#00dddd]"
            onClick={handleTap}
          >
            Tap
          </button>
          <button
            type="button"
            className="flex h-12 items-center justify-center rounded-lg border border-[#a4899d]/30 bg-[#29283a] text-[#00fbfb] transition-colors hover:bg-[#383749] active:scale-95"
            aria-label="Increase BPM"
            onClick={() => met.setBpm(clamp(Math.round(bpm) + 1, 1, 400))}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <div className="flex w-full items-center justify-center gap-4 text-xs font-medium uppercase tracking-wider text-[#dcbed4]">
          <button
            type="button"
            className="rounded-md border border-[#564052]/50 px-2 py-1 hover:border-[#ffabf3]/50"
            onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, -1))}
          >
            ◀ Sig
          </button>
          <span>{met.timeSignature}</span>
          <button
            type="button"
            className="rounded-md border border-[#564052]/50 px-2 py-1 hover:border-[#ffabf3]/50"
            onClick={() => met.setTimeSignature(cycleTimeSignature(met.timeSignature, 1))}
          >
            Sig ▶
          </button>
        </div>
      </div>

    </main>
  )
}
