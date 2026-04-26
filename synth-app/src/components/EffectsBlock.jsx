import { useMemo, useState } from 'react'
import { BEAT_OPTIONS, formatDelayPreview } from '../lib/fxMath.js'
import { VOICE_ORDER } from '../lib/drumSamplePlayback.js'
import { getEffectiveReverbTuning } from '../lib/reverbTuning.js'
import { Row } from './FormRow.jsx'

const VOICE_SHORT = {
  kick: 'Kick',
  snare: 'Snare',
  hat: 'Hat',
  clap: 'Clap',
  ride: 'Ride',
  crashRide: 'Wash',
  cowbell: 'Bell',
  crash1: 'Crash',
}

const REVERB_OPTS = [
  { id: 'off', label: 'Off' },
  { id: 'hall', label: 'Hall' },
  { id: 'plate', label: 'Plate' },
  { id: 'digital', label: 'Digital' },
  { id: 'room', label: 'Room' },
]

const DELAY_OPTS = [
  { id: 'off', label: 'Off' },
  { id: 'delay', label: 'Simple' },
  { id: 'double', label: 'Double' },
  { id: 'pingpong', label: 'Ping-pong' },
  { id: 'stereo', label: 'Stereo' },
]

const TIMING_MODES = [
  { id: 'ms', label: 'ms' },
  { id: 's', label: 'sec' },
  { id: 'bpm', label: 'BPM' },
]

const REVERB_SIZE_OPTS = [
  {
    id: 'compact',
    label: 'Compact',
    title:
      'Small space: shorter IR time + nudges length down and damping down (brighter tail).',
  },
  {
    id: 'normal',
    label: 'Normal',
    title: 'Balanced space vs the length and damping sliders.',
  },
  {
    id: 'long',
    label: 'Long',
    title:
      'Larger space: longer IR time + slightly longer and damper tail than Normal.',
  },
  {
    id: 'vast',
    label: 'Vast',
    title:
      'Very large space: longest IR time + stronger length/damp bias (washes of high end).',
  },
]

/** Shown in tooltips; one line. */
const REVERB_TYPE_HINT = {
  off: 'Wet reverb off (convolver silent); delay still works if enabled.',
  hall: 'Large diffuse space; longer, smeared tail. Great for washy mix depth.',
  plate: 'Metallic plate; shimmer, slightly brighter in the high end of the tail.',
  digital: 'Lo-fi, grainy tail; short bias, bit-like texture. Vintage digital vibe.',
  room: 'Small room, early “snap” then decay; feels close and punchy.',
}

/** Shown in the mode guide; matches IR behavior + tuning. */
const REVERB_MODE_GUIDE = {
  off:
    'No reverb: only dry + (optional) delay to the bus. Picks a silent IR; no extra CPU in the reverb line.',
  hall:
    'Big hall IR: each sample in the tail is more correlated (smeared) for a soft wash. Tuning nudges length up and adds damping. Diffusion smears the tail more when raised.',
  plate:
    'Plate-style IR: gentle pitch-y modulation in the body for a shiny character. Slightly “brighter” vs your raw damping than hall/room, from the per-mode nudge + ring depth tied to diffusion.',
  digital:
    'Grainy, stepped character in the tail (inspired by classic rack units). Shorter time bias; diffusion does little. Good for 80s/90s or aggressive texture.',
  room:
    'Extra energy in the first part of the tail (early feel), then a normal decay. Tuning shortens a bit; feels like a small live room, not a stadium.',
}

/** Reverb *space* (Compact–Vast): wall-clock IR scale + `REVERB_SPACE_TUNE` in `reverbTuning.js`. */
const REVERB_SPACE_GUIDE = {
  compact:
    'Shortest max IR time (about 0.4× Normal’s time scale) plus a length–damping nudge toward a smaller, “tighter” room: less stretch on the length slider, slightly brighter in the high end. Good for keeping sense of space without a long smear.',
  normal:
    'The baseline: 1× IR time scale, no space-based offset to your length/damping. Use this to compare the other sizes or to let the reverb type and the sliders do most of the work.',
  long:
    'Larger IR (about 1.75× Normal’s time scale) and a mild nudge so the effective tail is a bit longer and slightly more damped than Normal—bigger “room” without going full ambient wash.',
  vast:
    'Largest IR (about 2.5× Normal’s time scale) with the strongest length/damping nudge: longest bias and more high-frequency tail loss, so it reads as a very big or ambient space. Pairs with Hall or high mix for pads.',
}

