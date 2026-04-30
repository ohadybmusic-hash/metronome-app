import { DrumPadGrid } from './DrumPadGrid.jsx'
import { PianoKeyboard } from './PianoKeyboard.jsx'

export function SynthAppBottomSection({
  playLayout,
  pianoSynthesisOpen,
  settingsHandleDragRef,
  prime,
  setDrawerMaximized,
  setDrawerOpen,
  onDrumPad,
  isKeyActive,
  onPianoDown,
  onPianoUp,
}) {
  return (
    <div
      className={`flex shrink-0 flex-col ${
        playLayout === 'drum' || playLayout === 'both'
          ? 'h-[min(50vh,580px)] min-h-[220px] max-h-[min(64vh,680px)]'
          : 'h-[24vh] min-h-[120px] max-h-[220px]'
      }`}
    >
      {!pianoSynthesisOpen || playLayout === 'drum' ? (
        <div
          role="button"
          tabIndex={0}
          className="flex shrink-0 w-full touch-none select-none items-center justify-center border-t border-zinc-800/60 bg-zinc-950/80 py-1.5 text-zinc-500 active:bg-zinc-900/90"
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
          <span className="h-1 w-8 rounded-full bg-zinc-700" />
        </div>
      ) : (
        <div
          className="flex shrink-0 w-full items-center justify-center border-t border-zinc-800/50 bg-zinc-950/60 py-1.5 text-[10px] text-zinc-600"
          aria-hidden="true"
        >
          Synthesis is open in the main panel
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col ${playLayout === 'both' ? 'gap-0' : ''}`}>
        {playLayout === 'drum' || playLayout === 'both' ? (
          <div
            className={
              playLayout === 'both'
                ? 'flex min-h-0 min-h-[100px] max-h-[42%] flex-1 shrink-0 border-b border-zinc-800/50'
                : 'min-h-0 flex-1'
            }
          >
            <DrumPadGrid onPadDown={onDrumPad} />
          </div>
        ) : null}
        {playLayout === 'piano' || playLayout === 'both' ? (
          <div
            className={
              playLayout === 'both' ? 'flex min-h-0 min-h-[130px] flex-[1.4] flex-col' : 'min-h-0 flex-1'
            }
          >
            <PianoKeyboard
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
