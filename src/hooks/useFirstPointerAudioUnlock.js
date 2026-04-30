import { useEffect } from 'react'

/** Safari / iOS: prime Web Audio on first touch so a later PLAY tap is not the only unlocking gesture. */
export function useFirstPointerAudioUnlock(ensureAudio) {
  useEffect(() => {
    if (!ensureAudio) return
    let didUnlock = false
    const onFirstPointer = () => {
      if (didUnlock) return
      didUnlock = true
      try {
        ensureAudio()
      } catch {
        // ignore
      }
    }
    document.addEventListener('touchstart', onFirstPointer, { capture: true, passive: true })
    document.addEventListener('pointerdown', onFirstPointer, { capture: true, passive: true })
    return () => {
      document.removeEventListener('touchstart', onFirstPointer, { capture: true })
      document.removeEventListener('pointerdown', onFirstPointer, { capture: true })
    }
  }, [ensureAudio])
}
