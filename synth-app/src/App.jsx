import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { SettingsDrawer } from './components/SettingsDrawer.jsx'
import { SynthAppBottomSection } from './components/SynthAppBottomSection.jsx'
import { SynthAppMainPanel } from './components/SynthAppMainPanel.jsx'
import { SynthAppTopBar } from './components/SynthAppTopBar.jsx'
import { DEFAULT_FX_DRUM, DEFAULT_FX_SYNTH, useSynth } from './hooks/useSynth.js'

const App = forwardRef(function App(
  { embedded = false, hideTopBar = false, onSnapshotForMetronome, onRecordingChange } = {},
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
    undoPresetSnapshot,
    isRecording,
    toggleRecording,
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

  useEffect(() => {
    onRecordingChange?.(isRecording)
  }, [isRecording, onRecordingChange])

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

  useImperativeHandle(
    ref,
    () => ({
      initAudio,
      getPresetSnapshot,
      applyPresetSnapshot,
      openMixerDrawer: () => setDrawerOpen(true),
      undoPatch: () => undoPresetSnapshot(),
      toggleRecording: () => void toggleRecording(),
    }),
    [initAudio, getPresetSnapshot, applyPresetSnapshot, undoPresetSnapshot, toggleRecording],
  )

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

  useEffect(() => {
    if (!embedded || !hideTopBar) return
    setPlayLayoutPersist('drum')
  }, [embedded, hideTopBar, setPlayLayoutPersist])

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
      {!(embedded && hideTopBar) ? (
        <SynthAppTopBar
          playLayout={playLayout}
          ready={ready}
          activeDrumIndex={activeDrumIndex}
          activePartIndex={activePartIndex}
          analyser={analyser}
          prime={prime}
          setPlayLayoutPersist={setPlayLayoutPersist}
          setDrumEditorOpen={setDrumEditorOpen}
          setPianoSynthesisOpen={setPianoSynthesisOpen}
          drumEditorOpen={drumEditorOpen}
          pianoSynthesisOpen={pianoSynthesisOpen}
        />
      ) : null}

      <SynthAppMainPanel
        playLayout={playLayout}
        drumEditorOpen={drumEditorOpen}
        pianoSynthesisOpen={pianoSynthesisOpen}
        drumKit={drumKit}
        setDrumKit={setDrumKit}
        activeDrumIndex={activeDrumIndex}
        setActiveDrumIndex={setActiveDrumIndex}
        prime={prime}
        applyDrumStyle={applyDrumStyle}
        setDrumSample={setDrumSample}
        clearDrumSample={clearDrumSample}
        drumSampleBuffers={drumSampleBuffers}
        fx={fx}
        setFx={setFx}
        drumKitIlluIndex={drumKitIlluIndex}
        drumKitIlluToken={drumKitIlluToken}
        filterNorm={filterNorm}
        setFilterFromNorm={setFilterFromNorm}
        getPresetSnapshot={getPresetSnapshot}
        applyPresetSnapshot={applyPresetSnapshot}
        applyFactorySynthPreset={applyFactorySynthPreset}
        activeFactoryPresetId={activeFactoryPresetId}
        partCount={partCount}
        activePartIndex={activePartIndex}
        setActivePartIndex={setActivePartIndex}
        resetAllParts={resetAllParts}
        osc1={osc1}
        setOsc1={setOsc1}
        osc2={osc2}
        setOsc2={setOsc2}
        osc3={osc3}
        setOsc3={setOsc3}
      />

      <SynthAppBottomSection
        playLayout={playLayout}
        pianoSynthesisOpen={pianoSynthesisOpen}
        settingsHandleDragRef={settingsHandleDragRef}
        prime={prime}
        setDrawerMaximized={setDrawerMaximized}
        setDrawerOpen={setDrawerOpen}
        onDrumPad={onDrumPad}
        isKeyActive={isKeyActive}
        onPianoDown={onPianoDown}
        onPianoUp={onPianoUp}
      />

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
