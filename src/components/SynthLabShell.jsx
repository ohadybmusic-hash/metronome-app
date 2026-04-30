/**
 * Stitch-inspired synth lab chrome: LCD strip + sidebar transport around embedded {@link SynthApp}.
 * @param {{ met: object, synthRef: import('react').RefObject<{ undoPatch?: () => boolean, toggleRecording?: () => void } | null>, recordingActive?: boolean, children: import('react').ReactNode }} props
 */
export default function SynthLabShell({ met, synthRef, recordingActive = false, children }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#121315] font-inter text-[#e3e2e5] antialiased">
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden p-4">
        <section className="relative flex-none overflow-hidden rounded-lg border border-neutral-800 bg-[#1b1c1e] p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                'linear-gradient(to bottom, rgba(18, 19, 21, 0) 50%, rgba(0, 0, 0, 0.1) 50%)',
              backgroundSize: '100% 4px',
            }}
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-[#899294]">
                Current kit
              </p>
              <p className="font-inter text-2xl font-bold leading-tight tracking-tight text-[#8ad2de]">
                CUSTOM RIG
              </p>
              <p className="mt-1 text-xs text-[#bec8ca]">Tempo follows Metronome tab ({Math.round(met.bpm)} BPM)</p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="font-inter text-[10px] font-medium uppercase text-[#899294]">Swing</p>
                <p className="font-inter text-lg font-semibold leading-tight text-[#76d5e0]">—</p>
              </div>
              <div className="text-right">
                <p className="font-inter text-[10px] font-medium uppercase text-[#899294]">Pan</p>
                <p className="font-inter text-lg font-semibold leading-tight text-[#ffb688]">
                  {Number(met.pan).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
          <div className="flex min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#0d0e10] md:min-h-0">
            {children}
          </div>

          <aside className="flex gap-2 overflow-x-auto pb-2 md:w-24 md:flex-shrink-0 md:flex-col md:overflow-visible md:pb-0">
            <button
              type="button"
              className="flex h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-lg border border-neutral-800 bg-[#292a2c] text-[#899294] transition-colors hover:text-[#8ad2de] md:h-16 md:min-w-0 md:flex-none"
              onClick={() => synthRef?.current?.openMixerDrawer?.()}
            >
              <span className="material-symbols-outlined text-[20px]">equalizer</span>
              <span className="mt-1 font-inter text-[9px] font-bold uppercase tracking-wide">Mixer</span>
            </button>
            <button
              type="button"
              className="flex h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-lg border border-[#8ad2de]/30 bg-[#292a2c] text-[#8ad2de] md:h-16 md:min-w-0 md:flex-none"
              aria-current="true"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                waves
              </span>
              <span className="mt-1 font-inter text-[9px] font-bold uppercase tracking-wide">Pads</span>
            </button>
            <button
              type="button"
              className="flex h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-lg border border-neutral-800 bg-[#292a2c] text-[#899294] transition-colors hover:text-[#8ad2de] md:h-16 md:min-w-0 md:flex-none"
              title="Undo kit / preset change"
              aria-label="Undo last synth patch change"
              onClick={() => {
                synthRef?.current?.undoPatch?.()
              }}
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              <span className="mt-1 font-inter text-[9px] font-bold uppercase tracking-wide">Undo</span>
            </button>
            <button
              type="button"
              className={`flex h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center rounded-lg border md:h-16 md:min-w-0 md:flex-none ${
                recordingActive
                  ? 'border-[#ffb4ab] bg-[#93000a]/35 text-[#ffb4ab] shadow-[0_0_12px_rgba(147,0,10,0.45)]'
                  : 'border-[#ffb4ab]/30 bg-[#93000a]/20 text-[#ffb4ab] hover:bg-[#93000a]/30'
              }`}
              title={recordingActive ? 'Stop and save recording' : 'Record synth output'}
              aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
              aria-pressed={recordingActive}
              onClick={() => {
                void synthRef?.current?.toggleRecording?.()
              }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                fiber_manual_record
              </span>
              <span className="mt-1 font-inter text-[9px] font-bold uppercase tracking-wide">
                {recordingActive ? 'Stop' : 'Rec'}
              </span>
            </button>
          </aside>
        </section>
      </main>
    </div>
  )
}
