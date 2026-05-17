import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { APP_TAB_PATH } from '../lib/appRoutes.js'
import {
  METRONOME_VISUAL_LAYOUTS,
  writeMetronomeVisualLayout,
  applyDocumentThemeForVisualLayout,
} from '../lib/metronomeVisualLayout.js'
import { readSynthwaveMetronomeView, writeSynthwaveMetronomeView } from '../lib/metronomeSynthwaveView.js'

const LAYOUT_TITLE = /** @type {const} */ ({
  obsidian: 'Obsidian',
  light: 'Studio light',
  synthwave: 'Synthwave',
})

function SettingsSectionCard({ icon, title, children }) {
  return (
    <section className="group relative flex flex-col gap-4 overflow-hidden rounded-lg border-t border-hairline bg-surface-container-low p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-chrome" aria-hidden>
            {icon}
          </span>
          <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">{title}</h2>
        </div>
        <span className="material-symbols-outlined text-chrome-muted transition-colors group-hover:text-chrome" aria-hidden>
          chevron_right
        </span>
      </div>
      {children}
    </section>
  )
}

/**
 * Obsidian Settings screen (Stitch reference).
 */
export default function SettingsPage({
  visualLayout,
  setVisualLayout,
  getSharedAudioContext,
  onOpenAccount,
  onOpenAdvancedMetronome,
  onOpenWalkthrough,
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sampleRate, setSampleRate] = useState(/** @type {number | null} */ (null))
  const [bufferSamples, setBufferSamples] = useState(/** @type {number | null} */ (null))
  const [midiSupported, setMidiSupported] = useState(false)
  const [synthwaveMetronomeView, setSynthwaveMetronomeView] = useState(() => readSynthwaveMetronomeView())
  useEffect(() => {
    const onSw = () => setSynthwaveMetronomeView(readSynthwaveMetronomeView())
    window.addEventListener('metronome-synthwave-view-changed', onSw)
    return () => window.removeEventListener('metronome-synthwave-view-changed', onSw)
  }, [])
  useEffect(() => {
    setMidiSupported(typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator)
  }, [])

  useEffect(() => {
    try {
      const ctx = getSharedAudioContext?.()
      if (!ctx) return
      const sr = ctx.sampleRate
      const lat = typeof ctx.baseLatency === 'number' ? ctx.baseLatency : null
      setSampleRate(Math.round(sr))
      setBufferSamples(lat != null && sr ? Math.round(lat * sr) : null)
    } catch {
      /* */
    }
  }, [getSharedAudioContext])

  const accountTier = user?.is_anonymous ? 'Guest' : 'Signed in'
  const syncLine = user ? `sync_enabled: ${user.is_anonymous ? 'limited' : 'true'}` : 'sync_enabled: —'

  const meterHeights = useMemo(() => ['h-1/2', 'h-3/4', 'h-2/3', 'h-1/4', 'h-1/2', 'h-5/6', 'h-1/3', 'h-1/6'], [])

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1)
    else navigate(APP_TAB_PATH.metronome)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bar text-on-background">
      <header className="fixed left-0 right-0 top-0 z-[170] flex h-14 shrink-0 items-center border-b border-hairline bg-app-bar px-4 pt-[env(safe-area-inset-top)] shadow-[inset_0_-1px_0_rgb(var(--ds-hairline-rgb)_/_0.55)]">
        <div className="-mt-[env(safe-area-inset-top)] flex h-14 w-full items-center gap-4">
          <button
            type="button"
            className="text-chrome transition-all active:scale-95 active:brightness-125"
            aria-label="Back"
            onClick={goBack}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex min-w-0 flex-col">
            <span className="text-lg font-black uppercase leading-none tracking-widest text-chrome">
              Tempo Trainer Pro
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tight text-chrome-muted">
              Settings
            </span>
          </div>
          <span className="material-symbols-outlined ml-auto text-chrome teal-glow" aria-hidden>
            settings
          </span>
        </div>
      </header>

      <main className="mx-auto mt-14 grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-4 overflow-y-auto overflow-x-hidden p-4 pb-28 md:grid-cols-2">
        <SettingsSectionCard icon="graphic_eq" title="Audio">
          <div className="grid grid-cols-2 gap-3">
            <div className="inset-lcd rounded border border-hairline/50 bg-surface-container-lowest p-3">
              <p className="mb-1 font-meter-label text-meter-label uppercase text-chrome-muted">Sample rate</p>
              <p className="font-display-numeral text-[20px] text-chrome teal-glow">
                {sampleRate != null ? Math.round(sampleRate / 1000) : '—'}
                <span className="ml-1 text-xs opacity-50">kHz</span>
              </p>
            </div>
            <div className="inset-lcd rounded border border-hairline/50 bg-surface-container-lowest p-3">
              <p className="mb-1 font-meter-label text-meter-label uppercase text-chrome-muted">Buffer</p>
              <p className="font-display-numeral text-[20px] text-chrome teal-glow">
                {bufferSamples != null ? bufferSamples : '—'}
                <span className="ml-1 text-xs opacity-50">spls</span>
              </p>
            </div>
          </div>
          <div className="flex h-8 items-end gap-0.5 opacity-20">
            {meterHeights.map((cls, i) => (
              <div key={i} className={`w-full bg-chrome ${cls} ${i === 7 ? '!bg-secondary' : ''}`} />
            ))}
          </div>
          <button
            type="button"
            className="rounded-lg border border-hairline bg-surface-container-low px-3 py-2 text-left font-meter-label text-[11px] uppercase text-primary transition-colors hover:bg-surface-container-high"
            onClick={onOpenAdvancedMetronome}
          >
            Metronome engine, sound & trainer →
          </button>
        </SettingsSectionCard>

        <SettingsSectionCard icon="settings_input_component" title="MIDI">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border border-hairline bg-surface-container-low p-2">
              <span className="text-xs font-bold tracking-tight text-on-surface">Input</span>
              <span className="rounded border border-chrome/30 bg-chrome/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-chrome">
                {midiSupported ? 'Web MIDI' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-hairline bg-surface-container-low p-2">
              <span className="text-xs font-bold tracking-tight text-on-surface">Output</span>
              <span className="rounded border border-hairline px-2 py-0.5 text-[10px] text-chrome-muted">Clock via engine</span>
            </div>
          </div>
        </SettingsSectionCard>

        <SettingsSectionCard icon="palette" title="Display">
          <div
            data-walkthrough="theme-switcher"
            className="inset-lcd flex flex-col gap-3 rounded border border-hairline bg-surface-container-lowest p-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-meter-label text-meter-label uppercase text-chrome-muted">Theme</p>
                <label className="sr-only" htmlFor="settings-visual-layout">
                  Metronome layout
                </label>
                <select
                  id="settings-visual-layout"
                  className="mt-1 max-w-[11rem] cursor-pointer rounded border border-hairline bg-surface-container-low px-2 py-1 text-sm font-bold text-chrome focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={visualLayout}
                  onChange={(e) => {
                    const v = e.target.value
                    if (!METRONOME_VISUAL_LAYOUTS.includes(v)) return
                    const layout = /** @type {'obsidian' | 'light' | 'synthwave'} */ (v)
                    setVisualLayout(layout)
                    writeMetronomeVisualLayout(layout)
                    applyDocumentThemeForVisualLayout(layout)
                  }}
                >
                  {METRONOME_VISUAL_LAYOUTS.map((id) => (
                    <option key={id} value={id}>
                      {LAYOUT_TITLE[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-chrome bg-app-bar teal-glow">
                <div className="h-4 w-4 rounded-full bg-chrome" />
              </div>
            </div>
            {visualLayout === 'synthwave' ? (
              <div>
                <p className="font-meter-label text-meter-label uppercase text-chrome-muted">MATRIX_SYNC face</p>
                <label className="sr-only" htmlFor="settings-synthwave-met-face">
                  Synthwave metronome screen
                </label>
                <select
                  id="settings-synthwave-met-face"
                  className="mt-1 max-w-[11rem] cursor-pointer rounded border border-hairline bg-surface-container-low px-2 py-1 text-sm font-bold text-chrome focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={synthwaveMetronomeView}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v !== 'wheel' && v !== 'grid') return
                    setSynthwaveMetronomeView(v)
                    writeSynthwaveMetronomeView(v)
                  }}
                >
                  <option value="wheel">Wheel (Stitch 05)</option>
                  <option value="grid">Grid (Stitch 06)</option>
                </select>
              </div>
            ) : null}
          </div>
        </SettingsSectionCard>

        <button
          type="button"
          className="group relative flex items-center gap-4 rounded-lg border-t border-hairline bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container-high"
          onClick={onOpenAccount}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-hairline bg-surface-container-lowest">
            <span className="material-symbols-outlined text-3xl text-chrome-muted" aria-hidden>
              account_circle
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-label-caps text-label-caps uppercase text-on-surface-variant">Account</h2>
            <p className="text-xs font-bold text-chrome">{accountTier}</p>
            <p className="text-[10px] text-chrome-muted">{syncLine}</p>
          </div>
          <span className="material-symbols-outlined text-chrome-muted transition-colors group-hover:text-chrome" aria-hidden>
            chevron_right
          </span>
        </button>

        <SettingsSectionCard icon="tour" title="Walkthrough">
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Replay the welcome tour any time — covers the metronome, tuner, setlists, practice
            tools, synth lab, and themes.
          </p>
          <button
            type="button"
            className="self-start rounded-lg border border-hairline bg-surface-container-low px-3 py-2 text-left font-meter-label text-[11px] uppercase text-primary transition-colors hover:bg-surface-container-high"
            onClick={onOpenWalkthrough}
          >
            Replay app walkthrough →
          </button>
        </SettingsSectionCard>
      </main>
    </div>
  )
}
