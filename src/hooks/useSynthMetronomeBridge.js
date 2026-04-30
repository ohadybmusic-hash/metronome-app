import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/**
 * Applies song synth snapshots from the metronome hook to the synth lab, including when the synth tab is not mounted.
 */
export function useSynthMetronomeBridge(activeTabId) {
  const runSynthFromSongRef = useRef(/** @type {(snap: object) => void} */ () => {})
  const pendingSongSynthRef = useRef(/** @type {object | null} */ (null))
  const synthRef = useRef(
    /** @type {{ initAudio?: () => Promise<void> | void; getPresetSnapshot?: () => object; applyPresetSnapshot?: (s: object) => void } | null} */ (null),
  )
  const [lastSynthSnapshot, setLastSynthSnapshot] = useState(/** @type {object | null} */ (null))
  const [stagedSynthImport, setStagedSynthImport] = useState(/** @type {object | null} */ (null))

  const tryApply = useCallback((snap) => {
    if (!snap || typeof snap !== 'object') return
    const api = synthRef.current
    if (!api?.applyPresetSnapshot) return
    try {
      void api.initAudio?.()
      api.applyPresetSnapshot(snap)
      return true
    } catch {
      return false
    }
  }, [])

  useLayoutEffect(() => {
    runSynthFromSongRef.current = (snap) => {
      if (!snap || typeof snap !== 'object') return
      pendingSongSynthRef.current = snap
      if (tryApply(snap)) pendingSongSynthRef.current = null
    }
  }, [tryApply])

  useLayoutEffect(() => {
    if (activeTabId !== 'synth') return
    const p = pendingSongSynthRef.current
    if (p && tryApply(p)) pendingSongSynthRef.current = null
  }, [activeTabId, tryApply])

  useLayoutEffect(() => {
    if (activeTabId !== 'synth' || !stagedSynthImport) return
    if (tryApply(stagedSynthImport)) {
      queueMicrotask(() => setStagedSynthImport(null))
    }
  }, [activeTabId, stagedSynthImport, tryApply])

  return {
    synthRef,
    runSynthFromSongRef,
    lastSynthSnapshot,
    setLastSynthSnapshot,
    stagedSynthImport,
    setStagedSynthImport,
  }
}
