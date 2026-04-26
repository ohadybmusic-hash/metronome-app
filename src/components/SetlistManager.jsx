import { useMemo, useRef } from 'react'
import { PRESET_DATA_VERSION } from '@synth/lib/synthPreset.js'
import './SetlistManager.css'

export default function SetlistManager({ met, stageMode, setStageMode, synthBridge }) {
  const importInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const getSynthSnapshot = () => {
    const api = synthBridge?.synthRef?.current
    if (api?.getPresetSnapshot) {
      try {
        return api.getPresetSnapshot()
      } catch {
        return null
      }
    }
    return synthBridge?.lastSynthSnapshot ?? null
  }

  const saveCurrentSong = () => {
    const name = window.prompt('Song name?')
    if (!name) return
    const synthSnapshot = getSynthSnapshot()
    met.presets.saveSong({
      name,
      bpm: met.bpm,
      timeSignature: met.timeSignature,
      subdivision: met.subdivision,
      ...(synthSnapshot ? { synthSnapshot } : {}),
    })
  }

  const attachSynthToActiveSong = () => {
    const id = met.presets.activeSongId
    if (!id) {
      window.alert('Select a song in the list first, or save a new song.')
      return
    }
    const snap = getSynthSnapshot()
    if (!snap) {
      window.alert(
        'No synth sound captured yet. Open the Synth lab tab, set your sound, then come back — your patch is saved when you leave the lab. Or load a .json you exported before.',
      )
      return
    }
    met.presets.updateSong(id, { synthSnapshot: snap })
  }

  const exportSynthPreset = () => {
    const snap = getSynthSnapshot()
    if (!snap) {
      window.alert('No synth data to export. Open Synth lab, tweak a sound, then use Export file.')
      return
    }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `synth-preset-v${Number(snap.v) || PRESET_DATA_VERSION}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImportFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || '{}'))
        if (raw == null || typeof raw !== 'object') throw new Error('File must be a JSON object')
        const setStaged = synthBridge?.setStagedSynthImport
        const api = synthBridge?.synthRef?.current
        if (api?.applyPresetSnapshot) {
          void api.initAudio?.()
          api.applyPresetSnapshot(raw)
        } else if (typeof setStaged === 'function') {
          setStaged(raw)
        } else {
          window.alert('Open the Synth lab tab, then use Import file again to load the sound.')
        }
      } catch (err) {
        window.alert(`Could not import: ${String(err?.message || err)}`)
      }
    }
    reader.readAsText(f)
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

  const canEnterStageMode = useMemo(() => {
    const setlistId = met.presets.activeSetlistId
    if (!setlistId) return met.presets.songs?.length > 0
    const sl = met.presets.setlists?.find((x) => x.id === setlistId)
    return (sl?.songIds?.length ?? 0) > 0
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
                {s.synthSnapshot ? ' · sound' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="metronome__toggle setlistMgr__toggle">
          <input
            type="checkbox"
            checked={stageMode}
            onChange={(e) => setStageMode(e.target.checked)}
            disabled={!canEnterStageMode && !stageMode}
          />
          <span>Performance Mode</span>
        </label>
      </div>

      <div className="setlistMgr__row setlistMgr__row--actions">
        <button type="button" className="metronome__btn" onClick={saveCurrentSong}>
          Save song
        </button>
        <button type="button" className="metronome__btn" onClick={attachSynthToActiveSong} title="Store current synth (from Synth lab) in the selected song">
          Save synth to song
        </button>
      </div>

      <div className="setlistMgr__row setlistMgr__row--synthio">
        <button type="button" className="metronome__btn metronome__btn--ghost" onClick={exportSynthPreset}>
          Export synth .json
        </button>
        <button
          type="button"
          className="metronome__btn metronome__btn--ghost"
          onClick={() => importInputRef.current?.click?.()}
        >
          Import .json
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="setlistMgr__fileInput"
          onChange={onImportFile}
          aria-hidden
          tabIndex={-1}
        />
      </div>
      <p className="setlistMgr__hint">
        Songs can include a synth-lab sound. Design in <strong>Synth lab</strong>, return here, then <strong>Save song</strong> or <strong>Save synth to song</strong>. Selecting a
        song with a saved sound updates the synth when you open the lab.
      </p>

      <div className="setlistMgr__row setlistMgr__row--setlists">
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

      {stageMode && !canEnterStageMode ? (
        <div className="setlistMgr__empty">Select a setlist with songs (or save a song) to use Stage Mode.</div>
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
