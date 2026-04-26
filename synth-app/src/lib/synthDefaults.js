export const DEFAULT_ADSR = {
  attack: 0.02,
  decay: 0.15,
  sustain: 0.55,
  release: 0.2,
}

/** Piano / synth: light room + short delay (switching to Piano restores this unless user changed without switching). */
export const DEFAULT_FX_SYNTH = {
  reverbType: 'room',
  reverbMix: 0.2,
  reverbPreDelayMs: 0,
  reverbSize: 'compact',
  reverbLength: 0.85,
  reverbDamping: 0.45,
  reverbDiffusion: 0.5,
  delayType: 'delay',
  delayTimeMode: 'ms',
  delayTimeMs: 100,
  delayTimeS: 0.1,
  bpm: 120,
  bpmDivision: '1/8',
  delayFeedback: 0.28,
  delayMix: 0.2,
}

/** Drum mode: time & space off until the user turns them on. */
export const DEFAULT_FX_DRUM = {
  reverbType: 'off',
  reverbMix: 0,
  reverbPreDelayMs: 0,
  reverbSize: 'normal',
  reverbLength: 1.1,
  reverbDamping: 0.48,
  reverbDiffusion: 0.5,
  delayType: 'off',
  delayTimeMode: 'ms',
  delayTimeMs: 100,
  delayTimeS: 0.1,
  bpm: 120,
  bpmDivision: '1/8',
  delayFeedback: 0.28,
  delayMix: 0,
}

/** Preset merge baseline (same as synth / piano). */
export const DEFAULT_FX = DEFAULT_FX_SYNTH

export const PART_COUNT = 4

function createInitialOsc1() {
  return {
    waveform: 'sawtooth',
    adsr: { ...DEFAULT_ADSR },
    detune: 0,
  }
}

function createInitialOsc2() {
  return {
    enabled: false,
    waveform: 'sawtooth',
    adsr: { ...DEFAULT_ADSR },
    detune: -4,
  }
}

function createInitialOsc3() {
  return {
    enabled: false,
    waveform: 'sine',
    adsr: { ...DEFAULT_ADSR },
    detune: 5,
  }
}

/** One timbre: three detuned layers (optional bundled samples — see `instrumentSamples.js`). */
export function createInitialPart() {
  return {
    osc1: createInitialOsc1(),
    osc2: createInitialOsc2(),
    osc3: createInitialOsc3(),
    instrumentSource: 'synth',
    samplePack: null,
  }
}
