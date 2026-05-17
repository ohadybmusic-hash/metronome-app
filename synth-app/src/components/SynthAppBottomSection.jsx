import { DrumPadGrid } from './DrumPadGrid.jsx'
import { PianoKeyboard } from './PianoKeyboard.jsx'

export function SynthAppBottomSection({
  stitchEmbeddedDrumChrome = false,
  stitchSynthwaveChrome = false,
  stitchObsidianChrome = false,
  stitchLightLabChrome = false,
  playLayout,
  pianoSynthesisOpen,
  settingsHandleDragRef,
  prime,
  setDrawerMaximized,
  setDrawerOpen,
  synthwaveSynthTab = 'osc',
  onSynthwaveSynthTabChange,
  onDrumPad,
  isKeyActive,
  onPianoDown,
  onPianoUp,
}) {
  const padVariant = stitchLightLabChrome
    ? 'lightLab'
    : stitchSynthwaveChrome
      ? 'synthwave'
      : stitchObsidianChrome
        ? 'obsidian'
        : undefined

  const showSettingsDragStrip =
    !stitchSynthwaveChrome &&
    !stitchLightLabChrome &&
    (!pianoSynthesisOpen || playLayout === 'drum')

  const showSynthwaveSynthStrip =
    stitchSynthwaveChrome &&
    (playLayout === 'piano' || playLayout === 'both') &&
    !pianoSynthesisOpen

  const synthTabBtn = (id, icon, label) => {
    const on = synthwaveSynthTab === id
    return (
      <button
        key={id}
        type="button"
        className={
          on
            ? 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-pink-500 bg-pink-500/10 py-2 text-pink-500 shadow-[inset_0_0_10px_rgb(236_72_153_/_0.2)]'
            : 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-cyan-600/55 transition-colors hover:bg-cyan-500/5 hover:text-cyan-400'
        }
        aria-pressed={on}
        onClick={() => {
          prime()
          onSynthwaveSynthTabChange?.(id)
          if (id === 'fx') {
            setDrawerMaximized(false)
            setDrawerOpen(true)
          }
        }}
      >
        <span className="material-symbols-outlined text-[22px]" aria-hidden>
          {icon}
        </span>
        <span className="font-space-grotesk text-[10px] font-bold tracking-widest">{label}</span>
      </button>
    )
  }

  return (
    <div
      className={`flex min-h-0 shrink-0 flex-col ${
        stitchEmbeddedDrumChrome && (playLayout === 'drum' || playLayout === 'both')
          ? 'flex-1'
          : playLayout === 'drum' || playLayout === 'both'
            ? 'h-[min(50vh,580px)] max-h-[min(64vh,680px)] min-h-[220px]'
            : 'h-[24vh] max-h-[220px] min-h-[120px]'
      }`}
    >
      {showSettingsDragStrip ? (
        <div
          role="button"
          tabIndex={0}
          className={`flex w-full shrink-0 touch-none select-none items-center justify-center border-t py-1.5 ${
            stitchEmbeddedDrumChrome
              ? 'border-hairline bg-surface-container-lowest/80 text-on-surface-variant'
              : 'border-zinc-800/60 bg-zinc-950/80 text-zinc-500 active:bg-zinc-900/90'
          }`}
          aria-label="Open settings: tap for sheet, drag up for full screen"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              prime()
              setDrawerMaximized(false)
              setDrawerOpen(true)
            }
          }}
          onPointerDown={(e) => {
            if (e.button != null && e.button !== 0) return
            e.preventDefault()
            settingsHandleDragRef.current = {
              pointerId: e.pointerId,
              startY: e.clientY,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerUp={(e) => {
            const d = settingsHandleDragRef.current
            if (!d || e.pointerId !== d.pointerId) return
            settingsHandleDragRef.current = null
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* */
            }
            const dragUp = d.startY - e.clientY
            prime()
            if (dragUp > 48) {
              setDrawerMaximized(true)
              setDrawerOpen(true)
            } else {
              setDrawerMaximized(false)
              setDrawerOpen(true)
            }
          }}
          onPointerCancel={() => {
            settingsHandleDragRef.current = null
          }}
          onLostPointerCapture={() => {
            settingsHandleDragRef.current = null
          }}
        >
          <span className={`h-1 w-8 rounded-full ${stitchEmbeddedDrumChrome ? 'bg-outline-variant' : 'bg-zinc-700'}`} />
        </div>
      ) : !stitchSynthwaveChrome && !stitchLightLabChrome ? (
        <div
          className="flex w-full shrink-0 items-center justify-center border-t border-zinc-800/50 bg-zinc-950/60 py-1.5 text-[10px] text-zinc-600"
          aria-hidden="true"
        >
          Synthesis is open in the main panel
        </div>
      ) : null}
      {showSynthwaveSynthStrip ? (
        <nav
          className="flex w-full shrink-0 items-stretch justify-around border-t border-cyan-500/30 bg-[rgb(14_14_30/0.96)] px-1 shadow-[0_-4px_20px_rgb(255_0_255_/_0.12)] backdrop-blur-md"
          aria-label="Synth lab sections"
        >
          {synthTabBtn('osc', 'waves', 'OSC')}
          {synthTabBtn('vcf', 'filter_list', 'VCF')}
          {synthTabBtn('env', 'show_chart', 'ENV')}
          {synthTabBtn('fx', 'blur_on', 'FX')}
        </nav>
      ) : null}
      <div className={`flex min-h-0 flex-1 flex-col ${playLayout === 'both' ? 'gap-0' : ''}`}>
        {playLayout === 'drum' || playLayout === 'both' ? (
          <div
            className={
              playLayout === 'both'
                ? `flex min-h-0 min-h-[100px] max-h-[42%] shrink-0 flex-1 border-b ${
                    stitchLightLabChrome ? 'border-hairline' : 'border-zinc-800/50'
                  }`
                : 'min-h-0 flex-1'
            }
          >
            <DrumPadGrid onPadDown={onDrumPad} variant={padVariant} />
          </div>
        ) : null}
        {playLayout === 'piano' || playLayout === 'both' ? (
          <div className={playLayout === 'both' ? 'flex min-h-0 min-h-[130px] flex-[1.4] flex-col' : 'min-h-0 flex-1'}>
            <PianoKeyboard
              variant={
                stitchLightLabChrome ? 'lightLab' : stitchSynthwaveChrome ? 'synthwave' : 'default'
              }
              isKeyActive={isKeyActive}
              onNoteOn={onPianoDown}
              onNoteUp={onPianoUp}
              onUserGesture={prime}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
