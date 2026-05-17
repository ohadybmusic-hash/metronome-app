/**
 * Named pad hits (rim, toms, shaker, …) synthesized from the **current** drum kit.
 * Genre / style presets replace `kit` via `getStyleKit`, so these follow the same character.
 */

import { DEFAULT_DRUM_KIT } from './drumKitDefaults.js'
import {
  playKick,
  playHiHat,
  playRimShot,
  playShakerLayers,
  playSnare,
  playStabHit,
  playHatChick,
  playMelodicTom,
  playPercCowClick,
  playWideNoiseHit,
  playFxWashPad,
} from './drumSynthesis.js'

/** @typedef {'rim'|'shaker'|'noise_hit'|'tom_hi'|'tom_mid'|'tom_lo'|'stab'|'pedal_chick'|'hat_closed'|'hat_open'|'kick_1'|'kick_2'|'perc_click'|'fx_wash'} DrumAuxId */

/** Which main editor voice (0–7) to highlight when this aux pad fires. */
export const DRUM_AUX_EDITOR_INDEX = /** @type {Record<DrumAuxId, number>} */ ({
  rim: 1,
  shaker: 2,
  noise_hit: 2,
  tom_hi: 0,
  tom_mid: 0,
  tom_lo: 0,
  stab: 3,
  pedal_chick: 2,
  hat_closed: 2,
  hat_open: 2,
  kick_1: 0,
  kick_2: 0,
  perc_click: 5,
  fx_wash: 6,
})

/** @param {DrumAuxId} id */
export function drumAuxHumanLabel(id) {
  switch (id) {
    case 'rim':
      return 'Rim / side stick'
    case 'shaker':
      return 'Shaker'
    case 'noise_hit':
      return 'Noise burst'
    case 'tom_hi':
      return 'High tom'
    case 'tom_mid':
      return 'Mid tom'
    case 'tom_lo':
      return 'Low tom'
    case 'stab':
      return 'Stab'
    case 'pedal_chick':
      return 'Pedal hi-hat'
    case 'hat_closed':
      return 'Closed hi-hat'
    case 'hat_open':
      return 'Open hi-hat'
    case 'kick_1':
      return 'Kick hit (1)'
    case 'kick_2':
      return 'Kick hit (2)'
    case 'perc_click':
      return 'Percussion click'
    case 'fx_wash':
      return 'Cymbal wash'
    default:
      return id
  }
}

function auxHaptic(id) {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    switch (id) {
      case 'rim':
      case 'perc_click':
        navigator.vibrate([18, 6, 16])
        break
      case 'shaker':
      case 'noise_hit':
      case 'pedal_chick':
      case 'hat_closed':
      case 'hat_open':
        navigator.vibrate(4)
        break
      case 'kick_1':
      case 'kick_2':
        navigator.vibrate([48, 30, 52])
        break
      case 'tom_hi':
      case 'tom_mid':
      case 'tom_lo':
        navigator.vibrate([32, 12, 28])
        break
      case 'stab':
        navigator.vibrate([20, 8, 18])
        break
      case 'fx_wash':
        navigator.vibrate([8, 5, 10])
        break
      default:
        break
    }
  } catch {
    /* */
  }
}

/**
 * @param {AudioContext} ctx
 * @param {AudioNode} dest
 * @param {number} t0
 * @param {import('./drumKitDefaults.js').DrumKit} kit
 * @param {DrumAuxId} auxId
 */
export function playAuxDrumPad(ctx, dest, t0, kit, auxId) {
  const k = kit?.kick ? kit : DEFAULT_DRUM_KIT
  auxHaptic(auxId)
  switch (auxId) {
    case 'rim':
      playRimShot(ctx, dest, t0, k.snare)
      return
    case 'shaker':
      playShakerLayers(ctx, dest, t0, k.hat)
      return
    case 'noise_hit':
      playWideNoiseHit(ctx, dest, t0, k.hat)
      return
    case 'tom_hi':
      playMelodicTom(ctx, dest, t0, k.kick, 'hi')
      return
    case 'tom_mid':
      playMelodicTom(ctx, dest, t0, k.kick, 'mid')
      return
    case 'tom_lo':
      playMelodicTom(ctx, dest, t0, k.kick, 'lo')
      return
    case 'stab':
      playStabHit(ctx, dest, t0, k.clap)
      return
    case 'pedal_chick':
      playHatChick(ctx, dest, t0, k.hat)
      return
    case 'hat_closed':
      playHatChick(ctx, dest, t0, k.hat)
      return
    case 'hat_open': {
      playHiHat(ctx, dest, t0, {
        ...k.hat,
        attackS: Math.min(0.01, k.hat.attackS * 0.9),
        decayS: k.hat.decayS * 2.15,
        highpassHz: k.hat.highpassHz * 0.86,
        q: k.hat.q * 0.92,
        level: Math.min(1, k.hat.level * 0.95),
      })
      return
    }
    case 'kick_1':
      playKick(ctx, dest, t0, k.kick)
      return
    case 'kick_2': {
      playKick(ctx, dest, t0, {
        ...k.kick,
        endHz: k.kick.endHz * 0.74,
        sweepS: k.kick.sweepS * 0.8,
        bodyS: Math.min(1.2, k.kick.bodyS * 1.18),
        attackS: k.kick.attackS * 0.98,
        level: Math.min(1, k.kick.level * 0.96),
      })
      return
    }
    case 'perc_click':
      playPercCowClick(ctx, dest, t0, k.cowbell)
      return
    case 'fx_wash':
      playFxWashPad(ctx, dest, t0, k.crashRide)
      return
    default:
      playSnare(ctx, dest, t0, k.snare)
  }
}
