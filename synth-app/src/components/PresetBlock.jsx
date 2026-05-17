import { useEffect, useRef, useState } from 'react'
import {
  loadUserPresets,
  newPresetId,
  parseImportedPresetObject,
  writeUserPresets,
} from '../lib/synthPreset.js'
import { SYNTH_FACTORY_PRESETS } from '../lib/synthFactoryPresets.js'
import { synthChromeUi } from '../lib/synthChromeUi.js'

function safeFileName(s) {
  return String(s)
    .replace(/[<>:"/\\|?*]+/g, '')
    .trim()
    .slice(0, 48) || 'preset'
}

export function PresetBlock({
  open,
  drumMode,
  getPresetSnapshot,
  applyPresetSnapshot,
  applyFactorySynthPreset,
  activeFactoryPresetId = null,
  onUserGesture,
  obsidianChrome = false,
  synthwaveChrome = false,
}) {
  const u = synthChromeUi(obsidianChrome ? 'obsidian' : synthwaveChrome ? 'synthwave' : 'legacy')
  const [presetName, setPresetName] = useState('')
  const [userPresets, setUserPresets] = useState(() => loadUserPresets())
  const importRef = useRef(null)

  useEffect(() => {
    if (open) setUserPresets(loadUserPresets())
  }, [open])

  const save = () => {
    const name = presetName.trim() || `Preset ${new Date().toLocaleString()}`
    const data = getPresetSnapshot()
    const id = newPresetId()
    const next = [
      ...userPresets,
      { id, name, savedAt: new Date().toISOString(), data },
    ]
    if (!writeUserPresets(next)) {
      window.alert('Could not save (storage may be full or private mode).')
      return
    }
    setUserPresets(next)
    setPresetName('')
    onUserGesture?.()
  }

  const load = (row) => {
    onUserGesture?.()
    try {
      applyPresetSnapshot(row.data)
    } catch {
      window.alert('Could not load this preset.')
    }
  }

  const remove = (id) => {
    const next = userPresets.filter((x) => x.id !== id)
    if (!writeUserPresets(next)) {
      window.alert('Could not update saved presets.')
      return
    }
    setUserPresets(next)
  }

  const exportRow = (row) => {
    const payload = { name: row.name, savedAt: row.savedAt, ...row.data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${safeFileName(row.name)}.synth-preset.json`
    a.click()
    URL.revokeObjectURL(a.href)
    onUserGesture?.()
  }

  const exportCurrent = () => {
    const data = getPresetSnapshot()
    const label = presetName.trim() || 'synth-preset'
    const payload = { name: label, exportedAt: new Date().toISOString(), ...data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${safeFileName(label)}.synth-preset.json`
    a.click()
    URL.revokeObjectURL(a.href)
    onUserGesture?.()
  }

  const onImportFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const parsed = JSON.parse(String(r.result))
        const raw = parseImportedPresetObject(parsed)
        applyPresetSnapshot(raw)
        onUserGesture?.()
      } catch {
        window.alert('Could not read that preset file.')
      }
    }
    r.readAsText(f)
  }

  return (
    <div className={`mb-3 ${u.panel}`}>
      <p className={u.labelCapsTight}>Presets</p>
      <p className={u.body}>
        Saves all four parts, drum kit, filter, effects, and part selection.
        Stored in this browser; export a file to back up or share.
      </p>
      {!drumMode && applyFactorySynthPreset ? (
        <div className={u.starterInset}>
          <p className={u.labelCaps}>Starter synth sounds</p>
          <p className={u.bodyDim}>
            Leads, pads, pluck, electric keys, and grand piano, string ensemble, and
            solo strings. Piano and strings use bundled MP3 multi-samples; the rest
            are virtual-analog. Loads all four parts, filter, and effects. Drum kit
            unchanged.
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {SYNTH_FACTORY_PRESETS.map((p) => {
              const isOn = activeFactoryPresetId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onUserGesture?.()
                    applyFactorySynthPreset(p.getPatch(), p.id)
                  }}
                  className={`min-w-0 px-2 py-1.5 text-left text-xs font-medium active:opacity-90 ${u.pill(isOn)}`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="text"
          placeholder="Name"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          className={u.textInput}
          aria-label="New preset name"
        />
        <button type="button" onClick={save} className={u.btnPrimary}>
          Save current
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={exportCurrent} className={u.btnGhostSm}>
          Export to file
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className={u.btnGhostSm}
        >
          Import from file
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
      </div>
      {userPresets.length > 0 ? (
        <ul
          className={`max-h-40 space-y-1.5 overflow-y-auto pt-2 ${obsidianChrome || synthwaveChrome ? 'border-t border-hairline' : 'border-t border-zinc-800/80'}`}
        >
          {userPresets.map((row) => (
            <li key={row.id} className={u.presetRow}>
              <span className={u.presetName}>{row.name}</span>
              <button type="button" onClick={() => load(row)} className={u.presetLoadBtn}>
                Load
              </button>
              <button type="button" onClick={() => exportRow(row)} className={u.presetExportBtn}>
                Export
              </button>
              <button type="button" onClick={() => remove(row.id)} className={u.presetRemoveBtn}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={`pt-2 text-[11px] ${obsidianChrome || synthwaveChrome ? 'border-t border-hairline text-on-surface-variant' : 'border-t border-zinc-800/80 text-zinc-600'}`}
        >
          No saved presets yet.
        </p>
      )}
    </div>
  )
}
