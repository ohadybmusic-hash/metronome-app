/**
 * Each drum voice maps to a rectangle on the shared illustration, as % of
 * the image (0–100, left, top, width, height). Tuned for
 * `src/assets/drum-kit-illustration.png` (2:1-ish layout on black).
 * Adjust here if the artwork changes.
 * @type {Record<'kick'|'snare'|'hat'|'clap'|'ride'|'cowbell'|'crashRide'|'crash1', { l: number, t: number, w: number, h: number }>}
 */
export const ILLUSTRATION_HOTSPOTS = {
  /** Bass drum, center-lower */
  kick: { l: 24, t: 38, w: 52, h: 58 },
  /** Snare, front-left with sticks */
  snare: { l: 4, t: 28, w: 30, h: 40 },
  /** Hi-hat, far left (pair of cymbals) */
  hat: { l: 0, t: 18, w: 22, h: 40 },
  /** Electronic / sample pad, right of kit */
  clap: { l: 68, t: 22, w: 30, h: 34 },
  /** Rack tom, upper center-right */
  ride: { l: 45, t: 6, w: 24, h: 32 },
  /** Small gold bell, crash-ride stand */
  cowbell: { l: 72, t: 2, w: 16, h: 22 },
  /** Large right cymbal (wash / combined) */
  crashRide: { l: 52, t: 0, w: 46, h: 34 },
  /** Upper left cymbal */
  crash1: { l: 0, t: 0, w: 36, h: 30 },
}
