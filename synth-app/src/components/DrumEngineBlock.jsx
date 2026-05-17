import { useRef, useState } from 'react'
import { DRUM_STYLE_PRESETS } from '../lib/drumSamplePlayback.js'
import { DRUM_PAD_LAYOUT, DRUM_VOICES } from '../lib/drumVoices.js'
import { synthChromeUi } from '../lib/synthChromeUi.js'
import { Row } from './FormRow.jsx'

export function DrumEngineBlock({
  obsidianChrome = false,
  drumKit,
  setDrumKit,
  activeDrumIndex,
  onActiveDrumIndexChange,
  onUserGesture,
  applyDrumStyle,
  setDrumSample,
  clearDrumSample,
  drumSampleBuffers,
}) {
  const u = synthChromeUi(obsidianChrome)
  const v = DRUM_VOICES[activeDrumIndex] ?? DRUM_VOICES[0]
  const k = v.key
  const d = drumKit[k]
  const fileRef = useRef(null)
  const [drumStyleId, setDrumStyleId] = useState('default')
  if (!d) {
    return (
      <div className="mb-3 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-200/90">
        Voice “{k}” is missing. Reset the drum kit or reload a saved preset.
      </div>
    )
  }
  const isSample = d.source === 'sample'
  const hasBuffer = Boolean(drumSampleBuffers[k])
  const isCymbalNoise = k === 'hat' || k === 'ride' || k === 'crashRide'
  const isClapOrCrash = k === 'clap' || k === 'crash1'
  const cymDecayMax = k === 'hat' ? 0.4 : 0.95
  const clapDecayMax = k === 'crash1' ? 1.2 : 0.6
  const styleInfo = DRUM_STYLE_PRESETS.find((x) => x.id === drumStyleId)

  const patch = (partial) => {
    onUserGesture?.()
    setDrumKit((prev) => ({
      ...prev,
      [k]: { ...prev[k], ...partial },
    }))
  }

  return (
    <div className={`mb-3 ${u.panel}`}>
      <p className={`mb-1 ${u.labelCapsTight}`}>Drum engine</p>
      <p className={u.body}>
        Choose a <strong className={u.strongAlt}>style</strong> for synthesizer kits, or load a{' '}
        <strong className={u.strongAlt}>WAV / MP3</strong> per pad. Samples stay in memory until you clear them or
        load a preset (re-import files after refresh).
      </p>
      <div className="mb-3">
        <label className={`mb-1 block ${u.labelCapsTight}`}>Style preset (synthesis)</label>
        <select
          className={u.select}
          value={drumStyleId}
          onChange={(e) => {
            const id = e.target.value
            onUserGesture?.()
            setDrumStyleId(id)
            applyDrumStyle(id)
          }}
          aria-label="Drum style preset"
        >
          {DRUM_STYLE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className={`mt-1 ${u.bodyDim}`}>{styleInfo?.description}</p>
      </div>
      <p className={`mb-1 ${u.labelCapsTight}`}>Pads (same layout as the keyboard row)</p>
      <div className="mb-3 grid w-full max-w-sm grid-cols-2 grid-rows-4 gap-1.5 sm:max-w-md">
        {DRUM_PAD_LAYOUT.map((c) => {
          const o = DRUM_VOICES[c.i]
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                onUserGesture?.()
                onActiveDrumIndexChange(c.i)
              }}
              className={`min-w-0 rounded-md px-2 py-1.5 text-center text-[10px] font-bold leading-tight tracking-wide sm:py-2 sm:text-xs ${
                activeDrumIndex === c.i
                  ? obsidianChrome
                    ? 'ring-1 ring-chrome/55'
                    : 'ring-1 ring-zinc-500'
                  : u.pillOff
              }`}
              style={
                activeDrumIndex === c.i
                  ? {
                      color: o.color,
                      backgroundColor: `${o.color}12`,
                      borderColor: o.color,
                    }
                  : undefined
              }
            >
              {c.label}
            </button>
          )
        })}
      </div>
      <p className={`mb-1.5 ${u.labelCaps}`}>{v.label} — sound</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            clearDrumSample(k)
          }}
          className={u.pill(!isSample)}
        >
          Synthesized
        </button>
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            patch({ source: 'sample' })
          }}
          className={u.pill(isSample)}
        >
          From file
        </button>
      </div>
      {isSample ? (
        <div className="space-y-2.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,audio/wav,audio/mpeg,audio/ogg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void setDrumSample(k, f).then(() => onUserGesture?.())
              }}
            />
            <button
              type="button"
              onClick={() => {
                onUserGesture?.()
                fileRef.current?.click()
              }}
              className={u.fileBtn}
            >
              Choose audio file…
            </button>
            <span className={u.truncateHint}>
              {d.sampleName || (hasBuffer ? 'Loaded' : 'No file loaded')}
            </span>
          </div>
          <p className={u.bodyDim}>
            New BufferSource on each hit. If “Sample” is on but no file is loaded, the synth sound plays instead.
          </p>
          <Row obsidianChrome={obsidianChrome}
            label="Playback speed"
            value={d.sampleRate ?? 1}
            onChange={(n) => patch({ sampleRate: n })}
            min={0.5}
            max={2}
            step={0.05}
            fmt={(n) => `${n.toFixed(2)}×`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
      {!isSample && k === 'kick' ? (
        <div className="space-y-2.5">
          <Row obsidianChrome={obsidianChrome}
            label="Start pitch (Hz)"
            value={d.startHz}
            onChange={(n) => patch({ startHz: n })}
            min={30}
            max={400}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="End pitch (Hz)"
            value={d.endHz}
            onChange={(n) => patch({ endHz: n })}
            min={20}
            max={200}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Pitch sweep"
            value={d.sweepS}
            onChange={(n) => patch({ sweepS: n })}
            min={0.02}
            max={0.5}
            step={0.005}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Amp attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0005}
            max={0.1}
            step={0.0005}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Body / decay"
            value={d.bodyS}
            onChange={(n) => patch({ bodyS: n })}
            min={0.05}
            max={1.2}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
      {!isSample && k === 'snare' ? (
        <div className="space-y-2.5">
          <p className={u.sectionLabelDim}>
            Body (sine)
          </p>
          <Row obsidianChrome={obsidianChrome}
            label="Body pitch"
            value={d.bodyHz}
            onChange={(n) => patch({ bodyHz: n })}
            min={80}
            max={500}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Body amount"
            value={d.bodyLevel}
            onChange={(n) => patch({ bodyLevel: n })}
            min={0}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Body decay"
            value={d.bodyDecayS}
            onChange={(n) => patch({ bodyDecayS: n })}
            min={0.012}
            max={0.28}
            step={0.005}
            fmt={(n) => `${n.toFixed(3)} s`}
          />
          <p className={`pt-1 ${u.sectionLabelDim}`}>
            Wire / snap (noise)
          </p>
          <Row obsidianChrome={obsidianChrome}
            label="Snap center"
            value={d.snapHz}
            onChange={(n) => patch({ snapHz: n })}
            min={400}
            max={8000}
            step={25}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Snap focus (Q)"
            value={d.snapQ}
            onChange={(n) => patch({ snapQ: n })}
            min={0.2}
            max={4}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Noise attack"
            value={d.noiseAttackS}
            onChange={(n) => patch({ noiseAttackS: n })}
            min={0.0002}
            max={0.05}
            step={0.0002}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Noise decay"
            value={d.noiseDecayS}
            onChange={(n) => patch({ noiseDecayS: n })}
            min={0.04}
            max={0.55}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Output level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
      {!isSample && isCymbalNoise ? (
        <div className="space-y-2.5">
          <p className={u.bodyDim}>
            Noise + high-pass (hi-hat, ride, or washy crash-ride)
          </p>
          <Row obsidianChrome={obsidianChrome}
            label="High-pass (Hz)"
            value={d.highpassHz}
            onChange={(n) => patch({ highpassHz: n })}
            min={2000}
            max={15000}
            step={50}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Resonance (Q)"
            value={d.q}
            onChange={(n) => patch({ q: n })}
            min={0.1}
            max={3}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0002}
            max={0.1}
            step={0.0002}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.02}
            max={cymDecayMax}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
      {!isSample && isClapOrCrash ? (
        <div className="space-y-2.5">
          <p className={u.bodyDim}>
            {k === 'crash1'
              ? 'Noise + bandpass (long crash; higher decay range)'
              : 'Noise + bandpass (hand clap)'}
          </p>
          <Row obsidianChrome={obsidianChrome}
            label="Bandpass (Hz)"
            value={d.bandHz}
            onChange={(n) => patch({ bandHz: n })}
            min={200}
            max={k === 'crash1' ? 10000 : 8000}
            step={10}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Resonance (Q)"
            value={d.q}
            onChange={(n) => patch({ q: n })}
            min={0.1}
            max={4}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0003}
            max={0.1}
            step={0.0005}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.04}
            max={clapDecayMax}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
      {!isSample && k === 'cowbell' ? (
        <div className="space-y-2.5">
          <p className={u.bodyDim}>Two detuned square oscillators (metallic body)</p>
          <Row obsidianChrome={obsidianChrome}
            label="Low tone (Hz)"
            value={d.baseHz}
            onChange={(n) => patch({ baseHz: n })}
            min={200}
            max={1200}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="High tone (Hz)"
            value={d.secondHz}
            onChange={(n) => patch({ secondHz: n })}
            min={300}
            max={2000}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="High tone mix"
            value={d.secondMix}
            onChange={(n) => patch({ secondMix: n })}
            min={0}
            max={1.2}
            step={0.02}
            fmt={(n) => n.toFixed(2)}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0001}
            max={0.08}
            step={0.0001}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.02}
            max={0.5}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row obsidianChrome={obsidianChrome}
            label="Level"
            value={d.level}
            onChange={(n) => patch({ level: n })}
            min={0.05}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
        </div>
      ) : null}
    </div>
  )
}
