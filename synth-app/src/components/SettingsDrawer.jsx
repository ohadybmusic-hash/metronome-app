import { useEffect, useState } from 'react'
import { DEFAULT_FX_DRUM, DEFAULT_FX_SYNTH } from '../hooks/useSynth.js'
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
  const [duoTab, setDuoTab] = useState(/** @type {'synth' | 'drums'} */ ('synth'))
  useEffect(() => {
    if (!open) setDuoTab('synth')
  }, [open])
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
        className={`fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-2xl border border-t border-zinc-800 bg-[#0c0c10] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] ${
          maximized
            ? 'h-[100dvh] max-h-[100dvh]'
            : 'max-h-[78vh]'
        }`}
        style={{
          transform: 'translateY(0)',
          animation: 'sdrawer 0.32s ease-out',
        }}
      >
        <style>{`
          @keyframes sdrawer { from { transform: translateY(100%); } to { transform: translateY(0); } }
        `}</style>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
        <h2 className="mb-0.5 text-sm font-semibold text-zinc-200">Synthesis</h2>
        <p className="mb-3 text-xs text-zinc-500">
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
            />
            <div className="mb-3">
              <EffectsBlock
                fx={fx}
                setFx={setFx}
                onUserGesture={onUserGesture}
                drumMode
                drumKit={drumKit}
                setDrumKit={setDrumKit}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onUserGesture?.()
                resetDrumKit()
                setFx({ ...DEFAULT_FX_DRUM })
              }}
              className="mt-4 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400"
            >
              Reset drum sounds and effects
            </button>
          </>
        ) : playLayout === 'both' ? (
          <>
            <div className="mb-3 flex rounded-lg border border-zinc-800 p-0.5">
              <button
                type="button"
                onClick={() => {
                  onUserGesture?.()
                  setDuoTab('synth')
                }}
                className={`min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                  duoTab === 'synth'
                    ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/40'
                    : 'text-zinc-500'
                }`}
              >
                Synth
              </button>
              <button
                type="button"
                onClick={() => {
                  onUserGesture?.()
                  setDuoTab('drums')
                }}
                className={`min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                  duoTab === 'drums'
                    ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/40'
                    : 'text-zinc-500'
                }`}
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
              />
            ) : (
              <>
                <PresetBlock
                  open={open}
                  drumMode
                  getPresetSnapshot={getPresetSnapshot}
                  applyPresetSnapshot={applyPresetSnapshot}
                  onUserGesture={onUserGesture}
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
                />
                <div className="mb-3">
                  <EffectsBlock
                    fx={fx}
                    setFx={setFx}
                    onUserGesture={onUserGesture}
                    drumMode
                    drumKit={drumKit}
                    setDrumKit={setDrumKit}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    resetDrumKit()
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400"
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
          />
        )}
      </div>
    </>
  )
}
