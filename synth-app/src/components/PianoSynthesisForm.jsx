import { DEFAULT_FX_SYNTH } from '../hooks/useSynth.js'
import { EffectsBlock } from './EffectsBlock.jsx'
import { PresetBlock } from './PresetBlock.jsx'
import { OscPanel } from './SynthPartPanels.jsx'

/**
 * Presets, parts, time/space, and oscillators — used in the bottom sheet and
 * in the main column when A–D is on in piano mode.
 */
export function PianoSynthesisForm({
  /** Reload user preset list when this becomes true (drawer or A–D panel opened). */
  presetListReloadOpen,
  getPresetSnapshot,
  applyPresetSnapshot,
  applyFactorySynthPreset,
  activeFactoryPresetId = null,
  onUserGesture,
  drumKit,
  setDrumKit,
  partCount,
  activePartIndex,
  onActivePartChange,
  fx,
  setFx,
  resetAllParts,
  osc1,
  setOsc1,
  osc2,
  setOsc2,
  osc3,
  setOsc3,
  /** Slightly less bottom padding in the in-place panel. */
  compactBottom,
}) {
  return (
    <>
      <PresetBlock
        open={presetListReloadOpen}
        drumMode={false}
        getPresetSnapshot={getPresetSnapshot}
        applyPresetSnapshot={applyPresetSnapshot}
        applyFactorySynthPreset={applyFactorySynthPreset}
        activeFactoryPresetId={activeFactoryPresetId}
        onUserGesture={onUserGesture}
      />
      <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Active part
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: partCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onUserGesture?.()
                onActivePartChange(i)
              }}
              className={`min-w-[2.5rem] rounded-md px-2.5 py-1.5 text-xs font-medium ${
                activePartIndex === i
                  ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                  : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <EffectsBlock
          fx={fx}
          setFx={setFx}
          onUserGesture={onUserGesture}
          drumKit={drumKit}
          setDrumKit={setDrumKit}
        />
      </div>
      <div className="space-y-3">
        <OscPanel
          title="Oscillator 1"
          showEnable={false}
          isPrimary
          osc={osc1}
          setOsc={setOsc1}
          onUserGesture={onUserGesture}
        />
        <OscPanel
          title="Oscillator 2"
          showEnable
          enabled={osc2.enabled}
          onEnabledToggle={() => setOsc2((o) => ({ ...o, enabled: !o.enabled }))}
          osc={osc2}
          setOsc={setOsc2}
          onUserGesture={onUserGesture}
        />
        <OscPanel
          title="Oscillator 3"
          showEnable
          enabled={osc3.enabled}
          onEnabledToggle={() => setOsc3((o) => ({ ...o, enabled: !o.enabled }))}
          osc={osc3}
          setOsc={setOsc3}
          onUserGesture={onUserGesture}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          onUserGesture?.()
          resetAllParts()
          setFx({ ...DEFAULT_FX_SYNTH })
        }}
        className={
          compactBottom
            ? 'mt-3 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400'
            : 'mt-4 w-full rounded-lg border border-zinc-800 py-2 text-sm text-zinc-400'
        }
      >
        Reset all parts and effects
      </button>
    </>
  )
}
