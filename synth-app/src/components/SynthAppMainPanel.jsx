import { useEffect, useRef } from 'react'
import { DrumEngineBlock } from './DrumEngineBlock.jsx'
import { DrumKitIllustration } from './DrumKitIllustration.jsx'
import { EffectsBlock } from './EffectsBlock.jsx'
import { FilterDial } from './FilterDial.jsx'
import { PianoSynthesisForm } from './PianoSynthesisForm.jsx'
import { SynthwaveSynthRack } from './SynthwaveSynthRack.jsx'

export function SynthAppMainPanel({
  stitchEmbeddedDrumChrome = false,
  stitchObsidianChrome = false,
  stitchSynthwaveChrome = false,
  stitchLightLabChrome = false,
  mainPanelFocus = null,
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
  filterQNorm,
  setFilterQFromNorm,
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
  analyserRef,
  synthwaveSynthHighlight,
}) {
  const filterVariant = stitchLightLabChrome ? 'lightLab' : stitchObsidianChrome ? 'obsidian' : 'default'
  const obsidianSynthUi = stitchObsidianChrome && !stitchSynthwaveChrome && !stitchLightLabChrome
  const fxAnchorRef = useRef(null)

  useEffect(() => {
    if (playLayout !== 'drum') return
    if (!drumEditorOpen) return
    if (mainPanelFocus !== 'drumFx') return
    const el = fxAnchorRef.current
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [drumEditorOpen, mainPanelFocus, playLayout])

  return (
    <div
      className={`relative z-0 min-h-0 overflow-hidden ${
        stitchEmbeddedDrumChrome && playLayout === 'drum' && !drumEditorOpen ? 'h-0 flex-none' : 'flex-1'
      }`}
    >
      {playLayout === 'drum' ? (
        drumEditorOpen ? (
          <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 pb-2 pt-1 sm:px-3 sm:pt-1.5">
            <DrumEngineBlock
              obsidianChrome={obsidianSynthUi}
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
            <div ref={fxAnchorRef} className="mb-0 mt-0">
              <EffectsBlock
                obsidianChrome={obsidianSynthUi}
                fx={fx}
                setFx={setFx}
                onUserGesture={prime}
                drumMode
                drumKit={drumKit}
                setDrumKit={setDrumKit}
              />
            </div>
          </div>
        ) : stitchEmbeddedDrumChrome ? null : (
          <DrumKitIllustration lastHitIndex={drumKitIlluIndex} lastHitToken={drumKitIlluToken} />
        )
      ) : playLayout === 'piano' || playLayout === 'both' ? (
        stitchSynthwaveChrome && !pianoSynthesisOpen ? (
          <SynthwaveSynthRack
            analyserRef={analyserRef}
            filterNorm={filterNorm}
            setFilterFromNorm={setFilterFromNorm}
            filterQNorm={filterQNorm}
            setFilterQFromNorm={setFilterQFromNorm}
            osc1={osc1}
            setOsc1={setOsc1}
            onUserGesture={prime}
            highlightSection={/** @type {'osc'|'vcf'|'env'} */ (
              synthwaveSynthHighlight === 'fx' ? 'osc' : synthwaveSynthHighlight
            )}
          />
        ) : pianoSynthesisOpen ? (
          <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 pb-2 pt-1 sm:px-3 sm:pt-1.5">
            <h2
              className={`mb-0.5 text-sm font-semibold ${
                stitchLightLabChrome ? 'text-on-surface' : obsidianSynthUi ? 'text-chrome' : 'text-zinc-200'
              }`}
            >
              Synthesis
            </h2>
            <p
              className={`mb-3 text-xs ${
                stitchLightLabChrome || obsidianSynthUi ? 'text-on-surface-variant' : 'text-zinc-500'
              }`}
            >
              Same controls as the bottom sheet, here in the main panel instead of
              the filter. Tap A–D again to return to the filter.
            </p>
            <PianoSynthesisForm
              obsidianChrome={obsidianSynthUi}
              synthwaveChrome={stitchSynthwaveChrome}
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
            variant={filterVariant}
            value={filterNorm}
            onChange={(n) => {
              prime()
              setFilterFromNorm(n)
            }}
            onUserGesture={prime}
          />
        )
      ) : null}
      {!stitchEmbeddedDrumChrome || playLayout !== 'drum' || drumEditorOpen ? (
        stitchLightLabChrome ? (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
        ) : stitchSynthwaveChrome && (playLayout === 'piano' || playLayout === 'both') && !pianoSynthesisOpen ? null : (
          <div
            className={`pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t to-transparent ${
              obsidianSynthUi ? 'from-background' : 'from-[#050506]'
            }`}
          />
        )
      ) : null}
    </div>
  )
}
