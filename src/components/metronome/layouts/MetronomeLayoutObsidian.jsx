import { RotaryDial } from '../RotaryDial.jsx'
import { useLiveBeatIndex } from '../../../hooks/useLiveBeatIndex.js'
import { cycleTimeSignature } from '../../../lib/metronome/meterCycle.js'

/**
 * Stitch “Obsidian” metronome layout (dark LCD + beat tiles + knob + tap).
 */
export function MetronomeLayoutObsidian({
  met,
  bpm,
  tempoLabel,
  tapHint,
  handleTap,
  handlePlayFabClick,
  handlePlayFabPointerUp,
  handlePlayFabTouchEnd,
}) {
  const liveBeat = useLiveBeatIndex(met)
  const beats = Math.min(Math.max(1, met.pulsesPerMeasure || 1), 8)

  const shiftMeter = (delta) => {
    met.setTimeSignature(cycleTimeSignature(met.timeSignature, delta))
  }

  return (
    <main className="flex flex-1 flex-col gap-4 overflow-hidden bg-[#0d0e10] px-4 py-6 font-inter text-[14px] leading-normal text-[#e3e2e5]">
      <section className="lcd-inset-obsidian relative overflow-hidden rounded-lg border border-neutral-800/50 p-6">
        <div className="scan-line-obsidian pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-[#8ad2de]/50">
            CURRENT TEMPO
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-inter text-[48px] font-extrabold leading-none tracking-[-0.04em] text-[#8ad2de] active-glow-obsidian">
              {Math.round(bpm)}
            </span>
            <span className="font-inter text-lg font-semibold text-[#8ad2de]/70">BPM</span>
          </div>
          <div className="mt-4 flex w-full justify-between px-2">
            <span className="font-inter text-[10px] font-medium uppercase text-[#bec8ca]">{tempoLabel}</span>
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: beats }, (_, i) => (
                <span
                  key={i}
                  className={`h-3 w-1 rounded-[1px] ${i === liveBeat ? 'bg-[#8ad2de]' : 'bg-neutral-800'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`grid gap-2 ${beats <= 4 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-8'}`}>
        {Array.from({ length: beats }, (_, i) => {
          const n = i + 1
          const active = i === liveBeat
          return (
            <button
              key={i}
              type="button"
              className={`flex h-20 items-center justify-center rounded-lg border-t transition-colors ${
                active
                  ? 'border-t-white/20 bg-[#8ad2de] shadow-[0_0_20px_rgba(138,210,222,0.4)]'
                  : 'border-t-neutral-700/50 bg-[#292a2c]'
              }`}
              aria-current={active ? 'true' : undefined}
              aria-label={`Beat ${n}${active ? ', active' : ''}`}
              onClick={() => met.cycleBeatAccent(i)}
              title={`Beat ${n}: tap to cycle accent`}
            >
              <span
                className={`font-inter text-2xl font-bold leading-tight ${active ? 'text-[#00363d]' : 'text-neutral-500'}`}
              >
                {n}
              </span>
            </button>
          )
        })}
      </section>

      <section className="grid flex-1 grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center rounded-lg border-t border-neutral-700/30 bg-[#1f2022] p-4">
          <div className="origin-center scale-[0.82] sm:scale-[0.9]">
            <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} onTap={handleTap} label="BPM" />
          </div>
          <span className="mt-1 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
            TEMPO ADJUST
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            className="flex flex-1 flex-col items-center justify-center rounded-lg border-t border-neutral-700/30 bg-[#1f2022] p-4 transition-all active:brightness-125"
            aria-label="Tap tempo"
            onClick={handleTap}
          >
            <span className="material-symbols-outlined text-4xl text-[#8ad2de]">touch_app</span>
            <span className="mt-2 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-[#8ad2de]">
              TAP TEMPO
            </span>
            {tapHint ? (
              <span className="mt-1 max-w-[10rem] text-center font-inter text-[10px] text-neutral-500">{tapHint}</span>
            ) : null}
          </button>

          <div className="flex h-24 items-center justify-between rounded-lg border-t border-neutral-700/30 bg-[#1f2022] p-4">
            <div className="flex flex-col">
              <span className="mb-1 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                BEATS
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-neutral-500 hover:text-[#8ad2de]"
                  aria-label="Previous time signature"
                  onClick={() => shiftMeter(-1)}
                >
                  <span className="material-symbols-outlined text-sm">remove</span>
                </button>
                <span className="font-inter text-lg font-semibold">{met.timeSignature}</span>
                <button
                  type="button"
                  className="text-neutral-500 hover:text-[#8ad2de]"
                  aria-label="Next time signature"
                  onClick={() => shiftMeter(1)}
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                </button>
              </div>
            </div>
            <span className="material-symbols-outlined text-neutral-500" aria-hidden="true">
              music_note
            </span>
          </div>
        </div>
      </section>

      <section className="py-2">
        <button
          type="button"
          className="flex h-16 w-full items-center justify-center gap-3 rounded-lg border-t border-white/30 bg-[#8ad2de] shadow-[0_0_30px_rgba(138,210,222,0.3)] transition-transform active:scale-95"
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
            className="material-symbols-outlined text-3xl text-[#00363d]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            play_arrow
          </span>
          <span className="font-inter text-2xl font-bold uppercase leading-tight tracking-tight text-[#00363d]">
            {met.countIn?.active ? 'CANCEL' : met.isPlaying ? 'PAUSE' : 'START TRAINER'}
          </span>
        </button>
      </section>
    </main>
  )
}
