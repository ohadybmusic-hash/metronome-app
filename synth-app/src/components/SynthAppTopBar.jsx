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
}) {
  return (
    <div
      className={`shrink-0 border-b border-zinc-800/50 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-0 ${
        playLayout === 'drum'
          ? 'h-[14vh] min-h-[88px] max-h-[150px]'
          : 'h-[20vh] min-h-[120px] max-h-[200px]'
      }`}
    >
      <div className="flex h-full min-h-0 items-stretch">
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div className="min-h-0 flex-1">
            <WaveformCanvas analyserRef={analyser} />
          </div>
        </div>
        <div className="ml-1 flex h-full min-h-0 shrink-0 flex-row items-center justify-end gap-1.5 py-0.5 pl-0.5">
          <div className="flex flex-row items-center gap-1.5 text-[7px] uppercase leading-tight tracking-widest text-zinc-500">
            <span>{ready ? 'On' : '…'}</span>
            <span className="text-zinc-600">
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
              className={`w-full rounded border py-0.5 text-[6.5px] font-bold uppercase leading-tight ${
                playLayout === 'piano'
                  ? 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-500'
              }`}
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
              className={`w-full rounded border py-0.5 text-[6.5px] font-bold uppercase leading-tight ${
                playLayout === 'both'
                  ? 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-500'
              }`}
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
              className={`w-full rounded border py-0.5 text-[6.5px] font-bold uppercase leading-tight ${
                playLayout === 'drum'
                  ? 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-500'
              }`}
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
              className={`mt-0.5 w-full min-h-[1.6rem] flex-1 rounded-md border px-0.5 py-0.5 text-xs font-bold leading-none shadow-sm active:scale-95 ${
                (playLayout === 'drum' && drumEditorOpen) ||
                (playLayout !== 'drum' && pianoSynthesisOpen)
                  ? 'border-[#39ff14]/50 bg-[#39ff14]/15 text-[#39ff14]'
                  : 'border-zinc-800 bg-zinc-900/90 text-zinc-400'
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