export function EffectsBlock({ fx, setFx, onUserGesture, drumKit, setDrumKit, drumMode = false }) {
  const [reverbModeGuideOpen, setReverbModeGuideOpen] = useState(false)
  const [reverbSpaceGuideOpen, setReverbSpaceGuideOpen] = useState(false)
  const isDelayOn = fx.delayType !== 'off'
  const timeMode = fx.delayTimeMode ?? 'ms'
  const bpmForUi = Math.max(40, Math.min(300, Number(fx.bpm) || 120))
  const reverbTuned = useMemo(
    () =>
      fx.reverbType !== 'off' ? getEffectiveReverbTuning(fx) : null,
    [fx],
  )
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3">
      <h3 className="mb-2 text-sm font-semibold text-zinc-200">Time and space</h3>
      <p className="mb-2 text-[11px] text-zinc-500">
        Dry, delay, and reverb in parallel. Each mode and space preset nudges the
        length and damping sliders (see the effective readout). Diffusion shapes
        early energy vs a smoother body in the tail. Rebuilding the IR is cheap when
        you change a control. Delay is off = no echo; BPM for delay time.
      </p>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Reverb
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {REVERB_OPTS.map((o) => (
          <button
            key={o.id}
            type="button"
            title={REVERB_TYPE_HINT[o.id] ?? ''}
            onClick={() => {
              onUserGesture?.()
              setFx((s) => ({ ...s, reverbType: o.id }))
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
              fx.reverbType === o.id
                ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setReverbModeGuideOpen((o) => !o)}
          aria-expanded={reverbModeGuideOpen}
          className="w-full touch-manipulation rounded-md border border-zinc-800/60 bg-zinc-950/40 px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 active:bg-zinc-900/80"
        >
          {reverbModeGuideOpen
            ? 'Hide what each reverb mode does'
            : 'Show what each reverb mode does'}
        </button>
        {reverbModeGuideOpen ? (
          <div className="mt-1.5 rounded-md border border-zinc-800/50 bg-zinc-950/50 px-2 py-1.5">
            <ul className="list-none space-y-1.5 text-[10px] leading-snug text-zinc-500">
              {REVERB_OPTS.map((o) => {
                const active = fx.reverbType === o.id
                return (
                  <li
                    key={o.id}
                    className={active ? 'text-zinc-200' : 'text-zinc-500'}
                  >
                    <span className="font-semibold text-zinc-300">{o.label}</span>
                    {'. '}
                    {REVERB_MODE_GUIDE[o.id] ?? ''}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="mb-3 space-y-2.5">
        <Row
          label="Reverb mix"
          value={fx.reverbMix}
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, reverbMix: v }))
          }}
          min={0}
          max={0.6}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        <Row
          label="Reverb pre-delay (ms)"
          value={fx.reverbPreDelayMs ?? 0}
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, reverbPreDelayMs: v }))
          }}
          min={0}
          max={150}
          step={1}
          fmt={(v) => `${Math.round(v)} ms`}
        />
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Reverb space (IR time scale + length &amp; damping nudge)
        </p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REVERB_SIZE_OPTS.map((o) => (
            <button
              key={o.id}
              type="button"
              title={o.title}
              onClick={() => {
                onUserGesture?.()
                setFx((s) => ({ ...s, reverbSize: o.id }))
              }}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                (fx.reverbSize ?? 'normal') === o.id
                  ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                  : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setReverbSpaceGuideOpen((o) => !o)}
            aria-expanded={reverbSpaceGuideOpen}
            className="w-full touch-manipulation rounded-md border border-zinc-800/60 bg-zinc-950/40 px-2 py-1.5 text-left text-[10px] font-medium text-zinc-400 active:bg-zinc-900/80"
          >
            {reverbSpaceGuideOpen
              ? 'Hide what each reverb space option does'
              : 'Show what each reverb space option does'}
          </button>
          {reverbSpaceGuideOpen ? (
            <div className="mt-1.5 rounded-md border border-zinc-800/50 bg-zinc-950/50 px-2 py-1.5">
              <ul className="list-none space-y-1.5 text-[10px] leading-snug text-zinc-500">
                {REVERB_SIZE_OPTS.map((o) => {
                  const active = (fx.reverbSize ?? 'normal') === o.id
                  return (
                    <li
                      key={o.id}
                      className={active ? 'text-zinc-200' : 'text-zinc-500'}
                    >
                      <span className="font-semibold text-zinc-300">{o.label}</span>
                      {'. '}
                      {REVERB_SPACE_GUIDE[o.id] ?? ''}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <Row
          label="Reverb length"
          value={
            fx.reverbLength != null && Number.isFinite(fx.reverbLength)
              ? fx.reverbLength
              : (fx.reverbDecay ?? 1)
          }
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, reverbLength: v }))
          }}
          min={0.2}
          max={2.4}
          step={0.01}
          fmt={(v) => `${v.toFixed(2)} s scale`}
        />
        <Row
          label="Reverb damping (HF in tail)"
          value={fx.reverbDamping ?? 0.5}
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, reverbDamping: v }))
          }}
          min={0}
          max={1}
          step={0.01}
          fmt={(v) => `${Math.round(v * 100)}%`}
        />
        <Row
          label="Reverb diffusion"
          value={fx.reverbDiffusion ?? 0.5}
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, reverbDiffusion: v }))
          }}
          min={0}
          max={1}
          step={0.01}
          fmt={(v) => `${Math.round(v * 100)}%`}
        />
        {reverbTuned ? (
          <p className="text-[10px] leading-snug text-zinc-500">
            Effective: length scale <span className="text-zinc-300">{reverbTuned.length.toFixed(2)}</span>
            {', '}
            damping <span className="text-zinc-300">
              {Math.round(reverbTuned.damping * 100)}%
            </span>
            {', '}
            diffusion <span className="text-zinc-300">
              {Math.round(reverbTuned.diffusion * 100)}%
            </span>{' '}
            (sliders + mode + space; space also scales max IR time)
          </p>
        ) : null}
      </div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Delay
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {DELAY_OPTS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onUserGesture?.()
              setFx((s) => ({ ...s, delayType: o.id }))
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
              fx.delayType === o.id
                ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        <Row
          label="Delay mix"
          value={fx.delayMix}
          onChange={(v) => {
            onUserGesture?.()
            setFx((s) => ({ ...s, delayMix: v }))
          }}
          min={0}
          max={0.55}
          step={0.01}
          fmt={(v) => v.toFixed(2)}
        />
        {isDelayOn ? (
          <>
            <p className="pt-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Delay time source
            </p>
            <div className="mb-1 flex flex-wrap gap-1.5">
              {TIMING_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    setFx((s) => ({ ...s, delayTimeMode: m.id }))
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    timeMode === m.id
                      ? 'bg-[#39ff14]/20 text-[#39ff14] ring-1 ring-[#39ff14]/50'
                      : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-zinc-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {timeMode === 'bpm' ? (
              <>
                <Row
                  label="BPM"
                  value={Number(fx.bpm) || 120}
                  onChange={(v) => {
                    onUserGesture?.()
                    setFx((s) => ({ ...s, bpm: v }))
                  }}
                  min={40}
                  max={300}
                  step={0.1}
                  fmt={(v) => `${v.toFixed(1)} BPM`}
                />
                <div>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>Note vs beat (quarter=1)</span>
                  </div>
                  <select
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950/90 py-2 pl-2 pr-8 text-sm text-zinc-200"
                    value={fx.bpmDivision ?? '1/8'}
                    onChange={(e) => {
                      onUserGesture?.()
                      setFx((s) => ({ ...s, bpmDivision: e.target.value }))
                    }}
                    aria-label="BPM note division"
                  >
                    {BEAT_OPTIONS.map((b) => {
                      const sec = (60 / bpmForUi) * b.mult
                      return (
                        <option key={b.id} value={b.id}>
                          {b.label} = {sec.toFixed(3)} s @ {bpmForUi.toFixed(0)}{' '}
                          BPM
                        </option>
                      )
                    })}
                  </select>
                </div>
              </>
            ) : null}
            {timeMode === 'ms' ? (
              <Row
                label="Delay (milliseconds)"
                value={fx.delayTimeMs ?? 250}
                onChange={(v) => {
                  onUserGesture?.()
                  setFx((s) => ({ ...s, delayTimeMs: v }))
                }}
                min={10}
                max={2000}
                step={1}
                fmt={(v) => `${Math.round(v)} ms`}
              />
            ) : null}
            {timeMode === 's' ? (
              <Row
                label="Delay (seconds)"
                value={fx.delayTimeS ?? 0.25}
                onChange={(v) => {
                  onUserGesture?.()
                  setFx((s) => ({ ...s, delayTimeS: v }))
                }}
                min={0.01}
                max={2.2}
                step={0.005}
                fmt={(v) => `${v.toFixed(3)} s`}
              />
            ) : null}
            <p className="text-[11px] text-zinc-500">
              Computed: {formatDelayPreview(fx)}
            </p>
            <Row
              label="Delay feedback"
              value={fx.delayFeedback}
              onChange={(v) => {
                onUserGesture?.()
                setFx((s) => ({ ...s, delayFeedback: v }))
              }}
              min={0}
              max={0.9}
              step={0.01}
              fmt={(v) => v.toFixed(2)}
            />
          </>
        ) : null}
      </div>
      {drumMode && drumKit && setDrumKit ? (
        <div className="mt-3 border-t border-zinc-800/60 pt-3">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Drums to FX
          </p>
          <p className="mb-2 text-[10px] text-zinc-600">
            Per pad: send through delay and reverb, or only dry to the main output (bypass
            this block).
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {VOICE_ORDER.map((key) => {
              const toFx = drumKit[key]?.sendFx !== false
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    setDrumKit((k) => {
                      const cur = k[key]
                      if (!cur) return k
                      return {
                        ...k,
                        [key]: { ...cur, sendFx: !toFx },
                      }
                    })
                  }}
                  className={`flex flex-col items-stretch gap-0.5 rounded-md border px-1.5 py-1.5 text-left ${
                    toFx
                      ? 'border-[#39ff14]/40 bg-[#39ff14]/8 text-zinc-200'
                      : 'border-zinc-800 bg-zinc-950/80 text-zinc-500'
                  }`}
                  aria-pressed={toFx}
                  title={toFx ? 'Sent through time and space' : 'Dry (no shared FX)'}
                >
                  <span className="text-[10px] font-medium text-zinc-300">
                    {VOICE_SHORT[key] ?? key}
                  </span>
                  <span
                    className={`text-[9px] font-mono uppercase tracking-wide ${
                      toFx ? 'text-[#39ff14]/90' : 'text-zinc-600'
                    }`}
                  >
                    {toFx ? 'FX' : 'Dry'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
