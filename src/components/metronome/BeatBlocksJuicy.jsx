import { useEffect, useState } from 'react'
import { clamp } from '../../lib/clamp.js'
import { accentShortLabel, accentToNumeric } from '../../lib/metronome/beatAccentLabels.js'

const HINT_DISMISSED_KEY = 'metronome.hint.beatAccents.dismissed'

function readHintDismissed() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(HINT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

// New stacked-block beat visualizer — 3 equal-height blocks per beat,
// color/count reflects accent level; active beat lights up.
export function BeatBlocksJuicy({ met }) {
  const [hit, setHit] = useState({ i: -1, isDownbeat: false, id: 0 })
  const [hintOpen, setHintOpen] = useState(() => !readHintDismissed())

  useEffect(() => {
    return met.events.onScheduledBeat((evt) => {
      const beats = Math.max(1, met.pulsesPerMeasure || 1)
      const i = clamp(Number(evt?.pulseIndex ?? 0), 0, beats - 1)
      setHit((prev) => ({ i, isDownbeat: i === 0, id: prev.id + 1 }))
    })
  }, [met])

  const beats = Math.max(1, met.pulsesPerMeasure || 1)
  const accents = met.beatAccents || []

  const dismissHint = () => {
    setHintOpen(false)
    try {
      window.localStorage.setItem(HINT_DISMISSED_KEY, '1')
    } catch {
      /* */
    }
  }

  return (
    <div className="metronome__accents-wrap">
      <div className="metronome__accents" aria-label="Beat blocks visualizer">
        {Array.from({ length: beats }, (_, idx) => {
          const isActive = idx === hit.i
          const accentLevel = accents[idx] || 'NORMAL'
          const numFilled = accentToNumeric(accentLevel)
          const levelClass = `metronome__beat--${String(accentLevel).toLowerCase()}`

          return (
            <button
              key={idx}
              type="button"
              className={`metronome__beat ${levelClass}${isActive ? ' is-beat-active' : ''}`}
              onClick={() => met.cycleBeatAccent(idx)}
              title={`Beat ${idx + 1}: ${accentLevel}`}
              aria-label={`Beat ${idx + 1} accent: ${accentLevel}. Tap to cycle.`}
            >
              {/* 3 blocks, top (b2=red) → bottom (b0=white) */}
              {[2, 1, 0].map((tier) => {
                const filled = tier < numFilled
                return (
                  <div
                    key={tier}
                    className={`beat__block beat__block--b${tier} ${filled ? 'beat__block--filled' : 'beat__block--empty'}`}
                  />
                )
              })}
              <div className="beat__label">{accentShortLabel(accentLevel)}</div>
            </button>
          )
        })}
      </div>
      {hintOpen ? (
        <div
          className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.12em] text-on-surface-variant"
          role="note"
        >
          <span>Tap a beat to change its accent</span>
          <button
            type="button"
            onClick={dismissHint}
            className="rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-outline hover:text-on-surface focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-label="Dismiss accent hint"
          >
            Got it
          </button>
        </div>
      ) : null}
    </div>
  )
}
