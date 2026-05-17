export const SYNTHWAVE_METRONOME_VIEW_KEY = 'metronome.synthwaveMetronomeView'

/** @typedef {'wheel' | 'grid'} SynthwaveMetronomeView */

/** @returns {SynthwaveMetronomeView} */
export function readSynthwaveMetronomeView() {
  try {
    const v = localStorage.getItem(SYNTHWAVE_METRONOME_VIEW_KEY)
    if (v === 'grid' || v === 'wheel') return v
  } catch {
    /* */
  }
  return 'wheel'
}

/** @param {SynthwaveMetronomeView} view */
export function writeSynthwaveMetronomeView(view) {
  try {
    localStorage.setItem(SYNTHWAVE_METRONOME_VIEW_KEY, view)
  } catch {
    /* */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('metronome-synthwave-view-changed'))
  }
}

/** Stitch export hero image — Precision Tempo / MATRIX_SYNC synthwave screens. */
export const STITCH_SYNTHWAVE_HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida/ADBb0ujqXhkLf6vQ-_YuIdFegcXwB70Z7W9tGH31svEy-6jm1pmNdUqbmItFnJXFwAwHfqbe0sEpn3Gte9_P8RmgoGS7kA0mkuygaN3fyLllHyQbRKxo9x2Css0t-usJmbEf__IhSLDqCfB9uNV0al0g6SPgc87_6NK8VZxDCpcX7t88rYBc2bEltyeLx1Y5u8uM2BA2p9REDKwbOnDcbCErsUYmSlj9uy1-bOd30ILKjYHXrvXUvCpIt0Xk_oz2bhV5dHkXNNMYHH8j29I'
