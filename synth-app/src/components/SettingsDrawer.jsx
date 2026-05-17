import { useEffect, useState } from 'react'
import { DEFAULT_FX_DRUM, DEFAULT_FX_SYNTH } from '../hooks/useSynth.js'
import { synthChromeUi } from '../lib/synthChromeUi.js'
import { DrumEngineBlock } from './DrumEngineBlock.jsx'
import { EffectsBlock } from './EffectsBlock.jsx'
import { PianoSynthesisForm } from './PianoSynthesisForm.jsx'
import { PresetBlock } from './PresetBlock.jsx'

/**
 * @param {object} props
 * @param {'piano' | 'drum' | 'both'} [props.playLayout]  Controls drawer content. Defaults from drumMode for back-compat.
 * @param {boolean} [props.drumMode]  @deprecated  Use playLayout. When set without playLayout, drumMode true => 'drum'.
 */
export function SettingsDrawer({
  open,
  onClose,
  maximized = false,
  playLayout: playLayoutProp,
  drumMode,
  initialDuoTab,
  obsidianChrome = false,
  synthwaveChrome = false,
  fx,
  setFx,
  partCount,
  activePartIndex,
  onActivePartChange,
  resetAllParts,
  drumKit,
  setDrumKit,
  activeDrumIndex,
  onActiveDrumIndexChange,
  resetDrumKit,
  applyDrumStyle,
  setDrumSample,
  clearDrumSample,
  drumSampleBuffers,
  getPresetSnapshot,
  applyPresetSnapshot,
  applyFactorySynthPreset,
  activeFactoryPresetId,
  osc1,
  setOsc1,
  osc2,
  setOsc2,
  osc3,
  setOsc3,
  onUserGesture,
}) {
  const playLayout =
    playLayoutProp ?? (drumMode ? 'drum' : 'piano')
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')
  const [duoTab, setDuoTab] = useState(/** @type {'synth' | 'drums'} */ ('synth'))
  useEffect(() => {
    if (!open) {
      setDuoTab('synth')
      return
    }
    if (playLayout !== 'both') return
    if (initialDuoTab === 'drums' || initialDuoTab === 'synth') {
      setDuoTab(initialDuoTab)
    } else {
      setDuoTab('synth')
    }
  }, [open, initialDuoTab, playLayout])
  useEffect(() => {
    if (!open) return
    const o = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', o)
    return () => window.removeEventListener('keydown', o)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default touch-none bg-black/70 backdrop-blur-sm"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        className={`${u.drawerShell} ${
          maximized ? 'h-[100dvh] max-h-[100dvh]' : 'max-h-[78vh]'
        }`}
        style={{
          transform: 'translateY(0)',
          animation: 'sdrawer 0.32s ease-out',
        }}
      >
        <style>{`
          @keyframes sdrawer { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
        <div className={u.drawerHandle} />
        <h2 className={u.drawerTitle}>Synthesis</h2>
        <p className={u.drawerLead}>
          {playLayout === 'both'
            ? 'Duo: drums and keyboard play together. Use the tabs for synth (parts, oscillators, time and space) vs drum kit, samples, and pad routing. A–D opens the synth panel in the center; drum pads live above the keys.'
            : playLayout === 'drum'
              ? 'Drum mode: use A–D on the right to open the full drum and effects panel in the center, or this drawer for presets. Switch to Piano for the filter and oscillators. Master time and space is shared (same as the center panel).'
              : 'Four multitimbral parts: each has its own three-layer stack. New notes use the part selected here (keyboard shows P1–P4). Time and space are global. You can also open the same panel in the center with A–D. Extra saw shapes use custom harmonic stacks.'}
        </p>
        {playLayout === 'drum' ? (
          <>
            <PresetBlock
              open={open}
              drumMode
              getPresetSnapshot={getPresetSnapshot}
              applyPresetSnapshot={applyPresetSnapshot}
              onUserGesture={onUserGesture}
              obsidianChrome={obsidianChrome}
              synthwaveChrome={synthwaveChrome}
            />
            <DrumEngineBlock
              drumKit={drumKit}
              setDrumKit={setDrumKit}
              activeDrumIndex={activeDrumIndex}
              onActiveDrumIndexChange={onActiveDrumIndexChange}
              onUserGesture={onUserGesture}
              applyDrumStyle={applyDrumStyle}
              setDrumSample={setDrumSample}
              clearDrumSample={clearDrumSample}
              drumSampleBuffers={drumSampleBuffers}
              obsidianChrome={obsidianChrome}
            />
            <div className="mb-3">
              <EffectsBlock
                fx={fx}
                setFx={setFx}
                onUserGesture={onUserGesture}
                drumMode
                drumKit={drumKit}
                setDrumKit={setDrumKit}
                obsidianChrome={obsidianChrome}
                synthwaveChrome={synthwaveChrome}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onUserGesture?.()
                resetDrumKit()
                setFx({ ...DEFAULT_FX_DRUM })
              }}
              className={u.outlineBtn}
            >
              Reset drum sounds and effects
            </button>
          </>
        ) : playLayout === 'both' ? (
          <>
            <div className={u.duoTabWrap}>
              <button
                type="button"
                onClick={() => {
                  onUserGesture?.()
                  setDuoTab('synth')
                }}
                className={duoTab === 'synth' ? u.duoTabOn : u.duoTabOff}
              >
                Synth
              </button>
              <button
                type="button"
                onClick={() => {
                  onUserGesture?.()
                  setDuoTab('drums')
                }}
                className={duoTab === 'drums' ? u.duoTabOn : u.duoTabOff}
              >
                Drums
              </button>
            </div>
            {duoTab === 'synth' ? (
              <PianoSynthesisForm
                presetListReloadOpen={open}
                getPresetSnapshot={getPresetSnapshot}
                applyPresetSnapshot={applyPresetSnapshot}
                applyFactorySynthPreset={applyFactorySynthPreset}
                activeFactoryPresetId={activeFactoryPresetId}
                onUserGesture={onUserGesture}
                drumKit={drumKit}
                setDrumKit={setDrumKit}
                partCount={partCount}
                activePartIndex={activePartIndex}
                onActivePartChange={onActivePartChange}
                fx={fx}
                setFx={setFx}
                resetAllParts={resetAllParts}
                osc1={osc1}
                setOsc1={setOsc1}
                osc2={osc2}
                setOsc2={setOsc2}
                osc3={osc3}
                setOsc3={setOsc3}
                compactBottom={false}
                obsidianChrome={obsidianChrome}
                synthwaveChrome={synthwaveChrome}
              />
            ) : (
              <>
                <PresetBlock
                  open={open}
                  drumMode
                  getPresetSnapshot={getPresetSnapshot}
                  applyPresetSnapshot={applyPresetSnapshot}
                  onUserGesture={onUserGesture}
                  obsidianChrome={obsidianChrome}
                  synthwaveChrome={synthwaveChrome}
                />
                <DrumEngineBlock
                  drumKit={drumKit}
                  setDrumKit={setDrumKit}
                  activeDrumIndex={activeDrumIndex}
                  onActiveDrumIndexChange={onActiveDrumIndexChange}
                  onUserGesture={onUserGesture}
                  applyDrumStyle={applyDrumStyle}
                  setDrumSample={setDrumSample}
                  clearDrumSample={clearDrumSample}
                  drumSampleBuffers={drumSampleBuffers}
                  obsidianChrome={obsidianChrome}
                />
                <div className="mb-3">
                  <EffectsBlock
                    fx={fx}
                    setFx={setFx}
                    onUserGesture={onUserGesture}
                    drumMode
                    drumKit={drumKit}
                    setDrumKit={setDrumKit}
                    obsidianChrome={obsidianChrome}
                    synthwaveChrome={synthwaveChrome}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    resetDrumKit()
                  }}
                  className={u.outlineBtnTight}
                >
                  Reset drum sounds
                </button>
              </>
            )}
          </>
        ) : (
          <PianoSynthesisForm
            presetListReloadOpen={open}
            getPresetSnapshot={getPresetSnapshot}
            applyPresetSnapshot={applyPresetSnapshot}
            applyFactorySynthPreset={applyFactorySynthPreset}
            activeFactoryPresetId={activeFactoryPresetId}
            onUserGesture={onUserGesture}
            drumKit={drumKit}
            setDrumKit={setDrumKit}
            partCount={partCount}
            activePartIndex={activePartIndex}
            onActivePartChange={onActivePartChange}
            fx={fx}
            setFx={setFx}
            resetAllParts={resetAllParts}
            osc1={osc1}
            setOsc1={setOsc1}
            osc2={osc2}
            setOsc2={setOsc2}
            osc3={osc3}
            setOsc3={setOsc3}
            compactBottom={false}
            obsidianChrome={obsidianChrome}
            synthwaveChrome={synthwaveChrome}
          />
        )}
      </div>
    </>
  )
}
