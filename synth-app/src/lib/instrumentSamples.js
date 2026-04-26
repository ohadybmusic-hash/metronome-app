/**
 * Bundled one-shot **multi-samples** (3 zones: MIDI 48 / 60 / 72) for a few
 * factory presets. Files live under `public/instruments/<pack>/`.
 *
 * - **Piano** — Salamander Grand (CC BY 3.0) via the Tone.js demo mirror:
 *   https://tonejs.github.io/audio/salamander/
 * - **Strings** — FluidR3 string ensemble 1 and violin (CC BY 3.0) via
 *   gleitz `midi-js-soundfonts` mirror (same samples used across many web demos).
 *
 * These are not GM ROM; they are separate MP3 one-shots per key zone.
 */

/** @typedef {'grand_piano' | 'string_ensemble' | 'solo_strings'} SamplePackId */

const ZONE_ROOTS = [48, 60, 72]

const PACKS = {
  /** @satisfies {Record<SamplePackId, { dir: string }>} */
  grand_piano: { dir: 'grand_piano' },
  string_ensemble: { dir: 'string_ensemble' },
  solo_strings: { dir: 'solo_strings' },
}

const VALID = new Set(Object.keys(PACKS))

/**
 * @param {unknown} x
 * @returns {x is SamplePackId}
 */
export function isValidSamplePackId(x) {
  return typeof x === 'string' && VALID.has(x)
}

/** @param {string} base public base, e.g. `import.meta.env.BASE_URL` */
function sampleUrl(base, dir, rootMidi) {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${b}instruments/${dir}/${rootMidi}.mp3`
}

/**
 * @param {number} midi
 * @param {{ rootMidi: number, buffer: AudioBuffer }[]} zones
 */
export function pickZoneForMidi(midi, zones) {
  if (!zones || zones.length === 0) return null
  let best = zones[0]
  let bestD = Math.abs(midi - best.rootMidi)
  for (let i = 1; i < zones.length; i++) {
    const z = zones[i]
    const d = Math.abs(midi - z.rootMidi)
    if (d < bestD) {
      bestD = d
      best = z
    }
  }
  return best
}

/**
 * @param {number} targetMidi
 * @param {number} rootMidi
 */
export function rootPlaybackRate(targetMidi, rootMidi) {
  return 2 ** ((targetMidi - rootMidi) / 12)
}

/**
 * @param {AudioContext} ctx
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
/**
 * @param {AudioContext} ctx
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
async function fetchDecode(ctx, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(String(res.status))
  const ab = await res.arrayBuffer()
  const slice = ab.slice(0)
  const dec = ctx.decodeAudioData(slice)
  if (dec && typeof dec.then === 'function') return dec
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(ab.slice(0), resolve, reject)
  })
}

/**
 * @param {Map<SamplePackId, { zones?: { rootMidi: number, buffer: AudioBuffer }[] | null, loading?: Promise<void> }>} cache
 * @param {SamplePackId} packId
 */
export function getLoadedZones(cache, packId) {
  if (!isValidSamplePackId(packId)) return null
  const e = cache.get(packId)
  if (e && e.zones && e.zones.length > 0) return e.zones
  return null
}

/**
 * @param {AudioContext} ctx
 * @param {string} [publicBase] e.g. `import.meta.env.BASE_URL`
 * @param {Map<SamplePackId, { zones?: { rootMidi: number, buffer: AudioBuffer }[] | null, loading?: Promise<void> }>} cache
 * @param {SamplePackId} packId
 */
export function ensureInstrumentPack(ctx, publicBase, cache, packId) {
  if (!isValidSamplePackId(packId)) return Promise.resolve()
  const e = cache.get(packId)
  if (e && e.zones && e.zones.length > 0) return Promise.resolve()
  if (e && e.loading) return e.loading

  const base = publicBase ?? '/'
  const meta = PACKS[packId]
  const loading = (async () => {
    const zones = []
    for (const r of ZONE_ROOTS) {
      const url = sampleUrl(base, meta.dir, r)
      const buffer = await fetchDecode(ctx, url)
      zones.push({ rootMidi: r, buffer })
    }
    cache.set(packId, { zones, loading: null })
  })().catch(() => {
    cache.set(packId, { zones: null, loading: null })
  })
  cache.set(packId, { zones: null, loading })
  return loading
}

/**
 * @param {GainNode} env
 * @param {{ attack: number, release: number }} ad
 * @param {number} t0
 */
export function applySampleKeyDown(env, ad, t0) {
  const a = Math.max(0.0005, Math.min(0.12, ad.attack))
  env.gain.setValueAtTime(0, t0)
  env.gain.linearRampToValueAtTime(1, t0 + a)
}
