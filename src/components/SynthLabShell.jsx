import {
  LightDrumFxRack,
  LightDrumStatusRack,
  LightSynthMasterStrip,
  LightSynthSideRack,
} from './SynthLabShellLightStudio.jsx'
import SynthLabShellObsidian from './SynthLabShellObsidian.jsx'

/**
 * Synth lab chrome around embedded {@link SynthApp}.
 * Obsidian: Stitch drum lab mock — textured background, oscilloscope LCD, sample + FX strip, pad grid fills below.
 * Synthwave: embedded drum mode keeps neon drum chrome (cyan LCD readout, dials, meter); piano / both use a minimal scanline shell — the in-app Synth rack carries the Stitch synth-wave UI.
 * Light: Stitch studio rack — drum lab (tempo scope + tactile pads + FX rack) when pads-only layout; otherwise piano rack + VCF / ADSR + transport strip.
 *
 * @param {{ met: object, synthRef: import('react').RefObject<{ initAudio?: () => unknown, getObsidianDrumSampleLine?: () => string, undoPatch?: () => boolean, toggleRecording?: () => boolean, openMixerDrawer?: () => void, openDrumEditor?: () => void, openPianoSynthesis?: () => void, setPlayLayout?: (l: 'piano' | 'drum' | 'both') => void } | null>, recordingActive?: boolean, visualLayout?: 'obsidian' | 'light' | 'synthwave', lightLabPlayLayout?: 'piano' | 'drum' | 'both', onOpenMetronomeSettings?: () => void, children: import('react').ReactNode }} props
 */
