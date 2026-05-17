import { WaveformCanvas } from './WaveformCanvas.jsx'

export function SynthAppTopBar({
  playLayout,
  ready,
  activeDrumIndex,
  activePartIndex,
  analyser,
  prime,
  setPlayLayoutPersist,
  setDrumEditorOpen,
  setPianoSynthesisOpen,
  drumEditorOpen,
  pianoSynthesisOpen,
  stitchObsidianChrome,
  stitchSynthwaveChrome,
  stitchLightLabChrome,
}) {
  const stitchChrome = Boolean(stitchObsidianChrome || stitchSynthwaveChrome || stitchLightLabChrome)
  const sw = Boolean(stitchSynthwaveChrome)
  const lm = Boolean(stitchLightLabChrome) && !sw

  const btnBase = stitchChrome
    ? lm
      ? 'w-full rounded-sm border px-1 py-1 text-[8px] font-bold uppercase tracking-[0.14em] transition-colors [-webkit-tap-highlight-color:transparent]'
      : 'w-full rounded border px-1 py-1 text-[8px] font-bold uppercase tracking-[0.12em] transition-colors [-webkit-tap-highlight-color:transparent]'
    : 'w-full rounded border py-0.5 text-[6.5px] font-bold uppercase leading-tight'

  const modeInactive = stitchChrome
    ? sw
      ? 'border-cyan-400/30 bg-surface-container-low text-cyan-400/60 hover:border-cyan-400/60 hover:text-cyan-400'
      : lm
        ? 'border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
        : 'border-hairline bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
    : 'border-zinc-800 bg-zinc-900/90 text-zinc-500'

  const modeActive = stitchChrome
    ? sw
      ? 'border-pink-500/60 bg-pink-500/10 text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.35)]'
      : lm
        ? 'border-primary/40 bg-primary-fixed text-primary shadow-sm'
        : 'border-chrome/50 bg-chrome/10 text-chrome'
    : 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'

  const adInactive = stitchChrome
    ? sw
      ? 'border-outline-variant/35 bg-surface-container-low text-on-surface-variant hover:border-pink-500/40 hover:text-pink-500'
      : lm
        ? 'border-outline-variant bg-surface-container-highest text-on-surface-variant hover:border-primary/40'
        : modeInactive
    : 'border-zinc-800 bg-zinc-900/90 text-zinc-400'

  const adActive = stitchChrome
    ? sw
      ? 'border-pink-500/60 bg-pink-500/15 text-pink-500 shadow-[0_0_14px_rgba(236,72,153,0.45)]'
      : lm
        ? 'border-secondary/40 bg-secondary text-white shadow-md'
        : modeActive
    : 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'

  return (
    <div
      className={`shrink-0 border-b px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0 ${
        playLayout === 'drum'
          ? 'h-[14vh] min-h-[88px] max-h-[150px]'
          : 'h-[20vh] min-h-[120px] max-h-[200px]'
      } ${stitchChrome ? (sw ? 'border-cyan-400/20 bg-surface-container-lowest/95' : lm ? 'border-outline-variant bg-surface-container-lowest' : 'border-hairline bg-surface-container-lowest') : 'border-zinc-800/50'}`}
    >
      <div className="flex h-full min-h-0 items-stretch">
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div className="min-h-0 flex-1">
            <WaveformCanvas analyserRef={analyser} />
          </div>
        </div>
        <div className="ml-1 flex h-full min-h-0 shrink-0 flex-row items-center justify-end gap-1.5 py-0.5 pl-0.5">
          <div
            className={`flex flex-row items-center gap-1.5 text-[7px] uppercase leading-tight tracking-widest ${
              stitchChrome ? (sw ? 'text-cyan-400/60' : 'text-on-surface-variant') : 'text-zinc-500'
            }`}
          >
            <span>{ready ? 'On' : '…'}</span>
            <span className={stitchChrome ? (sw ? 'text-primary/80' : 'text-on-surface-variant') : 'text-zinc-600'}>
              {playLayout === 'drum'
                ? `D${activeDrumIndex + 1}`
                : playLayout === 'both'
                  ? `Duo · P${activePartIndex + 1}`
                  : `P${activePartIndex + 1}`}
            </span>
          </div>
          <div className="flex w-[3.2rem] min-w-[3.2rem] max-w-[3.2rem] flex-col items-stretch justify-center gap-0.5 self-stretch">
            <button
              type="button"
              onClick={() => {
                prime()
                setPlayLayoutPersist('piano')
              }}
              aria-pressed={playLayout === 'piano'}
              className={`${btnBase} ${playLayout === 'piano' ? modeActive : modeInactive}`}
            >
              Pno
            </button>
            <button
              type="button"
              onClick={() => {
                prime()
                setPlayLayoutPersist('both')
              }}
              aria-pressed={playLayout === 'both'}
              className={`${btnBase} ${playLayout === 'both' ? modeActive : modeInactive}`}
              title="Piano and drums"
            >
              +Both
            </button>
            <button
              type="button"
              onClick={() => {
                prime()
                setPlayLayoutPersist('drum')
              }}
              aria-pressed={playLayout === 'drum'}
              className={`${btnBase} ${playLayout === 'drum' ? modeActive : modeInactive}`}
            >
              Drm
            </button>
            <button
              type="button"
              onClick={() => {
                prime()
                if (playLayout === 'drum') {
                  setDrumEditorOpen((o) => !o)
                } else {
                  setPianoSynthesisOpen((o) => !o)
                }
              }}
              className={`mt-0.5 w-full min-h-[1.8rem] flex-1 rounded-md border px-0.5 py-0.5 text-[10px] font-bold leading-none shadow-sm active:scale-95 [-webkit-tap-highlight-color:transparent] ${
                (playLayout === 'drum' && drumEditorOpen) || (playLayout !== 'drum' && pianoSynthesisOpen)
                  ? adActive
                  : adInactive
              }`}
              aria-pressed={playLayout === 'drum' ? drumEditorOpen : pianoSynthesisOpen}
              aria-label={
                playLayout === 'drum'
                  ? drumEditorOpen
                    ? 'Close drum and effects editor'
                    : 'Open drum and effects editor'
                  : pianoSynthesisOpen
                    ? 'Close synthesis and show filter only'
                    : 'Open synthesis in place of the filter (presets, parts, effects, oscillators)'
              }
            >
              A–D
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
