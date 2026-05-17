import { COMMON_WAVEFORMS } from '../lib/periodicWaves.js'
import { synthChromeUi } from '../lib/synthChromeUi.js'
import { Row } from './FormRow.jsx'

export function Toggle({ label, pressed, onChange, obsidianChrome = false, synthwaveChrome = false }) {
  const on = obsidianChrome
    ? 'border-chrome/50 bg-chrome/10 text-chrome'
    : synthwaveChrome
      ? 'border-pink-500/60 bg-pink-500/12 text-pink-400 shadow-[0_0_12px_rgb(236_72_153_/_0.12)]'
      : 'border-[#39ff14]/50 bg-[#39ff14]/10 text-[#39ff14]'
  const off = obsidianChrome || synthwaveChrome
    ? 'border-hairline bg-surface-container-low text-on-surface'
    : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
  const trackOn = obsidianChrome ? 'bg-chrome/40' : synthwaveChrome ? 'bg-pink-500/40' : 'bg-[#39ff14]/40'
  const trackOff = obsidianChrome ? 'bg-on-surface-variant/40' : synthwaveChrome ? 'bg-surface-variant' : 'bg-zinc-700'

  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={pressed}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm ${
        pressed ? on : off
      }`}
    >
      <span>{label}</span>
      <span
        className={`h-4 w-8 shrink-0 rounded-full p-0.5 transition ${
          pressed ? trackOn : trackOff
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

function AdsrBlock({ adsr, onAdsr, obsidianChrome = false, synthwaveChrome = false }) {
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')
  return (
    <div className="space-y-2.5">
      <p className={u.labelCapsTight}>ADSR</p>
      <div className="space-y-2.5 pl-0">
        <Row
          obsidianChrome={obsidianChrome}
          label="Attack (s)"
          value={adsr.attack}
          onChange={(v) => onAdsr({ ...adsr, attack: v })}
          min={0.005}
          max={1}
          step={0.005}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          obsidianChrome={obsidianChrome}
          label="Decay (s)"
          value={adsr.decay}
          onChange={(v) => onAdsr({ ...adsr, decay: v })}
          min={0.01}
          max={1}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          obsidianChrome={obsidianChrome}
          label="Sustain (level)"
          value={adsr.sustain}
          onChange={(v) => onAdsr({ ...adsr, sustain: v })}
          min={0}
          max={1}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          obsidianChrome={obsidianChrome}
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

function WfBlock({ value, onWaveform, onUserGesture, obsidianChrome = false, synthwaveChrome = false }) {
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')
  return (
    <div>
      <p className={u.labelCaps}>Waveform</p>
      <div className="flex flex-wrap gap-2">
        {COMMON_WAVEFORMS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              onUserGesture?.()
              onWaveform(w.id)
            }}
            className={`max-w-full rounded-lg px-2 py-1.5 text-xs font-medium ${u.pill(value === w.id)}`}
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
  obsidianChrome = false,
  synthwaveChrome = false,
}) {
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')

  if (showEnable && !enabled) {
    return (
      <div className={u.panel}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className={u.h3}>{title}</h3>
          <Toggle
            label="Off / On"
            pressed={!!enabled}
            obsidianChrome={obsidianChrome}
            synthwaveChrome={synthwaveChrome}
            onChange={() => {
              onUserGesture?.()
              onEnabledToggle?.()
            }}
          />
        </div>
        <p className={u.bodyDim}>Off — turn on to mix this layer.</p>
      </div>
    )
  }

  return (
    <div className={u.panelMuted}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className={u.h3}>{title}</h3>
        {showEnable ? (
          <Toggle
            label="On"
            pressed={!!enabled}
            obsidianChrome={obsidianChrome}
            synthwaveChrome={synthwaveChrome}
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
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
        />
      </div>
      <div className="mb-3">
        <AdsrBlock
          adsr={osc.adsr}
          onAdsr={(next) => setOsc((o) => ({ ...o, adsr: next }))}
          obsidianChrome={obsidianChrome}
          synthwaveChrome={synthwaveChrome}
        />
      </div>
      <div>
        <Row
          obsidianChrome={obsidianChrome}
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
        {isPrimary ? <p className={`mt-1 ${u.bodyDim}`}>Fine pitch; 100¢ = one semitone.</p> : null}
      </div>
    </div>
  )
}
