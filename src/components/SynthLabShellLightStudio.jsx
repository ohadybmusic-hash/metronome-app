/**
 * Stitch light-mode studio rack + transport strip (embedded Synth Lab HTML mock).
 */

/** Tempo readout + recessed waveform scope — Drum Lab HTML strip. */
export function LightDrumStatusRack({ met, recordingActive = false }) {
  const bpm = Number(met?.bpm)
  const tempoDisplay = Number.isFinite(bpm) ? bpm.toFixed(2) : '—'

  return (
    <section className="studio-panel-border flex min-h-[5.5rem] shrink-0 items-center justify-between gap-3 rounded-lg bg-surface-container-lowest px-3 py-2 shadow-sm sm:gap-4 sm:px-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-label-caps text-[10px] uppercase tracking-[0.08em] text-on-surface-variant sm:text-[11px]">
          Tempo Engine
        </span>
        <div className="flex items-baseline gap-1 rounded border border-outline-variant bg-surface-container px-2 py-1 sm:px-3">
          <span className="font-mono text-2xl font-black tabular-nums leading-none text-primary sm:text-4xl">{tempoDisplay}</span>
          <span className="font-label-caps text-[10px] uppercase tracking-[0.08em] text-surface-tint">BPM</span>
        </div>
      </div>
      <div className="studio-surface-recessed relative flex min-h-[4rem] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-sm">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'linear-gradient(var(--ds-outline) 1px, transparent 1px), linear-gradient(90deg, var(--ds-outline) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
          aria-hidden
        />
        <svg className="relative z-[1] h-full w-full min-h-[3rem]" preserveAspectRatio="none" viewBox="0 0 400 100" aria-hidden>
          <path
            className="opacity-50"
            d="M0 50 Q 25 10, 50 50 T 100 50 T 150 50 T 200 50 T 250 50 T 300 50 T 350 50 T 400 50"
            fill="none"
            stroke="var(--ds-primary-container)"
            strokeWidth="2"
          />
          <path
            d="M0 50 Q 10 80, 20 50 T 40 50 T 60 50 T 80 50 T 100 50 T 120 50 T 140 50 T 160 50 T 180 50 T 200 50"
            fill="none"
            stroke="var(--ds-secondary)"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute right-2 top-2 z-[2] flex items-center gap-2">
          <div
            className={`h-2 w-2 shrink-0 rounded-full bg-error ${recordingActive ? 'animate-pulse' : 'opacity-40'}`}
            aria-hidden
          />
          <span
            className={`font-label-caps text-[10px] uppercase ${recordingActive ? 'text-error' : 'text-on-surface-variant'}`}
          >
            Live
          </span>
        </div>
      </div>
    </section>
  )
}

