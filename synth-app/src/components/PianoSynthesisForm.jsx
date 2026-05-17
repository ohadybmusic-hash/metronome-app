import { DEFAULT_FX_SYNTH } from '../hooks/useSynth.js'
import { synthChromeUi } from '../lib/synthChromeUi.js'
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
  obsidianChrome = false,
  synthwaveChrome = false,
}) {
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')
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
        obsidianChrome={obsidianChrome}
        synthwaveChrome={synthwaveChrome}
      />
      <div className={`mb-3 ${u.panel}`}>
        <p className={u.labelCaps}>Active part</p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: partCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onUserGesture?.()
                onActivePartChange(i)
              }}
              className={`min-w-[2.5rem] ${u.pill(activePartIndex === i)}`}
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
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
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
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
        />
        <OscPanel
          title="Oscillator 2"
          showEnable
          enabled={osc2.enabled}
          onEnabledToggle={() => setOsc2((o) => ({ ...o, enabled: !o.enabled }))}
          osc={osc2}
          setOsc={setOsc2}
          onUserGesture={onUserGesture}
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
        />
        <OscPanel
          title="Oscillator 3"
          showEnable
          enabled={osc3.enabled}
          onEnabledToggle={() => setOsc3((o) => ({ ...o, enabled: !o.enabled }))}
          osc={osc3}
          setOsc={setOsc3}
          onUserGesture={onUserGesture}
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          onUserGesture?.()
          resetAllParts()
          setFx({ ...DEFAULT_FX_SYNTH })
        }}
        className={`w-full py-2 text-sm ${compactBottom ? 'mt-3' : 'mt-4'} ${
          obsidianChrome
            ? 'rounded-ds-lg border border-hairline text-on-surface-variant'
            : 'rounded-lg border border-zinc-800 text-zinc-400'
        }`}
      >
        Reset all parts and effects
      </button>
    </>
  )
}