export default function SynthLabShell({
  met,
  synthRef,
  recordingActive = false,
  visualLayout = 'obsidian',
  lightLabPlayLayout = 'both',
  onOpenMetronomeSettings,
  children,
}) {
  const isObsidian = visualLayout === 'obsidian'
  const isSynthwave = visualLayout === 'synthwave'
  const isLight = visualLayout === 'light'

  if (isObsidian) {
    const obsidianPaperTextureUrl =
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBbnK4txcmByLhquOQOaP_HEcuTH1X7mDdZPXvIUOPpbH4fs62YyvZnoVilwvlsWs5LAMHGRmTcHNMA3MPIWZTQDvq19oSSu1_lRMTJ06JojYqMwyRhrrE36vQB-bD5fS4dYJkyOSjtlJ9tS4De2wS0LvHhTQPN5r23wSfo3YNPA_V5YmiPP-KLUrow_gdhsMwJk_Hd7beMsTe1x02XPb5mfq2yuKoJf56mdGb3rM9cjYD8urcIOMnmLavfL1Ss8rBMTq8FUG4RaNok'

    return (
      <SynthLabShellObsidian
        met={met}
        synthRef={synthRef}
        recordingActive={recordingActive}
        paperTextureUrl={obsidianPaperTextureUrl}
      >
        {children}
      </SynthLabShellObsidian>
    )
  }

  if (isSynthwave) {
    const synthwaveDrumChrome = lightLabPlayLayout === 'drum'

    if (!synthwaveDrumChrome) {
      return (
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background font-space-grotesk text-on-background antialiased">
          <div className="pointer-events-none absolute inset-0 z-[5] opacity-[0.88] sw-synth-scanlines-overlay" aria-hidden />
          <div className="relative z-[6] flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      )
    }

    const bpm = Number(met?.bpm)
    const tempoLine = Number.isFinite(bpm) ? `${bpm.toFixed(2)} BPM` : '— BPM'
    const vizHeights = ['20%', '60%', '40%', '90%', '30%', '50%', '80%', '10%']

    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background font-space-grotesk text-on-background antialiased">
        <div className="pointer-events-none absolute inset-0 z-[5] opacity-[0.88] sw-synth-scanlines-overlay" aria-hidden />

        <main className="relative z-[6] mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-4 overflow-hidden p-4 pb-6">
          <section className="relative flex flex-col gap-3 rounded-sm bg-surface-container-lowest p-3 sw-neon-border-cyan">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-chrome/50">Master Tempo</span>
                <span className="sw-lcd-glow-cyan truncate text-2xl font-black tracking-tighter text-secondary-container">{tempoLine}</span>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Current Mode</span>
                <span className="mt-0.5 block text-sm font-bold uppercase tracking-tighter text-primary">Drum Lab 04</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-chrome/15 pt-2">
              <div className="hidden gap-6 md:flex">
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-widest text-chrome/70 transition-colors hover:text-primary [-webkit-tap-highlight-color:transparent]"
                  title="Re-sync metronome audio after an interruption"
                  onClick={() => {
                    try {
                      met?.syncAudioAfterInterruption?.()
                    } catch {
                      /* */
                    }
                    void synthRef?.current?.initAudio?.()
                  }}
                >
                  Sync
                </button>
                <button
                  type="button"
                  className="text-[10px] font-bold uppercase tracking-widest text-chrome/70 transition-colors hover:text-primary [-webkit-tap-highlight-color:transparent]"
                  title="Metronome & sound settings"
                  onClick={() => {
                    void synthRef?.current?.initAudio?.()
                    onOpenMetronomeSettings?.()
                  }}
                >
                  Midi
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                <button
                  type="button"
                  className="rounded-sm bg-primary px-4 py-1 text-xs font-bold uppercase tracking-tighter text-[#0e0e1e] shadow-[0_0_10px_rgb(236_72_153_/_0.48)] transition-transform active:scale-95"
                  onClick={() => void synthRef?.current?.toggleRecording?.()}
                >
                  Live
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-chrome/35 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-chrome/75 transition-colors hover:border-secondary-container/50 hover:text-secondary-container"
                  onClick={() => synthRef?.current?.openMixerDrawer?.()}
                >
                  FX
                </button>
              </div>
            </div>
          </section>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

          <section className="grid grid-cols-4 gap-4 rounded-sm bg-surface-container p-4 pb-8 pt-4 sw-neon-border-pink">
            {(
              [
                { label: 'Decay', open: 'drum' },
                { label: 'Pitch', open: 'drum' },
                { label: 'Filter', open: 'fx' },
                { label: 'Verb', open: 'fx' },
              ]
            ).map(({ label, open }) => (
              <button
                key={label}
                type="button"
                className="flex flex-col items-center gap-2 pb-4 outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label={
                  open === 'drum' ? `${label} — drag up/down` : `Open effects — ${label}`
                }
                onClick={() => {
                  void synthRef?.current?.initAudio?.()
                  if (open !== 'drum') {
                    synthRef?.current?.openMixerDrawer?.({ duoTab: 'drums' })
                  }
                }}
                onPointerDown={(e) => {
                  if (open !== 'drum') return
                  if (e.button != null && e.button !== 0) return
                  e.preventDefault()
                  e.stopPropagation()
                  const startY = e.clientY
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const onMove = (ev) => {
                    if (ev.pointerId !== e.pointerId) return
                    if (!ev.buttons) return
                    const dy = startY - ev.clientY
                    const notch = Math.max(-24, Math.min(24, Math.round(dy / 18)))
                    if (!e.currentTarget.__lastNotch) e.currentTarget.__lastNotch = 0
                    const step = notch - e.currentTarget.__lastNotch
                    if (!step) return
                    e.currentTarget.__lastNotch = notch
                    if (label === 'Pitch') {
                      synthRef?.current?.adjustActiveDrumMacro?.({ pitchSemisDelta: step, decayDelta: 0 })
                    } else {
                      synthRef?.current?.adjustActiveDrumMacro?.({ pitchDelta: 0, decayNotchesDelta: step })
                    }
                  }
                  const onUp = (ev) => {
                    if (ev.pointerId !== e.pointerId) return
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    } catch {
                      /* */
                    }
                    window.removeEventListener('pointermove', onMove)
                    window.removeEventListener('pointerup', onUp)
                    window.removeEventListener('pointercancel', onUp)
                    try {
                      delete e.currentTarget.__lastNotch
                    } catch {
                      /* */
                    }
                  }
                  window.addEventListener('pointermove', onMove)
                  window.addEventListener('pointerup', onUp)
                  window.addEventListener('pointercancel', onUp)
                }}
              >
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    label === 'Filter' || label === 'Verb' ? 'border-secondary-container' : 'border-primary'
                  }`}
                >
                  <div
                    className={`absolute top-0 h-4 w-1 origin-bottom rounded-full ${
                      label === 'Decay'
                        ? '-rotate-45 bg-primary'
                        : label === 'Pitch'
                          ? 'rotate-12 bg-primary'
                          : label === 'Filter'
                            ? 'rotate-90 bg-secondary-container'
                            : '-rotate-12 bg-secondary-container'
                    }`}
                    aria-hidden
                  />
                  <span
                    className={`absolute -bottom-5 text-[8px] font-bold uppercase ${
                      label === 'Filter' || label === 'Verb' ? 'text-secondary-container' : 'text-primary'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              </button>
            ))}
          </section>

          <div className="relative flex h-12 shrink-0 items-end gap-1 overflow-hidden rounded-sm bg-surface-container-lowest px-2 pb-1 sw-neon-border-cyan">
            {vizHeights.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-[2px] ${i === 3 || i === 6 ? 'bg-primary shadow-[0_0_10px_#ec4899]' : 'bg-secondary-container'}`}
                style={{ height: h }}
              />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (isLight) {
    const lightLabDrumMode = lightLabPlayLayout === 'drum'

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-on-background antialiased">
        <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4 md:gap-2 md:p-6">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-12 md:gap-2">
            <div className="flex min-h-0 min-h-[220px] flex-col gap-2 md:col-span-7 md:min-h-0">
              {lightLabDrumMode ? <LightDrumStatusRack met={met} recordingActive={recordingActive} /> : null}
              <div className="studio-panel-border flex min-h-0 flex-1 flex-col rounded bg-surface-container-lowest p-3 shadow-sm">
                <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
                  {lightLabDrumMode ? (
                    <>
                      <h2 className="font-headline-md text-lg font-semibold leading-snug tracking-tight text-primary">
                        Synth Lab: Drum Mode
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full bg-primary px-2 py-0.5 font-label-caps text-[9px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-95 active:scale-[0.98] [-webkit-tap-highlight-color:transparent]"
                          onClick={() => {
                            void synthRef?.current?.initAudio?.()
                            synthRef?.current?.openDrumEditor?.()
                          }}
                        >
                          16-Step Grid
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-outline-variant px-2 py-0.5 font-label-caps text-[9px] font-bold uppercase tracking-wide text-on-surface-variant transition-colors hover:border-primary/50 [-webkit-tap-highlight-color:transparent]"
                          onClick={() => {
                            void synthRef?.current?.initAudio?.()
                            synthRef?.current?.openDrumEditor?.()
                          }}
                        >
                          Velocity: 127
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-label-caps text-[10px] leading-tight text-on-surface-variant sm:text-[11px]">
                        4×4 DRUM PAD GRID / LABORATORY MODE
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-sm border border-primary bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary-fixed-dim [-webkit-tap-highlight-color:transparent]"
                          onClick={() => {
                            void synthRef?.current?.initAudio?.()
                            synthRef?.current?.setPlayLayout?.('drum')
                          }}
                        >
                          PADS
                        </button>
                        <button
                          type="button"
                          className="rounded-sm border border-outline px-2 py-0.5 text-[10px] font-bold text-outline transition-colors hover:border-primary hover:text-primary [-webkit-tap-highlight-color:transparent]"
                          onClick={() => {
                            void synthRef?.current?.initAudio?.()
                            synthRef?.current?.setPlayLayout?.('both')
                          }}
                        >
                          SEQUENCE
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
              </div>
            </div>
            <div className="flex min-h-0 flex-col gap-2 md:col-span-5 md:min-h-0">
              {lightLabDrumMode ? <LightDrumFxRack synthRef={synthRef} /> : <LightSynthSideRack synthRef={synthRef} />}
            </div>
          </div>
          <LightSynthMasterStrip met={met} synthRef={synthRef} recordingActive={recordingActive} />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-on-background antialiased">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">{children}</main>
    </div>
  )
}
