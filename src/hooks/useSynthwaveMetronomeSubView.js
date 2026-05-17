import { useEffect, useState } from 'react'
import { readSynthwaveMetronomeView } from '../lib/metronomeSynthwaveView.js'

/** Tracks Wheel vs Grid metronome (synthwave) for shell chrome that depends on sub-view. */
export function useSynthwaveMetronomeSubView() {
  const [view, setView] = useState(() =>
    typeof window !== 'undefined' ? readSynthwaveMetronomeView() : 'wheel',
  )

  useEffect(() => {
    const sync = () => setView(readSynthwaveMetronomeView())
    window.addEventListener('metronome-synthwave-view-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('metronome-synthwave-view-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return view
}