/** Decorative FX modules — mirrors Stitch Drum Lab aside (Hall / Comp / Dirt); opens real mixer / FX when tapped. */
export function LightDrumFxRack({ synthRef }) {
  const openFx = () => {
    try {
      void synthRef?.current?.initAudio?.()
      synthRef?.current?.openMixerDrawer?.()
    } catch {
      /* */
    }
  }

  return (
    <aside className="studio-panel-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm md:min-h-[280px]">
      <div className="flex h-12 shrink-0 items-stretch border-b border-outline-variant bg-surface-container-low">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between px-3 text-left outline-none transition-colors hover:bg-surface-container-high [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={openFx}
        >
          <span className="text-sm font-black uppercase leading-none tracking-tight text-primary">FX Rack</span>
          <span className="material-symbols-outlined text-lg text-on-surface-variant" aria-hidden>
            add_circle
          </span>
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin]">
        <div className="flex flex-col gap-3 border-b border-outline-variant pb-4">
          <button
            type="button"
            className="flex w-full flex-col gap-3 border-0 bg-transparent p-0 text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={openFx}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] uppercase tracking-[0.08em] text-primary">Hall Reverb</span>
              <div className="relative h-3 w-6 rounded-full bg-primary">
                <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white" aria-hidden />
              </div>
            </div>
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                  <div
                    className="absolute left-1/2 top-1 h-3 w-0.5 origin-bottom rounded-full bg-primary"
                    style={{ transform: 'translateX(-50%) rotate(-45deg)' }}
                    aria-hidden
                  />
                </div>
                <span className="font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Dry/Wet</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
                  <div
                    className="absolute left-1/2 top-1 h-3 w-0.5 origin-bottom rounded-full bg-primary"
                    style={{ transform: 'translateX(-50%) rotate(90deg)' }}
                    aria-hidden
                  />
                </div>
                <span className="font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Decay</span>
              </div>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-outline-variant pb-4">
          <button
            type="button"
            className="flex w-full flex-col gap-3 border-0 bg-transparent p-0 text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={openFx}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] uppercase tracking-[0.08em] text-primary">Tube Comp</span>
              <div className="relative h-3 w-6 rounded-full bg-primary">
                <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-white" aria-hidden />
              </div>
            </div>
            <div className="studio-surface-recessed relative flex h-12 items-end gap-1 rounded p-1">
              <div className="flex-1 rounded-sm bg-primary" style={{ height: '4px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-primary" style={{ height: '8px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-primary" style={{ height: '14px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-primary" style={{ height: '22px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-secondary-container" style={{ height: '30px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-secondary-container" style={{ height: '12px' }} aria-hidden />
              <div className="flex-1 rounded-sm bg-secondary-container" style={{ height: '6px' }} aria-hidden />
              <span className="pointer-events-none absolute left-1 top-1 font-label-caps text-[7px] uppercase tracking-wide text-on-surface-variant">
                GR (dB)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-outline-variant bg-surface-container-low p-1">
                <span className="block font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Thresh</span>
                <span className="block font-mono text-xs font-semibold tabular-nums text-primary">-12.4</span>
              </div>
              <div className="rounded border border-outline-variant bg-surface-container-low p-1">
                <span className="block font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Ratio</span>
                <span className="block font-mono text-xs font-semibold tabular-nums text-primary">4:1</span>
              </div>
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            className="flex w-full flex-col gap-3 border-0 bg-transparent p-0 text-left outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={openFx}
          >
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] uppercase tracking-[0.08em] text-primary">Dirt Box</span>
              <div className="relative h-3 w-6 rounded-full bg-outline-variant">
                <div className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-white" aria-hidden />
              </div>
            </div>
            <div className="studio-surface-recessed relative rounded px-2 py-3">
              <div className="relative h-4 w-full rounded-full bg-outline-variant/80">
                <div className="absolute left-[22%] top-1/2 flex h-6 w-4 -translate-y-1/2 flex-col justify-between rounded-sm border border-white bg-primary py-1">
                  <span className="mx-auto block h-px w-full bg-white/90" aria-hidden />
                  <span className="mx-auto block h-px w-full bg-white/90" aria-hidden />
                  <span className="mx-auto block h-px w-full bg-white/90" aria-hidden />
                </div>
              </div>
              <div className="mt-3 flex justify-between">
                <span className="font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Res: 12bit</span>
                <span className="font-label-caps text-[8px] uppercase tracking-wide text-surface-tint">Drive</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </aside>
  )
}

export function LightSynthSideRack({ synthRef }) {
  const openSynth = () => {
    try {
      void synthRef?.current?.initAudio?.()
      synthRef?.current?.openPianoSynthesis?.()
    } catch {
      /* */
    }
  }

  const knobs = [
    { label: 'Cutoff', readout: '1.2k', rotation: 45 },
    { label: 'Res', readout: '45%', rotation: -30 },
    { label: 'Env Amt', readout: '+64', rotation: 100 },
  ]

  const faders = [
    { label: 'Attack', bottom: '80%' },
    { label: 'Decay', bottom: '40%' },
    { label: 'Sustain', bottom: '60%' },
    { label: 'Release', bottom: '20%' },
  ]

  return (
    <>
      <button
        type="button"
        className="studio-panel-border w-full shrink-0 rounded bg-surface-container-low p-3 text-left shadow-sm outline-none ring-inset [-webkit-tap-highlight-color:transparent] hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={openSynth}
      >
        <span className="mb-4 flex items-center gap-2 font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
          VCF Filter
        </span>
        <div className="flex h-24 items-end justify-around gap-3 md:gap-4">
          {knobs.map((k) => (
            <div key={k.label} className="flex flex-col items-center gap-2">
              <div className="relative h-12 w-12 shrink-0">
                <div className="absolute left-1 top-1 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white shadow-sm">
                  <div
                    className="absolute left-1/2 top-0 h-4 w-1 origin-bottom rounded-full bg-primary"
                    style={{ transform: `translateX(-50%) rotate(${k.rotation}deg) translateY(-2px)` }}
                    aria-hidden
                  />
                </div>
              </div>
              <span className="font-label-caps text-[9px] uppercase tracking-wide text-on-surface-variant">{k.label}</span>
              <div className="rounded border border-outline-variant bg-surface-container-highest px-2 py-0.5 font-mono text-[12px] font-semibold tracking-wide text-primary">
                {k.readout}
              </div>
            </div>
          ))}
        </div>
      </button>

      <button
        type="button"
        className="studio-panel-border flex min-h-[200px] w-full flex-1 flex-col rounded bg-surface-container-low p-3 text-left shadow-sm outline-none ring-inset [-webkit-tap-highlight-color:transparent] hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-primary/40 md:min-h-0"
        onClick={openSynth}
      >
        <span className="mb-4 flex items-center gap-2 font-label-caps text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          ADSR Envelope
        </span>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="studio-surface-recessed relative min-h-[100px] flex-1 overflow-hidden rounded-lg p-4 md:min-h-[120px]">
            <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
              <path
                d="M 0 100 L 10 20 L 35 45 L 80 45 L 100 100"
                fill="none"
                stroke="var(--ds-secondary)"
                strokeWidth="2"
              />
              <circle cx="10" cy="20" r="3" fill="var(--ds-primary)" />
              <circle cx="35" cy="45" r="3" fill="var(--ds-primary)" />
              <circle cx="80" cy="45" r="3" fill="var(--ds-primary)" />
            </svg>
          </div>
          <div className="grid grid-cols-4 gap-3 md:gap-4">
            {faders.map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1">
                <div className="studio-surface-recessed relative h-20 w-2 rounded-full">
                  <div
                    className="absolute left-[-8px] right-[-8px] h-3 rounded border border-white bg-secondary shadow-sm"
                    style={{ bottom: f.bottom }}
                  />
                </div>
                <span className="font-label-caps text-center text-[8px] uppercase tracking-wide text-on-surface-variant">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </button>
    </>
  )
}

/**
 * @param {{ met: object, synthRef: import('react').RefObject<{ initAudio?: () => unknown, toggleRecording?: () => unknown } | null>, recordingActive?: boolean }} props
 */
export function LightSynthMasterStrip({ met, synthRef, recordingActive }) {
  const bpm = Number(met?.bpm)
  const tempoMain = Number.isFinite(bpm) ? bpm.toFixed(1) : '—'

  const primeAudio = () => {
    try {
      void synthRef?.current?.initAudio?.()
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="studio-panel-border flex min-h-[5rem] shrink-0 flex-wrap items-center justify-between gap-4 rounded bg-surface-container-highest px-3 py-3 shadow-sm md:flex-nowrap md:px-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">Master Volume</span>
          <div className="studio-surface-recessed flex h-6 w-32 items-center overflow-hidden rounded px-1">
            <div className="h-4 w-3/4 rounded-sm bg-gradient-to-r from-primary to-secondary" aria-hidden />
          </div>
        </div>
        <div className="hidden h-10 w-px shrink-0 bg-outline-variant sm:block" aria-hidden />
        <div className="flex flex-col">
          <span className="font-label-caps text-[9px] uppercase tracking-[0.08em] text-on-surface-variant">Tempo</span>
          <div className="font-mono text-xl font-black tracking-tight text-primary">
            {tempoMain} <span className="text-[10px] font-normal text-on-surface-variant">BPM</span>
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className="studio-panel-border flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest shadow-sm transition-transform active:scale-95"
          aria-label="Stop metronome"
          onClick={() => {
            primeAudio()
            met?.stop?.()
          }}
        >
          <span className="material-symbols-outlined text-on-surface" aria-hidden>
            stop
          </span>
        </button>
        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary text-white shadow-md transition-transform active:scale-95"
          aria-label="Start metronome"
          onClick={() => {
            primeAudio()
            met?.start?.()
          }}
        >
          <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
            play_arrow
          </span>
        </button>
        <button
          type="button"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition-transform active:scale-95 ${recordingActive ? 'bg-error' : 'bg-error hover:bg-error/95'}`}
          aria-label={recordingActive ? 'Stop recording' : 'Record synth output'}
          aria-pressed={recordingActive}
          onClick={() => void synthRef?.current?.toggleRecording?.()}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
            fiber_manual_record
          </span>
        </button>
      </div>
    </div>
  )
}
