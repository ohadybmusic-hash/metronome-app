import {
  createInitialPart,
  DEFAULT_FX_SYNTH,
  PART_COUNT,
} from './synthDefaults.js'

function fourParts(part) {
  return Array.from({ length: PART_COUNT }, () =>
    JSON.parse(JSON.stringify(part)),
  )
}

const base = createInitialPart()

const fx = (over) => ({ ...DEFAULT_FX_SYNTH, reverbDiffusion: 0.5, ...over })

/**
 * Eight one-tap starter patches (all four parts share the same timbre). Grand
 * piano, string ensemble, and solo strings use **bundled MP3 multi-samples**
 * (see `lib/instrumentSamples.js`); other options use the virtual-analog engine.
 */
export const SYNTH_FACTORY_PRESETS = [
  {
    id: 'synth_supersaw_lead',
    label: 'Supersaw lead',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        osc1: {
          waveform: 'saw_bright',
          adsr: { attack: 0.001, decay: 0.2, sustain: 0.52, release: 0.18 },
          detune: -8,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.001, decay: 0.18, sustain: 0.5, release: 0.16 },
          detune: 0,
        },
        osc3: {
          ...base.osc3,
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.001, decay: 0.16, sustain: 0.48, release: 0.16 },
          detune: 8,
        },
      }),
      filterNorm: 0.56,
      fx: fx({
        reverbType: 'plate',
        reverbMix: 0.2,
        reverbSize: 'normal',
        reverbLength: 0.72,
        reverbDamping: 0.5,
        delayType: 'delay',
        delayMix: 0.14,
        delayTimeMs: 78,
        delayFeedback: 0.22,
      }),
    }),
  },
  {
    id: 'synth_warm_pad',
    label: 'Warm pad',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        osc1: {
          waveform: 'saw_soft',
          adsr: { attack: 0.45, decay: 0.22, sustain: 0.7, release: 0.82 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'sine',
          adsr: { attack: 0.5, decay: 0.2, sustain: 0.68, release: 0.88 },
          detune: 5,
        },
        osc3: {
          ...base.osc3,
          enabled: true,
          waveform: 'triangle',
          adsr: { attack: 0.48, decay: 0.2, sustain: 0.66, release: 0.85 },
          detune: -4,
        },
      }),
      filterNorm: 0.3,
      fx: fx({
        reverbType: 'hall',
        reverbMix: 0.28,
        reverbSize: 'long',
        reverbLength: 0.82,
        reverbDamping: 0.44,
        delayType: 'delay',
        delayMix: 0.08,
        delayTimeMs: 115,
        delayFeedback: 0.2,
      }),
    }),
  },
  {
    id: 'synth_grand_piano',
    label: 'Grand piano',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        instrumentSource: 'sample',
        samplePack: 'grand_piano',
        osc1: {
          waveform: 'triangle',
          adsr: { attack: 0.001, decay: 0.22, sustain: 0.3, release: 0.22 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.002, decay: 0.16, sustain: 0.24, release: 0.18 },
          detune: -3,
        },
        osc3: { ...base.osc3, enabled: false },
      }),
      filterNorm: 0.57,
      fx: fx({
        reverbType: 'room',
        reverbMix: 0.2,
        reverbSize: 'normal',
        reverbLength: 0.7,
        reverbDamping: 0.48,
        delayType: 'delay',
        delayMix: 0.08,
        delayTimeMs: 72,
        delayFeedback: 0.14,
      }),
    }),
  },
  {
    id: 'synth_pluck',
    label: 'Pluck',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        osc1: {
          waveform: 'sine',
          adsr: { attack: 0.001, decay: 0.4, sustain: 0.12, release: 0.32 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_digital',
          adsr: { attack: 0.001, decay: 0.2, sustain: 0.08, release: 0.25 },
          detune: 5,
        },
        osc3: { ...base.osc3, enabled: false },
      }),
      filterNorm: 0.58,
      fx: fx({
        reverbType: 'plate',
        reverbMix: 0.2,
        reverbSize: 'compact',
        reverbLength: 0.7,
        reverbDamping: 0.48,
        delayType: 'pingpong',
        delayMix: 0.18,
        delayTimeMs: 105,
        delayFeedback: 0.24,
      }),
    }),
  },
  {
    id: 'synth_electric_keys',
    label: 'Electric keys',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        osc1: {
          waveform: 'sine',
          adsr: { attack: 0.002, decay: 0.18, sustain: 0.5, release: 0.2 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.006, decay: 0.16, sustain: 0.46, release: 0.24 },
          detune: 3,
        },
        osc3: { ...base.osc3, enabled: false },
      }),
      filterNorm: 0.5,
      fx: fx({
        reverbType: 'plate',
        reverbMix: 0.24,
        reverbSize: 'normal',
        reverbDamping: 0.5,
        delayType: 'delay',
        delayMix: 0.1,
        delayTimeMs: 68,
        delayFeedback: 0.16,
      }),
    }),
  },
  {
    id: 'synth_string_ensemble',
    label: 'String ensemble',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        instrumentSource: 'sample',
        samplePack: 'string_ensemble',
        osc1: {
          waveform: 'saw_soft',
          adsr: { attack: 0.32, decay: 0.2, sustain: 0.7, release: 0.78 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'sine',
          adsr: { attack: 0.38, decay: 0.2, sustain: 0.68, release: 0.82 },
          detune: 6,
        },
        osc3: {
          ...base.osc3,
          enabled: true,
          waveform: 'triangle',
          adsr: { attack: 0.36, decay: 0.2, sustain: 0.66, release: 0.8 },
          detune: -3,
        },
      }),
      filterNorm: 0.33,
      fx: fx({
        reverbType: 'hall',
        reverbMix: 0.3,
        reverbSize: 'long',
        reverbLength: 0.78,
        reverbDamping: 0.44,
        delayType: 'delay',
        delayMix: 0.1,
        delayTimeMs: 95,
        delayFeedback: 0.18,
      }),
    }),
  },
  {
    id: 'synth_solo_strings',
    label: 'Solo strings',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        instrumentSource: 'sample',
        samplePack: 'solo_strings',
        osc1: {
          waveform: 'saw_hall',
          adsr: { attack: 0.1, decay: 0.18, sustain: 0.62, release: 0.45 },
          detune: 0,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.12, decay: 0.16, sustain: 0.58, release: 0.48 },
          detune: 5,
        },
        osc3: { ...base.osc3, enabled: false },
      }),
      filterNorm: 0.4,
      fx: fx({
        reverbType: 'hall',
        reverbMix: 0.28,
        reverbSize: 'normal',
        reverbLength: 0.8,
        reverbDamping: 0.46,
        delayType: 'off',
        delayMix: 0,
      }),
    }),
  },
  {
    id: 'synth_shimmer_pad',
    label: 'Shimmer pad',
    getPatch: () => ({
      parts: fourParts({
        ...base,
        osc1: {
          waveform: 'saw_hall',
          adsr: { attack: 0.55, decay: 0.2, sustain: 0.72, release: 0.95 },
          detune: -3,
        },
        osc2: {
          enabled: true,
          waveform: 'saw_soft',
          adsr: { attack: 0.58, decay: 0.18, sustain: 0.7, release: 0.98 },
          detune: 6,
        },
        osc3: {
          ...base.osc3,
          enabled: true,
          waveform: 'sine',
          adsr: { attack: 0.6, decay: 0.2, sustain: 0.68, release: 1.0 },
          detune: 0,
        },
      }),
      filterNorm: 0.4,
      fx: fx({
        reverbType: 'digital',
        reverbMix: 0.3,
        reverbSize: 'vast',
        reverbLength: 0.9,
        reverbDamping: 0.36,
        delayType: 'pingpong',
        delayMix: 0.12,
        delayTimeMs: 130,
        delayFeedback: 0.26,
      }),
    }),
  },
]
