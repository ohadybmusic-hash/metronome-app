import { getMeter, normalizeBeatAccents } from './engine.js'

const GUEST_UPGRADE =
  'Create a permanent account to sync your data across devices.'

/**
 * Presets / songs / setlists API object (same behavior as the former inline `presets` in `useMetronome`).
 * Call once per render so closures see current `songs` / `setlists` for `schedulePersist`.
 */
export function getMetronomePresetsHandlers({
  authedUserId,
  isAnonymous,
  beatAccentsRef,
  synthApplierRef,
  songs,
  setlists,
  setSongs,
  setSetlists,
  setActiveSongId,
  setActiveSetlistId,
  setGuestSyncPrompt,
  setTimeSignature,
  setSubdivision,
  setBpm,
  setBeatAccents,
  schedulePersist,
}) {
  return {
    clearGuestSyncPrompt: () => setGuestSyncPrompt(null),
    saveSong: ({ name, bpm, timeSignature, subdivision, synthSnapshot }) => {
      if (!authedUserId || isAnonymous) setGuestSyncPrompt(GUEST_UPGRADE)
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const meter = getMeter(timeSignature)
      const song = {
        id,
        name,
        bpm,
        timeSignature,
        subdivision,
        beatAccents: normalizeBeatAccents(meter, beatAccentsRef.current),
        ...(synthSnapshot && typeof synthSnapshot === 'object' ? { synthSnapshot } : {}),
      }
      setSongs((prev) => {
        const next = [song, ...prev]
        schedulePersist(next, setlists)
        return next
      })
      setActiveSongId(id)
      return id
    },
    updateSong: (songId, patch) => {
      if (!songId || !patch || typeof patch !== 'object') return
      if (!authedUserId || isAnonymous) {
        setGuestSyncPrompt(GUEST_UPGRADE)
      }
      setSongs((prev) => {
        const next = prev.map((s) => (s.id === songId ? { ...s, ...patch } : s))
        schedulePersist(next, setlists)
        return next
      })
    },
    applySong: (song) => {
      if (!song) return
      setActiveSongId(song.id || '')
      setTimeSignature(song.timeSignature)
      setSubdivision(song.subdivision)
      setBpm(song.bpm)
      const meter = getMeter(song.timeSignature)
      setBeatAccents(normalizeBeatAccents(meter, song.beatAccents))
      if (song.synthSnapshot && typeof synthApplierRef.current === 'function') {
        try {
          synthApplierRef.current(song.synthSnapshot)
        } catch {
          /* ignore invalid synth snapshot */
        }
      }
    },
    createSetlist: ({ name }) => {
      if (!authedUserId || isAnonymous) setGuestSyncPrompt(GUEST_UPGRADE)
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const sl = { id, name, songIds: [] }
      setSetlists((prev) => {
        const next = [sl, ...prev]
        schedulePersist(songs, next)
        return next
      })
      setActiveSetlistId(id)
      return id
    },
    addSongToSetlist: ({ setlistId, songId }) => {
      if (!authedUserId || isAnonymous) setGuestSyncPrompt(GUEST_UPGRADE)
      setSetlists((prev) => {
        const next = prev.map((s) =>
          s.id !== setlistId ? s : { ...s, songIds: [...s.songIds.filter((x) => x !== songId), songId] },
        )
        schedulePersist(songs, next)
        return next
      })
    },
  }
}
