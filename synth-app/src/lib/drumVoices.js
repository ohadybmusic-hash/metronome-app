/** UI labels and pad colors: order matches `VOICE_ORDER` / active index 0–7. */
export const DRUM_VOICES = [
  { key: 'kick', label: 'Kick', color: '#ef4444' },
  { key: 'snare', label: 'Snare', color: '#22c55e' },
  { key: 'hat', label: 'Hi-hat', color: '#eab308' },
  { key: 'clap', label: 'Clap', color: '#06b6d4' },
  { key: 'ride', label: 'Ride', color: '#65a30d' },
  { key: 'cowbell', label: 'Cowbell', color: '#ea580c' },
  { key: 'crashRide', label: 'Crash-ride', color: '#a855f7' },
  { key: 'crash1', label: 'Crash', color: '#c026d3' },
]

/**
 * 2×4 physical pad order (L→R, T→B), same as `DrumPadGrid` CSS `grid` fill order.
 * `i` = voice index; `label` = short pad face text.
 */
export const DRUM_PAD_LAYOUT = [
  { i: 7, label: 'CR1' },
  { i: 6, label: 'C/RD' },
  { i: 5, label: 'COWB' },
  { i: 4, label: 'RIDE' },
  { i: 3, label: 'CLP' },
  { i: 2, label: 'HAT' },
  { i: 0, label: 'KICK' },
  { i: 1, label: 'SNR' },
]
