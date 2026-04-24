import { useCallback, useState } from 'react'
import { shouldOfferAudioHandoff } from '../lib/device.js'

const STORAGE_KEY = 'metronome.audioPrimer.v1'

/**
 * Browsers (especially iOS WebKit) do not let a site get “permanent” OS permissions like a
 * native app. The mic prompt can still hand off audio to the system once; the metronome then
 * uses normal speaker output. This is a one-time, user-initiated handoff, not a hot mic.
 */
export default function AudioSessionPrimer({ getAudioContext, onEnsureWebAudio, bottomOffsetPx = 0 }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY))
    } catch {
      return true
    }
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const dismiss = useCallback((value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
    setDismissed(true)
  }, [])

  const runHandoff = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const ctx = getAudioContext?.()
      if (!ctx) {
        stream.getTracks().forEach((t) => t.stop())
        setError('Audio engine not ready. Try again after tapping the screen once.')
        return
      }
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      const src = ctx.createMediaStreamSource(stream)
      const g = ctx.createGain()
      g.gain.value = 0.0001
      src.connect(g)
      g.connect(ctx.destination)
      await new Promise((r) => setTimeout(r, 150))
      try {
        src.disconnect()
        g.disconnect()
      } catch {
        // ignore
      }
      stream.getTracks().forEach((t) => t.stop())
      onEnsureWebAudio?.()
      dismiss('done')
    } catch (e) {
      setError(
        e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError'
          ? 'Microphone access was blocked. In Settings → Safari → [this site] you can set Microphone to Allow, then use “Connect audio” again.'
          : e?.message || 'Could not connect the audio handoff',
      )
    } finally {
      setBusy(false)
    }
  }, [busy, getAudioContext, onEnsureWebAudio, dismiss])

  if (dismissed || !shouldOfferAudioHandoff()) {
    return null
  }

  return (
    <div
      className="audioPrimer"
      style={{ bottom: `calc(12px + ${bottomOffsetPx}px + env(safe-area-inset-bottom, 0px))` }}
      role="status"
    >
      <div className="audioPrimer__inner">
        <p className="audioPrimer__text">
          <strong>Reliable sound on iPhone / installed app:</strong> the system can hand off audio
          if you run a one-time microphone check. We don’t keep the mic on — only a silent blip, then
          the mic is released. (Apps can’t get permanent OS permissions; you can set “Allow” in
          Safari for this site.)
        </p>
        {error ? <p className="audioPrimer__error">{error}</p> : null}
        <div className="audioPrimer__actions">
          <button
            type="button"
            className="audioPrimer__btn audioPrimer__btn--primary"
            disabled={busy}
            onClick={runHandoff}
          >
            {busy ? 'Working…' : 'Connect audio'}
          </button>
          <button type="button" className="audioPrimer__btn" onClick={() => dismiss('skipped')} disabled={busy}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
