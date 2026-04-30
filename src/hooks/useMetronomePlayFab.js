import { useCallback, useRef } from 'react'

/**
 * iOS/Safari: run transport on `pointerup` in the user gesture; suppress the follow-up synthetic
 * `click` so we do not double-toggle. Also debounce pointerup/touchend double-firing on WebKit.
 *
 * @param {object} met
 * @param {object} [options]
 * @param {() => void} [options.onAfterStartFromStopped]  e.g. float-HUD engage when starting from main.
 */
export function useMetronomePlayFab(met, options = {}) {
  const { onAfterStartFromStopped } = options
  const playFabSkipClickRef = useRef(false)
  const playFabLastPhysicalAt = useRef(0)

  const performToggle = useCallback(() => {
    const willEngageFromMain =
      met != null && !met.isPlaying && !met.countIn?.active
    try {
      met?.audio?.ensure?.()
    } catch {
      // ignore
    }
    met?.toggle?.()
    if (willEngageFromMain) onAfterStartFromStopped?.()
  }, [met, onAfterStartFromStopped])

  const runPlayUserAction = useCallback(
    (e) => {
      if (e?.pointerType === 'mouse' && e.button !== 0) return
      const now = performance.now()
      if (playFabLastPhysicalAt.current > 0 && now - playFabLastPhysicalAt.current < 50) return
      playFabLastPhysicalAt.current = now

      playFabSkipClickRef.current = true
      window.setTimeout(() => {
        playFabSkipClickRef.current = false
      }, 500)
      performToggle()
    },
    [performToggle],
  )

  const handlePlayFabClick = useCallback(
    (e) => {
      if (playFabSkipClickRef.current) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      performToggle()
    },
    [performToggle],
  )

  return { runPlayUserAction, handlePlayFabClick }
}
