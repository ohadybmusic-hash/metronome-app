import { useMemo, useRef, useState } from 'react'
import { PRESET_DATA_VERSION } from '@synth/lib/synthPreset.js'
import './SetlistManager.css'

export default function SetlistManager({ met, stageMode, setStageMode, synthBridge, visualLayout }) {
  const importInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const [notice, setNotice] = useState(/** @type {string | null} */ (null))
  const showNotice = (msg) => setNotice(msg)
  const ob = visualLayout === 'obsidian'
  const sw = visualLayout === 'synthwave'
  const labelCls = ob || sw ? 'flex flex-col gap-1.5' : 'metronome__label'
  const labelCapCls =
    (ob && 'text-[9px] font-bold uppercase tracking-[0.2em] text-chrome/80') ||
    (sw && 'text-[9px] font-bold uppercase tracking-widest text-cyan-400/75') ||
    ''
  const selectCls =
    ob || sw
      ? `w-full rounded-ds border px-2 py-2 text-sm text-on-background outline-none focus-visible:ring-2 ${
          ob
            ? 'border-hairline bg-surface-container-low focus-visible:ring-chrome/35'
            : 'border-cyan-400/25 bg-surface-container-low/80 focus-visible:ring-cyan-400/30'
        }`
      : 'metronome__select'
  const btnCls =
    ob || sw
      ? `rounded-ds border px-3 py-2 text-[11px] font-bold uppercase tracking-wider outline-none transition [-webkit-tap-highlight-color:transparent] ${
          ob
            ? 'border-chrome/35 bg-surface-container-low text-chrome hover:border-chrome/55 hover:bg-surface-container focus-visible:ring-2 focus-visible:ring-chrome/30'
            : 'border-cyan-400/30 bg-surface-container-low/80 text-cyan-100/90 hover:border-secondary-container/40 focus-visible:ring-2 focus-visible:ring-secondary-container/30'
        }`
      : 'metronome__btn'
  const btnGhostCls =
    ob || sw
      ? `${btnCls} bg-transparent ${
          ob ? 'text-chrome/90 hover:bg-chrome/5' : 'text-cyan-200/70 hover:bg-cyan-400/5'
        } text-[11px] normal-case tracking-normal`
      : 'metronome__btn metronome__btn--ghost'
  const btnPrimaryCls =
    ob || sw
      ? `${btnCls} ${
          ob
            ? 'border-chrome/50 bg-chrome/10 text-chrome shadow-[0_0_14px_rgb(var(--ds-chrome-rgb)_/_0.15)]'
            : 'border-secondary-container/45 bg-secondary-container/10 text-secondary-container shadow-[0_0_12px_rgb(236_72_153_/_0.15)]'
        }`
      : 'metronome__btn metronome__btn--primary'
  const hintCls =
    ob || sw
      ? `text-[12px] leading-relaxed ${ob ? 'text-on-surface-variant' : 'text-cyan-100/55'}`
      : 'setlistMgr__hint'

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
      showNotice('Select a song in the list first, or save a new song.')
      return
    }
    const snap = getSynthSnapshot()
    if (!snap) {
      showNotice(
        'No synth sound captured yet. Open the Synth lab tab, set your sound, then come back — your patch is saved when you leave the lab. Or load a .json you exported before.',
      )
      return
    }
    met.presets.updateSong(id, { synthSnapshot: snap })
  }

  const exportSynthPreset = () => {
    const snap = getSynthSnapshot()
    if (!snap) {
      showNotice('No synth data to export. Open Synth lab, tweak a sound, then use Export file.')
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
          showNotice('Open the Synth lab tab, then use Import file again to load the sound.')
        }
      } catch (err) {
        showNotice(`Could not import: ${String(err?.message || err)}`)
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
    <div className={`setlistMgr${ob ? ' setlistMgr--obsidian' : sw ? ' setlistMgr--synthwave' : ''}`}>
      <div className="setlistMgr__row">
        <label className={labelCls}>
          {ob || sw ? <span className={labelCapCls}>Presets</span> : 'Presets'}
          <select
            className={selectCls}
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
        <button type="button" className={btnCls} onClick={saveCurrentSong}>
          Save song
        </button>
        <button type="button" className={btnCls} onClick={attachSynthToActiveSong} title="Store current synth (from Synth lab) in the selected song">
          Save synth to song
        </button>
      </div>

      <div className="setlistMgr__row setlistMgr__row--synthio">
        <button type="button" className={btnGhostCls} onClick={exportSynthPreset}>
          Export synth .json
        </button>
        <button
          type="button"
          className={btnGhostCls}
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
      <p className={hintCls}>
        Songs can include a synth-lab sound. Design in <strong>Synth lab</strong>, return here, then <strong>Save song</strong> or <strong>Save synth to song</strong>. Selecting a
        song with a saved sound updates the synth when you open the lab.
      </p>

      <div className="setlistMgr__row setlistMgr__row--setlists">
        <div className="metronome__setlist">
          <select
            className={selectCls}
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
          <button type="button" className={btnCls} onClick={createSetlist}>
            New setlist
          </button>
          <button
            type="button"
            className={btnPrimaryCls}
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

      {notice ? (
        <div className="setlistMgr__notice" role="alert" aria-live="assertive">
          <span className="setlistMgr__noticeMsg">{notice}</span>
          <button type="button" className="setlistMgr__noticeDismiss" onClick={() => setNotice(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ) : null}
    </div>
  )
}
