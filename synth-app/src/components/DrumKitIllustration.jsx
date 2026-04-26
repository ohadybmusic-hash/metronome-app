import { useMemo } from 'react'
import drumKitImage from '../assets/drum-kit-illustration.png'
import { ILLUSTRATION_HOTSPOTS } from '../lib/drumKitIllustrationHotspots.js'
import { VOICE_ORDER } from '../lib/drumSamplePlayback.js'
import { DRUM_VOICES } from '../lib/drumVoices.js'

/**
 * @param {object} props
 * @param {number} [props.lastHitIndex] 0–7, voice index; highlight when a pad is struck
 * @param {number} [props.lastHitToken] increment each hit to retrigger the flash on same pad
 */
export function DrumKitIllustration({ lastHitIndex = -1, lastHitToken = 0 }) {
  const voiceToColor = useMemo(() => {
    /** @type {Record<string, string>} */
    const m = {}
    for (const v of DRUM_VOICES) m[v.key] = v.color
    return m
  }, [])

  const hitKey = VOICE_ORDER[lastHitIndex] ?? null
  const box = hitKey ? ILLUSTRATION_HOTSPOTS[hitKey] : null
  const color = (hitKey && voiceToColor[hitKey]) || '#fff'

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center gap-1 px-3 py-2">
      <p className="shrink-0 text-center text-[10px] font-medium uppercase tracking-widest text-zinc-600">
        Press A–D to edit
      </p>
      <div className="relative w-full max-w-[min(400px,88vw)]">
        <img
          src={drumKitImage}
          alt=""
          className="block h-auto max-h-[min(200px,28vh)] w-full"
          width={2304}
          height={1728}
          loading="eager"
          decoding="async"
          fetchPriority="low"
        />
        {box != null && lastHitIndex >= 0 && (
          <div
            className="pointer-events-none absolute"
            key={`${lastHitIndex}-${lastHitToken}`}
            style={{
              left: `${box.l}%`,
              top: `${box.t}%`,
              width: `${box.w}%`,
              height: `${box.h}%`,
            }}
            aria-hidden
          >
            <div
              className="drum-illu-shine absolute -inset-[8%]"
              style={{
                background: `radial-gradient(closest-side, transparent 25%, ${color}55 72%, ${color}22 90%, transparent 100%)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
