import { DrumEngineBlock } from './DrumEngineBlock.jsx'
import { DrumKitIllustration } from './DrumKitIllustration.jsx'
import { EffectsBlock } from './EffectsBlock.jsx'
import { FilterDial } from './FilterDial.jsx'
import { PianoSynthesisForm } from './PianoSynthesisForm.jsx'

export function SynthAppMainPanel({
  playLayout,
  drumEditorOpen,
  pianoSynthesisOpen,
  drumKit,
  setDrumKit,
  activeDrumIndex,
  setActiveDrumIndex,
  prime,
  applyDrumStyle,
  setDrumSample,
  clearDrumSample,
  drumSampleBuffers,
  fx,
  setFx,
  drumKitIlluIndex,
  drumKitIlluToken,
  filterNorm,
  setFilterFromNorm,
  getPresetSnapshot,
  applyPresetSnapshot,
  applyFactorySynthPreset,
  activeFactoryPresetId,
  partCount,
  activePartIndex,
  setActivePartIndex,
  resetAllParts,
  osc1,
  setOsc1,
  osc2,
  setOsc2,
  osc3,
  setOsc3,
}) {
  return (
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
          <DrumKitIllustration lastHitIndex={drumKitIlluIndex} lastHitToken={drumKitIlluToken} />
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
  )
}
