import { useRef, useState } from 'react'
import { DRUM_STYLE_PRESETS } from '../lib/drumSamplePlayback.js'
import { DRUM_PAD_LAYOUT, DRUM_VOICES } from '../lib/drumVoices.js'
import { Row } from './FormRow.jsx'

export function DrumEngineBlock({
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
    <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Drum engine
      </p>
      <p className="mb-2 text-[11px] text-zinc-500">
        Choose a <strong className="font-medium text-zinc-400">style</strong> for
        synthesizer kits, or load a <strong className="font-medium text-zinc-400">WAV / MP3</strong> per pad. Samples stay in memory until you clear them or load a preset (re-import files after refresh).
      </p>
      <div className="mb-3">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Style preset (synthesis)
        </label>
        <select
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 py-2 pl-2 pr-8 text-sm text-zinc-200"
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
        <p className="mt-1 text-[10px] text-zinc-600">{styleInfo?.description}</p>
      </div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Pads (same layout as the keyboard row)
      </p>
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
                  ? 'ring-1 ring-zinc-500'
                  : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
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
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        {v.label} — sound
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            clearDrumSample(k)
          }}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
            !isSample
              ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
              : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
          }`}
        >
          Synthesized
        </button>
        <button
          type="button"
          onClick={() => {
            onUserGesture?.()
            patch({ source: 'sample' })
          }}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
            isSample
              ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
              : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
          }`}
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
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"
            >
              Choose audio file…
            </button>
            <span className="truncate text-[11px] text-zinc-500">
              {d.sampleName || (hasBuffer ? 'Loaded' : 'No file loaded')}
            </span>
          </div>
          <p className="text-[10px] text-zinc-600">
            New BufferSource on each hit. If “Sample” is on but no file is loaded, the synth sound plays instead.
          </p>
          <Row
            label="Playback speed"
            value={d.sampleRate ?? 1}
            onChange={(n) => patch({ sampleRate: n })}
            min={0.5}
            max={2}
            step={0.05}
            fmt={(n) => `${n.toFixed(2)}×`}
          />
          <Row
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
          <Row
            label="Start pitch (Hz)"
            value={d.startHz}
            onChange={(n) => patch({ startHz: n })}
            min={30}
            max={400}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="End pitch (Hz)"
            value={d.endHz}
            onChange={(n) => patch({ endHz: n })}
            min={20}
            max={200}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="Pitch sweep"
            value={d.sweepS}
            onChange={(n) => patch({ sweepS: n })}
            min={0.02}
            max={0.5}
            step={0.005}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
            label="Amp attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0005}
            max={0.1}
            step={0.0005}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row
            label="Body / decay"
            value={d.bodyS}
            onChange={(n) => patch({ bodyS: n })}
            min={0.05}
            max={1.2}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
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
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            Body (sine)
          </p>
          <Row
            label="Body pitch"
            value={d.bodyHz}
            onChange={(n) => patch({ bodyHz: n })}
            min={80}
            max={500}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="Body amount"
            value={d.bodyLevel}
            onChange={(n) => patch({ bodyLevel: n })}
            min={0}
            max={1}
            step={0.01}
            fmt={(n) => n.toFixed(2)}
          />
          <Row
            label="Body decay"
            value={d.bodyDecayS}
            onChange={(n) => patch({ bodyDecayS: n })}
            min={0.012}
            max={0.28}
            step={0.005}
            fmt={(n) => `${n.toFixed(3)} s`}
          />
          <p className="pt-1 text-[10px] font-medium uppercase tracking-widest text-zinc-600">
            Wire / snap (noise)
          </p>
          <Row
            label="Snap center"
            value={d.snapHz}
            onChange={(n) => patch({ snapHz: n })}
            min={400}
            max={8000}
            step={25}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="Snap focus (Q)"
            value={d.snapQ}
            onChange={(n) => patch({ snapQ: n })}
            min={0.2}
            max={4}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row
            label="Noise attack"
            value={d.noiseAttackS}
            onChange={(n) => patch({ noiseAttackS: n })}
            min={0.0002}
            max={0.05}
            step={0.0002}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row
            label="Noise decay"
            value={d.noiseDecayS}
            onChange={(n) => patch({ noiseDecayS: n })}
            min={0.04}
            max={0.55}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
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
          <p className="text-[10px] text-zinc-600">
            Noise + high-pass (hi-hat, ride, or washy crash-ride)
          </p>
          <Row
            label="High-pass (Hz)"
            value={d.highpassHz}
            onChange={(n) => patch({ highpassHz: n })}
            min={2000}
            max={15000}
            step={50}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="Resonance (Q)"
            value={d.q}
            onChange={(n) => patch({ q: n })}
            min={0.1}
            max={3}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0002}
            max={0.1}
            step={0.0002}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.02}
            max={cymDecayMax}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
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
          <p className="text-[10px] text-zinc-600">
            {k === 'crash1'
              ? 'Noise + bandpass (long crash; higher decay range)'
              : 'Noise + bandpass (hand clap)'}
          </p>
          <Row
            label="Bandpass (Hz)"
            value={d.bandHz}
            onChange={(n) => patch({ bandHz: n })}
            min={200}
            max={k === 'crash1' ? 10000 : 8000}
            step={10}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="Resonance (Q)"
            value={d.q}
            onChange={(n) => patch({ q: n })}
            min={0.1}
            max={4}
            step={0.05}
            fmt={(n) => n.toFixed(2)}
          />
          <Row
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0003}
            max={0.1}
            step={0.0005}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.04}
            max={clapDecayMax}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
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
          <p className="text-[10px] text-zinc-600">Two detuned square oscillators (metallic body)</p>
          <Row
            label="Low tone (Hz)"
            value={d.baseHz}
            onChange={(n) => patch({ baseHz: n })}
            min={200}
            max={1200}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="High tone (Hz)"
            value={d.secondHz}
            onChange={(n) => patch({ secondHz: n })}
            min={300}
            max={2000}
            step={1}
            fmt={(n) => `${Math.round(n)} Hz`}
          />
          <Row
            label="High tone mix"
            value={d.secondMix}
            onChange={(n) => patch({ secondMix: n })}
            min={0}
            max={1.2}
            step={0.02}
            fmt={(n) => n.toFixed(2)}
          />
          <Row
            label="Attack"
            value={d.attackS}
            onChange={(n) => patch({ attackS: n })}
            min={0.0001}
            max={0.08}
            step={0.0001}
            fmt={(n) => `${(n * 1000).toFixed(0)} ms`}
          />
          <Row
            label="Decay"
            value={d.decayS}
            onChange={(n) => patch({ decayS: n })}
            min={0.02}
            max={0.5}
            step={0.01}
            fmt={(n) => `${n.toFixed(2)} s`}
          />
          <Row
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
