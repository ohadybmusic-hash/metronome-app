/**
 * Lock-screen media controls + metadata. Return value is a cleanup to clear handlers.
 */
export function bindMetronomeMediaSession(bpm, isPlaying, start, stop) {
  const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null
  if (!ms) {
    return () => {}
  }

  try {
    ms.metadata = new MediaMetadata({
      title: 'Metronome',
      artist: `${Math.round(bpm)} BPM`,
      album: 'Practice',
    })
  } catch {
    // ignore
  }

  const onPlay = () => start()
  const onPause = () => stop()

  try {
    ms.setActionHandler('play', onPlay)
    ms.setActionHandler('pause', onPause)
    ms.setActionHandler('stop', onPause)
  } catch {
    // ignore
  }

  try {
    ms.playbackState = isPlaying ? 'playing' : 'paused'
  } catch {
    // ignore
  }

  return () => {
    try {
      ms.setActionHandler('play', null)
      ms.setActionHandler('pause', null)
      ms.setActionHandler('stop', null)
    } catch {
      // ignore
    }
  }
}
