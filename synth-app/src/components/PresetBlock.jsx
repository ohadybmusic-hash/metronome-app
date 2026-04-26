import { useEffect, useRef, useState } from 'react'
import {
  loadUserPresets,
  newPresetId,
  parseImportedPresetObject,
  writeUserPresets,
} from '../lib/synthPreset.js'
import { SYNTH_FACTORY_PRESETS } from '../lib/synthFactoryPresets.js'

function safeFileName(s) {
  return String(s)
    .replace(/[<>:"/\\|?*]+/g, '')
    .trim()
    .slice(0, 48) || 'preset'
}

/** Same green accent as the “Load” user-preset control and drum selected pads. */
const STARTER_PRESET_ON = '#39ff14'

export function PresetBlock({
  open,
  drumMode,
  getPresetSnapshot,
  applyPresetSnapshot,
  applyFactorySynthPreset,
  activeFactoryPresetId = null,
  onUserGesture,
}) {
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
    <div className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/20 p-3">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        Presets
      </p>
      <p className="mb-2 text-[11px] text-zinc-500">
        Saves all four parts, drum kit, filter, effects, and part selection.
        Stored in this browser; export a file to back up or share.
      </p>
      {!drumMode && applyFactorySynthPreset ? (
        <div className="mb-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-2.5">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Starter synth sounds
          </p>
          <p className="mb-2 text-[10px] text-zinc-600">
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
                  className={`min-w-0 rounded-md px-2 py-1.5 text-left text-xs font-medium active:opacity-90 ${
                    isOn
                      ? 'ring-1 ring-zinc-500/80'
                      : 'border border-zinc-800 bg-zinc-900/90 text-zinc-200'
                  }`}
                  style={
                    isOn
                      ? {
                          color: STARTER_PRESET_ON,
                          backgroundColor: 'rgba(57, 255, 20, 0.09)',
                          boxShadow: '0 0 0 1px rgba(57, 255, 20, 0.35)',
                        }
                      : undefined
                  }
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
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
          aria-label="New preset name"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 active:bg-zinc-800"
        >
          Save current
        </button>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={exportCurrent}
          className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300"
        >
          Export to file
        </button>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-xs text-zinc-300"
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
        <ul className="max-h-40 space-y-1.5 overflow-y-auto border-t border-zinc-800/80 pt-2">
          {userPresets.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-1.5 rounded-md bg-zinc-950/50 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-200">
                {row.name}
              </span>
              <button
                type="button"
                onClick={() => load(row)}
                className="shrink-0 rounded border border-[#39ff14]/40 bg-[#39ff14]/10 px-2 py-0.5 text-[#39ff14]"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => exportRow(row)}
                className="shrink-0 rounded border border-zinc-700 px-2 py-0.5 text-zinc-400"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => remove(row.id)}
                className="shrink-0 rounded border border-zinc-800 px-2 py-0.5 text-zinc-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-600">
          No saved presets yet.
        </p>
      )}
    </div>
  )
}
