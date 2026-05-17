/** @typedef {{ startHz: number, endHz: number, sweepS: number, attackS: number, bodyS: number, level: number }} KickParams */
/** Sine "drum head" + bandpassed noise. */
/** @typedef {{ bodyHz: number, bodyLevel: number, bodyDecayS: number, snapHz: number, snapQ: number, noiseAttackS: number, noiseDecayS: number, level: number }} SnareParams */
/** @typedef {{ highpassHz: number, q: number, attackS: number, decayS: number, level: number }} HatParams */
/** @typedef {{ bandHz: number, q: number, attackS: number, decayS: number, level: number }} ClapParams */
/** @typedef {{ baseHz: number, secondHz: number, secondMix: number, attackS: number, decayS: number, level: number }} CowbellParams */
/**
 * @typedef {{
 *   kick: object,
 *   snare: object,
 *   hat: object,
 *   clap: object,
 *   ride: object,
 *   crashRide: object,
 *   cowbell: object,
 *   crash1: object,
 * }} DrumKit
 */

/**
 * @typedef {'synth' | 'sample'} DrumSource
 * Each voice: `source` + `sampleRate` (when using file) + `sampleName` (UI only).
 */

const voice = (o) => ({
  source: /** @type {'synth'} */ ('synth'),
  sampleName: '',
  sampleRate: 1,
  /** Sample-only: one-shot envelope decay in seconds. */
  sampleDecayS: 0.35,
  /** 0..1 amount sent into shared FX bus (delay + reverb). */
  sendFxAmount: 1,
  /** When false, this pad bypasses shared delay & reverb and goes direct to main output. */
  sendFx: true,
  ...o,
})

export const DEFAULT_DRUM_KIT = {
  kick: voice({
    startHz: 150,
    endHz: 36,
    sweepS: 0.09,
    attackS: 0.0024,
    bodyS: 0.38,
    level: 0.92,
  }),
  snare: voice({
    bodyHz: 185,
    bodyLevel: 0.46,
    bodyDecayS: 0.072,
    snapHz: 2200,
    snapQ: 0.85,
    noiseAttackS: 0.0005,
    noiseDecayS: 0.16,
    level: 0.82,
  }),
  hat: voice({
    highpassHz: 8200,
    q: 0.65,
    attackS: 0.0007,
    decayS: 0.085,
    level: 0.44,
  }),
  clap: voice({
    bandHz: 1650,
    q: 1.0,
    attackS: 0.0009,
    decayS: 0.105,
    level: 0.68,
  }),
  ride: voice({
    highpassHz: 6200,
    q: 0.55,
    attackS: 0.0008,
    decayS: 0.26,
    level: 0.46,
  }),
  /** Washier “crash/ride” (noise + high-pass) */
  crashRide: voice({
    highpassHz: 5600,
    q: 0.5,
    attackS: 0.001,
    decayS: 0.5,
    level: 0.42,
  }),
  cowbell: voice({
    baseHz: 560,
    secondHz: 840,
    secondMix: 0.5,
    attackS: 0.0004,
    decayS: 0.11,
    level: 0.66,
  }),
  /** One-shot noise crash (longer bandpass tail than clap) */
  crash1: voice({
    bandHz: 6800,
    q: 0.62,
    attackS: 0.0007,
    decayS: 0.7,
    level: 0.48,
  }),
}

export function createInitialDrumKit() {
  return JSON.parse(JSON.stringify(DEFAULT_DRUM_KIT))
}

export function createEmptyDrumSampleBuffers() {
  return {
    kick: null,
    snare: null,
    hat: null,
    clap: null,
    ride: null,
    cowbell: null,
    crashRide: null,
    crash1: null,
  }
}
