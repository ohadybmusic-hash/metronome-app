import { COMMON_WAVEFORMS } from '../lib/periodicWaves.js'
import { Row } from './FormRow.jsx'

export function Toggle({ label, pressed, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={pressed}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
        pressed
          ? 'border-[#39ff14]/50 bg-[#39ff14]/10 text-[#39ff14]'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
      }`}
    >
      <span>{label}</span>
      <span
        className={`h-4 w-8 shrink-0 rounded-full p-0.5 transition ${
          pressed ? 'bg-[#39ff14]/40' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`block h-3 w-3 rounded-full bg-white transition ${
            pressed ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  )
}

function AdsrBlock({ adsr, onAdsr }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        ADSR
      </p>
      <div className="space-y-2.5 pl-0">
        <Row
          label="Attack (s)"
          value={adsr.attack}
          onChange={(v) => onAdsr({ ...adsr, attack: v })}
          min={0.005}
          max={1}
          step={0.005}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          label="Decay (s)"
          value={adsr.decay}
          onChange={(v) => onAdsr({ ...adsr, decay: v })}
          min={0.01}
          max={1}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          label="Sustain (level)"
          value={adsr.sustain}
          onChange={(v) => onAdsr({ ...adsr, sustain: v })}
          min={0}
          max={1}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          label="Release (s)"
          value={adsr.release}
          onChange={(v) => onAdsr({ ...adsr, release: v })}
          min={0.01}
          max={2}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
      </div>
    </div>
  )
}

function WfBlock({ value, onWaveform, onUserGesture }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Waveform
      </p>
      <div className="flex flex-wrap gap-2">
        {COMMON_WAVEFORMS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              onUserGesture?.()
              onWaveform(w.id)
            }}
            className={`max-w-full rounded-lg px-2 py-1.5 text-xs font-medium ${
              value === w.id
                ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function OscPanel({
  title,
  showEnable,
  enabled,
  onEnabledToggle,
  osc,
  setOsc,
  onUserGesture,
  isPrimary,
}) {
  if (showEnable && !enabled) {
    return (
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
          <Toggle
            label="Off / On"
            pressed={!!enabled}
            onChange={() => {
              onUserGesture?.()
              onEnabledToggle?.()
            }}
          />
        </div>
        <p className="text-[11px] text-zinc-600">
          Off — turn on to mix this layer.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        {showEnable ? (
          <Toggle
            label="On"
            pressed={!!enabled}
            onChange={() => {
              onUserGesture?.()
              onEnabledToggle?.()
            }}
          />
        ) : null}
      </div>
      <div className="mb-3">
        <WfBlock
          value={osc.waveform}
          onWaveform={(w) => {
            setOsc((o) => ({ ...o, waveform: w }))
          }}
          onUserGesture={onUserGesture}
        />
      </div>
      <div className="mb-3">
        <AdsrBlock
          adsr={osc.adsr}
          onAdsr={(next) => setOsc((o) => ({ ...o, adsr: next }))}
        />
      </div>
      <div>
        <Row
          label="Detune (cents)"
          value={osc.detune}
          onChange={(v) => {
            onUserGesture?.()
            setOsc((o) => ({ ...o, detune: v }))
          }}
          min={-50}
          max={50}
          step={1}
          fmt={(v) => `${v > 0 ? '+' : ''}${v}¢`}
        />
        {isPrimary ? (
          <p className="mt-1 text-[10px] text-zinc-600">
            Fine pitch; 100¢ = one semitone.
          </p>
        ) : null}
      </div>
    </div>
  )
}
