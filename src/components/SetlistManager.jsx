import { useMemo, useState } from 'react'
import './SetlistManager.css'

function formatSongLine(s) {
  const bpm = Number.isFinite(Number(s?.bpm)) ? Math.round(Number(s.bpm)) : '?'
  const ts = s?.timeSignature || '?'
  const sub = s?.subdivision || '?'
  return `${s?.name || 'Untitled'} — ${bpm} BPM • ${ts} • ${sub}`
}

export default function SetlistManager({ met }) {
  const [stageMode, setStageMode] = useState(false)

  const saveCurrentSong = () => {
    const name = window.prompt('Song name?')
    if (!name) return
    met.presets.saveSong({
      name,
      bpm: met.bpm,
      timeSignature: met.timeSignature,
      subdivision: met.subdivision,
    })
  }

  const createSetlist = () => {
    const name = window.prompt('Setlist name?')
    if (!name) return
    met.presets.createSetlist({ name })
  }

  const addSongToActiveSetlist = () => {
    const songId = met.presets.activeSongId
    const setlistId = met.presets.activeSetlistId
    if (!songId || !setlistId) return
    met.presets.addSongToSetlist({ setlistId, songId })
  }

  const stageSongs = useMemo(() => {
    const setlistId = met.presets.activeSetlistId
    const songs = met.presets.songs || []
    const setlists = met.presets.setlists || []
    if (!setlistId) return songs

    const sl = setlists.find((x) => x.id === setlistId)
    if (!sl?.songIds?.length) return []

    const byId = new Map(songs.map((s) => [s.id, s]))
    return sl.songIds.map((id) => byId.get(id)).filter(Boolean)
  }, [met.presets.activeSetlistId, met.presets.setlists, met.presets.songs])

  return (
    <div className="setlistMgr">
      <div className="setlistMgr__row">
        <label className="metronome__label">
          Presets
          <select
            className="metronome__select"
            value={met.presets.activeSongId}
            onChange={(e) => {
              const id = e.target.value
              met.presets.setActiveSongId(id)
              const s = met.presets.songs.find((x) => x.id === id)
              met.presets.applySong(s)
            }}
          >
            <option value="">Select a song…</option>
            {met.presets.songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {Math.round(s.bpm)} BPM
              </option>
            ))}
          </select>
        </label>

        <label className="metronome__toggle setlistMgr__toggle">
          <input type="checkbox" checked={stageMode} onChange={(e) => setStageMode(e.target.checked)} />
          <span>Stage Mode</span>
        </label>
      </div>

      <div className="setlistMgr__row setlistMgr__row--actions">
        <button type="button" className="metronome__btn" onClick={saveCurrentSong}>
          Save song
        </button>

        <div className="metronome__setlist">
          <select
            className="metronome__select"
            value={met.presets.activeSetlistId}
            onChange={(e) => met.presets.setActiveSetlistId(e.target.value)}
          >
            <option value="">Setlist…</option>
            {met.presets.setlists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.songIds.length})
              </option>
            ))}
          </select>
          <button type="button" className="metronome__btn" onClick={createSetlist}>
            New setlist
          </button>
          <button
            type="button"
            className="metronome__btn metronome__btn--primary"
            onClick={addSongToActiveSetlist}
            disabled={!met.presets.activeSetlistId || !met.presets.activeSongId}
          >
            Add to setlist
          </button>
        </div>
      </div>

      {stageMode ? (
        <div className="setlistMgr__stage" role="region" aria-label="Stage Mode">
          {stageSongs.length ? (
            <div className="setlistMgr__songList" role="list">
              {stageSongs.map((s) => {
                const active = s.id === met.presets.activeSongId
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="listitem"
                    className={`setlistMgr__songBtn ${active ? 'setlistMgr__songBtn--active' : ''}`}
                    onClick={() => met.presets.applySong(s)}
                  >
                    {formatSongLine(s)}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="setlistMgr__empty">No songs yet. Save a song, or select a setlist with songs.</div>
          )}
        </div>
      ) : null}

      {met.presets.guestSyncPrompt ? (
        <div className="metronome__guestPrompt" role="status" aria-live="polite">
          {met.presets.guestSyncPrompt}{' '}
          <button type="button" className="metronome__linkBtn" onClick={met.presets.clearGuestSyncPrompt}>
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  )
}

