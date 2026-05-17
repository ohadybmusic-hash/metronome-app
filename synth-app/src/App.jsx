import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { SettingsDrawer } from './components/SettingsDrawer.jsx'
import { SynthAppBottomSection } from './components/SynthAppBottomSection.jsx'
import { SynthAppMainPanel } from './components/SynthAppMainPanel.jsx'
import { SynthAppEmbeddedLayoutRail } from './components/SynthAppEmbeddedLayoutRail.jsx'
import { SynthAppTopBar } from './components/SynthAppTopBar.jsx'
import { DRUM_AUX_EDITOR_INDEX } from './lib/drumArticulations.js'
import { DRUM_VOICES } from './lib/drumVoices.js'
import { DEFAULT_DRUM_KIT } from './lib/drumKitDefaults.js'
import { DEFAULT_FX_DRUM, DEFAULT_FX_SYNTH, useSynth } from './hooks/useSynth.js'

const App = forwardRef(function App(
  {
    embedded = false,
    hideTopBar = false,
    stitchObsidianChrome = false,
    stitchSynthwaveChrome = false,
    stitchLightLabChrome = false,
    onSnapshotForMetronome,
    onRecordingChange,
    onEmbeddedPlayLayoutChange,
  } = {},
  ref,
) {
  const stitchEmbeddedDrumChrome = stitchObsidianChrome || stitchSynthwaveChrome || stitchLightLabChrome
  const {
    initAudio,
    ready,
    analyser,
    filterNorm,
    setFilterFromNorm,
    filterQNorm,
    setFilterQFromNorm,
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
    drumFxSend,
    setDrumFxSend,
    resetDrumKit,
    applyDrumStyle,
    setDrumSample,
    clearDrumSample,
    drumSampleBuffers,
  } = useSynth()

  const [mainPanelFocus, setMainPanelFocus] = useState(/** @type {null | 'drumFx'} */ (null))

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
  const [drawerInitialDuoTab, setDrawerInitialDuoTab] = useState(
    /** @type {null | 'synth' | 'drums'} */ (null),
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
  /** Stitch synthwave bottom strip: OSC · VCF · ENV · FX (scroll rack or open drawer). */
  const [synthwaveSynthTab, setSynthwaveSynthTab] = useState(
    /** @type {'osc' | 'vcf' | 'env' | 'fx'} */ ('osc'),
  )

  useEffect(() => {
    if (!stitchSynthwaveChrome) return
    if (playLayout === 'drum') return
    setSynthwaveSynthTab('osc')
  }, [playLayout, stitchSynthwaveChrome])

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

  const setPlayLayoutFromHost = useCallback(
    (layout) => {
      if (layout === 'piano' || layout === 'drum' || layout === 'both') {
        setPlayLayoutPersist(layout)
      }
    },
    [setPlayLayoutPersist],
  )

  const adjustActiveDrumMacro = useCallback(
    (patch) => {
      const pitchDelta = Number(patch?.pitchDelta ?? 0)
      const decayDelta = Number(patch?.decayDelta ?? 0)
      const pitchSemisDelta = Number(patch?.pitchSemisDelta ?? 0)
      const decayNotchesDelta = Number(patch?.decayNotchesDelta ?? 0)
      const sendFxDelta = Number(patch?.sendFxDelta ?? 0)
      const hasAny =
        Number.isFinite(pitchDelta) ||
        Number.isFinite(decayDelta) ||
        Number.isFinite(pitchSemisDelta) ||
        Number.isFinite(decayNotchesDelta) ||
        Number.isFinite(sendFxDelta)
      if (!hasAny) return

      const v = DRUM_VOICES[activeDrumIndex] ?? DRUM_VOICES[0]
      const key = v.key
      setDrumKit((prev) => {
        const cur = prev?.[key]
        if (!cur) return prev

        const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
        const next = { ...cur }

        // Sample voices: treat Pitch as semitone steps, Decay as envelope time.
        if (cur.source === 'sample') {
          if (Number.isFinite(pitchSemisDelta) && pitchSemisDelta !== 0) {
            const n = clamp(Math.round(pitchSemisDelta), -48, 48)
            const ratio = 2 ** (n / 12)
            next.sampleRate = clamp((Number(cur.sampleRate) || 1) * ratio, 0.25, 4)
          }
          if (Number.isFinite(decayNotchesDelta) && decayNotchesDelta !== 0) {
            const n = clamp(Math.round(decayNotchesDelta), -48, 48)
            // Exponential scaling feels natural across short/long decays.
            const ratio = 2 ** (n / 12)
            next.sampleDecayS = clamp((Number(cur.sampleDecayS) || 0.35) * ratio, 0.03, 3)
          }
          if (Number.isFinite(sendFxDelta) && sendFxDelta) {
            const curAmt =
              typeof cur.sendFxAmount === 'number'
                ? cur.sendFxAmount
                : cur.sendFx === false
                  ? 0
                  : 1
            next.sendFxAmount = clamp(curAmt + sendFxDelta, 0, 1)
            next.sendFx = next.sendFxAmount > 0.001
          }
          return { ...prev, [key]: next }
        }

        // Pitch macro = moves pitch-related params for the active voice.
        // Decay macro = moves decay/body params for the active voice.
        // If the caller provided "notches" (from UI), treat them as semitone-like ratios
        // so synth voices move in clearly-audible steps too.
        const pitchRatio =
          Number.isFinite(pitchSemisDelta) && pitchSemisDelta !== 0
            ? 2 ** (clamp(Math.round(pitchSemisDelta), -48, 48) / 12)
            : 1
        const decayRatio =
          Number.isFinite(decayNotchesDelta) && decayNotchesDelta !== 0
            ? 2 ** (clamp(Math.round(decayNotchesDelta), -48, 48) / 12)
            : 1

        const pitchDeltaEffective = Number.isFinite(pitchDelta) ? pitchDelta : 0
        const decayDeltaEffective = Number.isFinite(decayDelta) ? decayDelta : 0

        if (key === 'kick') {
          if (pitchRatio !== 1 || pitchDeltaEffective) {
            const baseMul = pitchRatio * (1 + pitchDeltaEffective)
            next.startHz = clamp((Number(cur.startHz) || 150) * baseMul, 30, 500)
            next.endHz = clamp((Number(cur.endHz) || 40) * (baseMul ** 0.9), 20, 220)
          }
          if (decayRatio !== 1 || decayDeltaEffective) {
            next.bodyS = clamp((Number(cur.bodyS) || 0.32) * decayRatio * (1 + decayDeltaEffective), 0.05, 1.2)
          }
        } else if (key === 'snare') {
          if (pitchRatio !== 1 || pitchDeltaEffective) {
            const baseMul = pitchRatio * (1 + pitchDeltaEffective)
            next.bodyHz = clamp((Number(cur.bodyHz) || 200) * baseMul, 80, 500)
            next.snapHz = clamp((Number(cur.snapHz) || 1950) * baseMul, 400, 8000)
          }
          if (decayRatio !== 1 || decayDeltaEffective) {
            const mul = decayRatio * (1 + decayDeltaEffective)
            next.bodyDecayS = clamp((Number(cur.bodyDecayS) || 0.055) * mul, 0.012, 0.28)
            next.noiseDecayS = clamp((Number(cur.noiseDecayS) || 0.2) * mul, 0.04, 0.55)
          }
        } else if (key === 'hat' || key === 'ride' || key === 'crashRide') {
          if (pitchRatio !== 1 || pitchDeltaEffective) {
            next.highpassHz = clamp((Number(cur.highpassHz) || 7000) * pitchRatio * (1 + pitchDeltaEffective), 2000, 15000)
          }
          if (decayRatio !== 1 || decayDeltaEffective) {
            next.decayS = clamp((Number(cur.decayS) || 0.1) * decayRatio * (1 + decayDeltaEffective), 0.02, 1.4)
          }
        } else if (key === 'clap' || key === 'crash1') {
          if (pitchRatio !== 1 || pitchDeltaEffective) {
            next.bandHz = clamp((Number(cur.bandHz) || 1500) * pitchRatio * (1 + pitchDeltaEffective), 200, 10000)
          }
          if (decayRatio !== 1 || decayDeltaEffective) {
            next.decayS = clamp((Number(cur.decayS) || 0.12) * decayRatio * (1 + decayDeltaEffective), 0.04, 1.4)
          }
        } else if (key === 'cowbell') {
          if (pitchRatio !== 1 || pitchDeltaEffective) {
            const mul = pitchRatio * (1 + pitchDeltaEffective)
            next.baseHz = clamp((Number(cur.baseHz) || 540) * mul, 200, 1400)
            next.secondHz = clamp((Number(cur.secondHz) || 807) * mul, 300, 2200)
          }
          if (decayRatio !== 1 || decayDeltaEffective) {
            next.decayS = clamp((Number(cur.decayS) || 0.1) * decayRatio * (1 + decayDeltaEffective), 0.02, 0.5)
          }
        }

        if (Number.isFinite(sendFxDelta) && sendFxDelta) {
          const curAmt =
            typeof cur.sendFxAmount === 'number'
              ? cur.sendFxAmount
              : cur.sendFx === false
                ? 0
                : 1
          next.sendFxAmount = clamp(curAmt + sendFxDelta, 0, 1)
          next.sendFx = next.sendFxAmount > 0.001
        }

        return { ...prev, [key]: next }
      })
    },
    [activeDrumIndex, setDrumKit],
  )

  useImperativeHandle(
    ref,
    () => ({
      initAudio,
      getPresetSnapshot,
      applyPresetSnapshot,
      openMixerDrawer: (opts) => {
        const tab = opts?.duoTab
        setDrawerInitialDuoTab(tab === 'drums' || tab === 'synth' ? tab : null)
        setDrawerOpen(true)
      },
      openDrumEditor: () => setDrumEditorOpen(true),
      openPianoSynthesis: () => setPianoSynthesisOpen(true),
      setPlayLayout: setPlayLayoutFromHost,
      adjustActiveDrumMacro,
      /** Obsidian chrome: expose current knob/bar positions for the active drum voice. */
      getActiveDrumMacroReadout: () => {
        const v = DRUM_VOICES[activeDrumIndex] ?? DRUM_VOICES[0]
        const key = v.key
        const cur = drumKit?.[key]
        if (!cur) return { pitchSemis: 0, decayNotches: 0, sendFxAmount: 1 }

        const log2 = (x) => Math.log(x) / Math.log(2)
        const safe = (x, d) => {
          const n = Number(x)
          return Number.isFinite(n) ? n : d
        }

        const sendFxAmount = Math.max(0, Math.min(1, Number(drumFxSend) || 0))

        if (cur.source === 'sample') {
          const pitchSemis = Math.round(12 * log2(Math.max(0.25, Math.min(4, safe(cur.sampleRate, 1)))))
          const decayNotches = Math.round(12 * log2(Math.max(0.03, Math.min(3, safe(cur.sampleDecayS, 0.35))) / 0.35))
          return { pitchSemis, decayNotches, sendFxAmount }
        }

        const base = DEFAULT_DRUM_KIT?.[key] ?? null
        if (!base) return { pitchSemis: 0, decayNotches: 0, sendFxAmount }

        // Choose one representative pitch + decay param per voice.
        const pitchParam =
          key === 'kick'
            ? [safe(cur.startHz, 150), safe(base.startHz, 150)]
            : key === 'snare'
              ? [safe(cur.bodyHz, 185), safe(base.bodyHz, 185)]
              : key === 'cowbell'
                ? [safe(cur.baseHz, 560), safe(base.baseHz, 560)]
                : key === 'clap' || key === 'crash1'
                  ? [safe(cur.bandHz, 1650), safe(base.bandHz, 1650)]
                  : [safe(cur.highpassHz, 8200), safe(base.highpassHz, 8200)]

        const decayParam =
          key === 'kick'
            ? [safe(cur.bodyS, 0.38), safe(base.bodyS, 0.38)]
            : key === 'snare'
              ? [safe(cur.noiseDecayS, 0.16), safe(base.noiseDecayS, 0.16)]
              : key === 'cowbell'
                ? [safe(cur.decayS, 0.11), safe(base.decayS, 0.11)]
                : [safe(cur.decayS, 0.1), safe(base.decayS, 0.1)]

        const pitchSemis = Math.round(12 * log2(Math.max(1e-6, pitchParam[0]) / Math.max(1e-6, pitchParam[1])))
        const decayNotches = Math.round(12 * log2(Math.max(1e-6, decayParam[0]) / Math.max(1e-6, decayParam[1])))
        return { pitchSemis, decayNotches, sendFxAmount }
      },
      openDrumFxPanel: () => {
        setPlayLayoutPersist('drum')
        setDrumEditorOpen(true)
        setDrawerOpen(false)
        setMainPanelFocus('drumFx')
        // Clear focus after next paint so future clicks re-scroll.
        requestAnimationFrame(() => setMainPanelFocus(null))
      },
      setDrumMasterFxSend: (amt) => {
        const n = Math.max(0, Math.min(1, Number(amt) || 0))
        setDrumFxSend(n)
      },
      undoPatch: () => undoPresetSnapshot(),
      toggleRecording: () => void toggleRecording(),
      /** Stitch obsidian drum strip — derives from focused drum voice editor slot. */
      getObsidianDrumSampleLine: () => {
        const v = DRUM_VOICES[activeDrumIndex] ?? DRUM_VOICES[0]
        const slot = drumKit?.[v.key]
        if (!slot) return `Sample: ${String(v.label).toUpperCase().replace(/\s+/g, '_')}`
        const sn = typeof slot.sampleName === 'string' ? slot.sampleName.trim() : ''
        if (sn) {
          const slug = sn
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .toUpperCase()
          return slug ? `Sample: ${slug}` : `Sample: ${String(v.label).toUpperCase().replace(/\s+/g, '_')}`
        }
        return `Sample: ${String(v.label).toUpperCase().replace(/\s+/g, '_')}_SYNTH`
      },
    }),
    [
      initAudio,
      getPresetSnapshot,
      applyPresetSnapshot,
      undoPresetSnapshot,
      toggleRecording,
      setPlayLayoutFromHost,
      adjustActiveDrumMacro,
      activeDrumIndex,
      drumKit,
      drumFxSend,
      setDrumFxSend,
      setPlayLayoutPersist,
    ],
  )

  useEffect(() => {
    onEmbeddedPlayLayoutChange?.(playLayout)
  }, [playLayout, onEmbeddedPlayLayoutChange])

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
    (hit) => {
      const illu =
        typeof hit === 'number'
          ? hit
          : DRUM_AUX_EDITOR_INDEX[/** @type {keyof typeof DRUM_AUX_EDITOR_INDEX} */ (hit.aux)] ?? 0
      setActiveDrumIndex(illu)
      setDrumKitIlluIndex(illu)
      setDrumKitIlluToken((t) => t + 1)
      prime()
      triggerDrum(hit)
    },
    [triggerDrum, prime],
  )

  return (
    <div
      className={`synth-embed-root flex w-full min-w-0 flex-col overflow-hidden ${
        stitchEmbeddedDrumChrome
          ? 'h-full min-h-0 bg-transparent text-on-background'
          : `bg-gradient-to-b from-[#0a0a0c] to-[#050506] text-zinc-200 ${embedded ? 'h-full min-h-0' : 'h-dvh max-h-dvh'}`
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
          stitchObsidianChrome={stitchObsidianChrome}
          stitchSynthwaveChrome={stitchSynthwaveChrome}
          stitchLightLabChrome={stitchLightLabChrome}
        />
      ) : (
        <SynthAppEmbeddedLayoutRail
          playLayout={playLayout}
          ready={ready}
          activeDrumIndex={activeDrumIndex}
          activePartIndex={activePartIndex}
          prime={prime}
          setPlayLayoutPersist={setPlayLayoutPersist}
          setDrumEditorOpen={setDrumEditorOpen}
          setPianoSynthesisOpen={setPianoSynthesisOpen}
          drumEditorOpen={drumEditorOpen}
          pianoSynthesisOpen={pianoSynthesisOpen}
          stitchSynthwaveChrome={stitchSynthwaveChrome}
          stitchLightLabChrome={stitchLightLabChrome}
        />
      )}

      <SynthAppMainPanel
        stitchEmbeddedDrumChrome={stitchEmbeddedDrumChrome}
        stitchObsidianChrome={stitchObsidianChrome}
        stitchSynthwaveChrome={stitchSynthwaveChrome}
        stitchLightLabChrome={stitchLightLabChrome}
        mainPanelFocus={mainPanelFocus}
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
        filterQNorm={filterQNorm}
        setFilterQFromNorm={setFilterQFromNorm}
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
        analyserRef={analyser}
        synthwaveSynthHighlight={synthwaveSynthTab}
      />

      <SynthAppBottomSection
        stitchEmbeddedDrumChrome={stitchEmbeddedDrumChrome}
        stitchSynthwaveChrome={stitchSynthwaveChrome}
        stitchObsidianChrome={stitchObsidianChrome}
        stitchLightLabChrome={stitchLightLabChrome}
        playLayout={playLayout}
        pianoSynthesisOpen={pianoSynthesisOpen}
        settingsHandleDragRef={settingsHandleDragRef}
        prime={prime}
        setDrawerMaximized={setDrawerMaximized}
        setDrawerOpen={setDrawerOpen}
        synthwaveSynthTab={synthwaveSynthTab}
        onSynthwaveSynthTabChange={setSynthwaveSynthTab}
        onDrumPad={onDrumPad}
        isKeyActive={isKeyActive}
        onPianoDown={onPianoDown}
        onPianoUp={onPianoUp}
      />

      <SettingsDrawer
        obsidianChrome={stitchObsidianChrome && !stitchSynthwaveChrome && !stitchLightLabChrome}
        synthwaveChrome={stitchSynthwaveChrome}
        open={drawerOpen}
        maximized={drawerMaximized}
        initialDuoTab={drawerInitialDuoTab}
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
