/**
 * When the main synth top bar is hidden (embedded in Tempo Trainer shell), exposes
 * Piano / Both / Drum and A–D editor controls — matches Stitch multi-mode synth lab flows.
 */
export function SynthAppEmbeddedLayoutRail({
  playLayout,
  ready,
  activeDrumIndex,
  activePartIndex,
  prime,
  setPlayLayoutPersist,
  setDrumEditorOpen,
  setPianoSynthesisOpen,
  drumEditorOpen,
  pianoSynthesisOpen,
  stitchSynthwaveChrome,
  stitchLightLabChrome,
}) {
  const sw = Boolean(stitchSynthwaveChrome)
  const lm = Boolean(stitchLightLabChrome) && !sw

  const btnBase = lm
    ? 'min-h-[36px] flex-1 rounded-sm px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors [-webkit-tap-highlight-color:transparent]'
    : 'min-h-[36px] flex-1 rounded-ds px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors [-webkit-tap-highlight-color:transparent]'

  // Mode tabs: in Stitch synthwave, active reads as pink primary; inactive as cyan chrome.
  const inactive = sw
    ? 'border border-cyan-400/30 bg-surface-container-low text-cyan-400/60 hover:border-cyan-400/60 hover:text-cyan-400'
    : lm
      ? 'border border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
      : 'border border-hairline bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-chrome'

  const active = sw
    ? 'border border-pink-500/60 bg-pink-500/10 text-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.35)]'
    : lm
      ? 'border border-primary/40 bg-primary-fixed text-primary shadow-sm'
      : 'border border-chrome/50 bg-chrome/10 text-chrome shadow-[0_0_10px_rgb(var(--ds-chrome-rgb)_/_0.25)]'

  const adInactive = sw
    ? 'border border-outline-variant/35 bg-surface-container-low text-on-surface-variant hover:border-pink-500/40 hover:text-pink-500'
    : lm
      ? 'border border-outline-variant bg-surface-container-highest text-on-surface-variant hover:border-primary/40'
      : inactive

  const adActive = sw
    ? 'border border-pink-500/60 bg-pink-500/15 text-pink-500 shadow-[0_0_16px_rgba(236,72,153,0.45)]'
    : lm
      ? 'border border-secondary/40 bg-secondary text-white shadow-md'
      : active

  return (
    <div
      className={`flex min-h-0 shrink-0 flex-col gap-2 border-b px-2 py-2 ${
        sw
          ? 'border-cyan-400/20 bg-surface-container-lowest/95'
          : lm
            ? 'border-outline-variant bg-surface-container-lowest'
            : 'border-hairline bg-surface-container-lowest'
      }`}
      role="toolbar"
      aria-label="Synth lab mode"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className={`font-label-caps text-[9px] ${sw ? 'text-cyan-400/70' : 'text-chrome/80'}`}>
          {ready ? 'Audio ready' : 'Tap pads to prime'}
        </span>
        <span className={`font-mono text-[9px] ${sw ? 'text-primary/80' : 'text-on-surface-variant'}`}>
          {playLayout === 'drum'
            ? `D${activeDrumIndex + 1}`
            : playLayout === 'both'
              ? `Duo · P${activePartIndex + 1}`
              : `P${activePartIndex + 1}`}
        </span>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          className={`${btnBase} ${playLayout === 'piano' ? active : inactive}`}
          aria-pressed={playLayout === 'piano'}
          onClick={() => {
            prime()
            setPlayLayoutPersist('piano')
          }}
        >
          Pno
        </button>
        <button
          type="button"
          className={`${btnBase} ${playLayout === 'both' ? active : inactive}`}
          aria-pressed={playLayout === 'both'}
          title="Piano and drums"
          onClick={() => {
            prime()
            setPlayLayoutPersist('both')
          }}
        >
          +Both
        </button>
        <button
          type="button"
          className={`${btnBase} ${playLayout === 'drum' ? active : inactive}`}
          aria-pressed={playLayout === 'drum'}
          onClick={() => {
            prime()
            setPlayLayoutPersist('drum')
          }}
        >
          Drm
        </button>
        <button
          type="button"
          className={`${btnBase} min-w-[3rem] flex-none ${
            (playLayout === 'drum' && drumEditorOpen) || (playLayout !== 'drum' && pianoSynthesisOpen)
              ? adActive
              : adInactive
          }`}
          aria-pressed={playLayout === 'drum' ? drumEditorOpen : pianoSynthesisOpen}
          onClick={() => {
            prime()
            if (playLayout === 'drum') {
              setDrumEditorOpen((o) => !o)
            } else {
              setPianoSynthesisOpen((o) => !o)
            }
          }}
        >
          A–D
        </button>
      </div>
    </div>
  )
}
