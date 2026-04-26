import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { DrumEngineBlock } from './components/DrumEngineBlock.jsx'
import { DrumKitIllustration } from './components/DrumKitIllustration.jsx'
import { DrumPadGrid } from './components/DrumPadGrid.jsx'
import { EffectsBlock } from './components/EffectsBlock.jsx'
import { FilterDial } from './components/FilterDial.jsx'
import { PianoKeyboard } from './components/PianoKeyboard.jsx'
import { PianoSynthesisForm } from './components/PianoSynthesisForm.jsx'
import { SettingsDrawer } from './components/SettingsDrawer.jsx'
import { WaveformCanvas } from './components/WaveformCanvas.jsx'
import { DEFAULT_FX_DRUM, DEFAULT_FX_SYNTH, useSynth } from './hooks/useSynth.js'

const App = forwardRef(function App(
  { embedded = false, onSnapshotForMetronome } = {},
  ref,
) {
  const {
    initAudio,
    ready,
    analyser,
    filterNorm,
    setFilterFromNorm,
    fx,
    setFx,
    activePartIndex,
    setActivePartIndex,
    partCount,
    resetAllParts,
    osc1,
    setOsc1,
    osc2,
    setOsc2,
    osc3,
    setOsc3,
    noteOn,
    noteOff,
    getPresetSnapshot,
    applyPresetSnapshot,
    applyFactorySynthPreset,
    activeFactoryPresetId,
    triggerDrum,
    drumKit,
    setDrumKit,
    activeDrumIndex,
    setActiveDrumIndex,
    resetDrumKit,
    applyDrumStyle,
    setDrumSample,
    clearDrumSample,
    drumSampleBuffers,
  } = useSynth()

  useImperativeHandle(
    ref,
    () => ({
      initAudio,
      getPresetSnapshot,
      applyPresetSnapshot,
    }),
    [initAudio, getPresetSnapshot, applyPresetSnapshot],
  )

  const onSnapshotForMetronomeRef = useRef(onSnapshotForMetronome)
  onSnapshotForMetronomeRef.current = onSnapshotForMetronome

  useLayoutEffect(() => {
    return () => {
      const cb = onSnapshotForMetronomeRef.current
      if (typeof cb === 'function') {
        try {
          cb(getPresetSnapshot())
        } catch {
          /* */
        }
      }
    }
  }, [getPresetSnapshot])

  const [drawerOpen, setDrawerOpen] = useState(false)
  /** When true, settings bottom sheet is full-viewport (opened by dragging the handle up). */
  const [drawerMaximized, setDrawerMaximized] = useState(false)
  const settingsHandleDragRef = useRef(
    /** @type {{ pointerId: number, startY: number } | null} */ (null),
  )
  /** `piano` = keys only, `drum` = pads only, `both` = pads + keys. */
  const [playLayout, setPlayLayout] = useState(() => {
    try {
      const s = typeof localStorage !== 'undefined' ? localStorage.getItem('synth-app-play-layout') : null
      if (s === 'piano' || s === 'drum' || s === 'both') return s
    } catch {
      /* */
    }
    return /** @type {'piano' | 'drum' | 'both'} */ ('piano')
  })
  /** In drum-only mode: A–D toggles full drum + effects editor in the center. */
  const [drumEditorOpen, setDrumEditorOpen] = useState(false)
  /** In piano (or both): A–D toggles synthesis in the main column (replaces the filter), like drum A–D. */
  const [pianoSynthesisOpen, setPianoSynthesisOpen] = useState(false)
  /** Illumination on kit image when a pad is struck (not the same as active editor voice). */
  const [drumKitIlluIndex, setDrumKitIlluIndex] = useState(-1)
  const [drumKitIlluToken, setDrumKitIlluToken] = useState(0)
  const [touchNotes, setTouchNotes] = useState(
    () => new Map() /** @type {Map<number, number>} pointerId -> midi */,
  )

  const prime = useCallback(() => {
    void initAudio()
  }, [initAudio])

  const setPlayLayoutPersist = useCallback((next) => {
    setPlayLayout(next)
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('synth-app-play-layout', next)
      }
    } catch {
      /* */
    }
  }, [])

  const skipFxDefaultOnMount = useRef(true)
  useEffect(() => {
    if (playLayout !== 'drum') setDrumEditorOpen(false)
  }, [playLayout])

  useEffect(() => {
    if (skipFxDefaultOnMount.current) {
      skipFxDefaultOnMount.current = false
      return
    }
    if (playLayout === 'both') return
    setFx(playLayout === 'drum' ? { ...DEFAULT_FX_DRUM } : { ...DEFAULT_FX_SYNTH })
  }, [playLayout, setFx])

  useEffect(() => {
    if (playLayout === 'drum') {
      setPianoSynthesisOpen(false)
    }
  }, [playLayout])

  useEffect(() => {
    if (pianoSynthesisOpen) {
      setDrawerOpen(false)
    }
  }, [pianoSynthesisOpen])

  useEffect(() => {
    if (!pianoSynthesisOpen) return
    const h = (e) => {
      if (e.key === 'Escape') setPianoSynthesisOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pianoSynthesisOpen])

  const onPianoDown = useCallback(
    (midi, pointerId) => {
      noteOn(midi, String(pointerId))
      setTouchNotes((prev) => {
        const next = new Map(prev)
        next.set(pointerId, midi)
        return next
      })
    },
    [noteOn],
  )

  const onPianoUp = useCallback(
    (_midi, pointerId) => {
      noteOff(String(pointerId))
      setTouchNotes((prev) => {
        if (!prev.has(pointerId)) return prev
        const next = new Map(prev)
        next.delete(pointerId)
        return next
      })
    },
    [noteOff],
  )

  const isKeyActive = useCallback(
    (m) => {
      for (const v of touchNotes.values()) {
        if (v === m) return true
      }
      return false
    },
    [touchNotes],
  )

  const onDrumPad = useCallback(
    (i) => {
      setActiveDrumIndex(i)
      setDrumKitIlluIndex(i)
      setDrumKitIlluToken((t) => t + 1)
      prime()
      triggerDrum(i)
    },
    [triggerDrum, prime],
  )

  return (
    <div
      className={`flex w-full min-w-0 flex-col overflow-hidden bg-gradient-to-b from-[#0a0a0c] to-[#050506] text-zinc-200 ${
        embedded ? 'h-full min-h-0' : 'h-dvh max-h-dvh'
      }`}
    >
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

      <div className="relative z-0 min-h-0 flex-1 overflow-hidden">
        {playLayout === 'drum' ? (
          drumEditorOpen ? (
            <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 pb-2 pt-1 sm:px-3 sm:pt-1.5">
              <DrumEngineBlock
                drumKit={drumKit}
                setDrumKit={setDrumKit}
                activeDrumIndex={activeDrumIndex}
                onActiveDrumIndexChange={setActiveDrumIndex}
                onUserGesture={prime}
                applyDrumStyle={applyDrumStyle}
                setDrumSample={setDrumSample}
                clearDrumSample={clearDrumSample}
                drumSampleBuffers={drumSampleBuffers}
              />
              <div className="mb-0 mt-0">
                <EffectsBlock
                  fx={fx}
                  setFx={setFx}
                  onUserGesture={prime}
                  drumMode
                  drumKit={drumKit}
                  setDrumKit={setDrumKit}
                />
              </div>
            </div>
          ) : (
            <DrumKitIllustration
              lastHitIndex={drumKitIlluIndex}
              lastHitToken={drumKitIlluToken}
            />
          )
        ) : playLayout === 'piano' || playLayout === 'both' ? (
          pianoSynthesisOpen ? (
            <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 pb-2 pt-1 sm:px-3 sm:pt-1.5">
            <h2 className="mb-0.5 text-sm font-semibold text-zinc-200">Synthesis</h2>
            <p className="mb-3 text-xs text-zinc-500">
              Same controls as the bottom sheet, here in the main panel instead of
              the filter. Tap A–D again to return to the filter.
            </p>
            <PianoSynthesisForm
              presetListReloadOpen={pianoSynthesisOpen}
              getPresetSnapshot={getPresetSnapshot}
              applyPresetSnapshot={applyPresetSnapshot}
              applyFactorySynthPreset={applyFactorySynthPreset}
              activeFactoryPresetId={activeFactoryPresetId}
              onUserGesture={prime}
              drumKit={drumKit}
              setDrumKit={setDrumKit}
              partCount={partCount}
              activePartIndex={activePartIndex}
              onActivePartChange={setActivePartIndex}
              fx={fx}
              setFx={setFx}
              resetAllParts={resetAllParts}
              osc1={osc1}
              setOsc1={setOsc1}
              osc2={osc2}
              setOsc2={setOsc2}
              osc3={osc3}
              setOsc3={setOsc3}
              compactBottom
            />
            </div>
          ) : (
            <FilterDial
              value={filterNorm}
              onChange={(n) => {
                prime()
                setFilterFromNorm(n)
              }}
              onUserGesture={prime}
            />
          )
        ) : null}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#050506] to-transparent" />
      </div>

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
        <div
          className={`flex min-h-0 flex-1 flex-col ${
            playLayout === 'both' ? 'gap-0' : ''
          }`}
        >
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

      <SettingsDrawer
        open={drawerOpen}
        maximized={drawerMaximized}
        onClose={() => {
          setDrawerOpen(false)
          setDrawerMaximized(false)
        }}
        playLayout={playLayout}
        drumMode={playLayout === 'drum'}
        fx={fx}
        setFx={setFx}
        partCount={partCount}
        activePartIndex={activePartIndex}
        onActivePartChange={setActivePartIndex}
        resetAllParts={resetAllParts}
        drumKit={drumKit}
        setDrumKit={setDrumKit}
        activeDrumIndex={activeDrumIndex}
        onActiveDrumIndexChange={setActiveDrumIndex}
        resetDrumKit={resetDrumKit}
        applyDrumStyle={applyDrumStyle}
        setDrumSample={setDrumSample}
        clearDrumSample={clearDrumSample}
        drumSampleBuffers={drumSampleBuffers}
        getPresetSnapshot={getPresetSnapshot}
        applyPresetSnapshot={applyPresetSnapshot}
        applyFactorySynthPreset={applyFactorySynthPreset}
        activeFactoryPresetId={activeFactoryPresetId}
        osc1={osc1}
        setOsc1={setOsc1}
        osc2={osc2}
        setOsc2={setOsc2}
        osc3={osc3}
        setOsc3={setOsc3}
        onUserGesture={prime}
      />
    </div>
  )
})

export default App
