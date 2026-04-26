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
  /** When false, this pad bypasses shared delay & reverb and goes direct to main output. */
  sendFx: true,
  ...o,
})

export const DEFAULT_DRUM_KIT = {
  kick: voice({
    startHz: 150,
    endHz: 40,
    sweepS: 0.1,
    attackS: 0.003,
    bodyS: 0.32,
    level: 0.92,
  }),
  snare: voice({
    bodyHz: 200,
    bodyLevel: 0.38,
    bodyDecayS: 0.055,
    snapHz: 1950,
    snapQ: 0.9,
    noiseAttackS: 0.0006,
    noiseDecayS: 0.2,
    level: 0.82,
  }),
  hat: voice({
    highpassHz: 7000,
    q: 0.7,
    attackS: 0.0008,
    decayS: 0.1,
    level: 0.5,
  }),
  clap: voice({
    bandHz: 1500,
    q: 1.1,
    attackS: 0.001,
    decayS: 0.12,
    level: 0.7,
  }),
  ride: voice({
    highpassHz: 5200,
    q: 0.6,
    attackS: 0.0009,
    decayS: 0.3,
    level: 0.48,
  }),
  /** Washier “crash/ride” (noise + high-pass) */
  crashRide: voice({
    highpassHz: 4800,
    q: 0.5,
    attackS: 0.0011,
    decayS: 0.55,
    level: 0.44,
  }),
  cowbell: voice({
    baseHz: 540,
    secondHz: 807,
    secondMix: 0.52,
    attackS: 0.0004,
    decayS: 0.1,
    level: 0.7,
  }),
  /** One-shot noise crash (longer bandpass tail than clap) */
  crash1: voice({
    bandHz: 6200,
    q: 0.65,
    attackS: 0.0008,
    decayS: 0.75,
    level: 0.5,
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
