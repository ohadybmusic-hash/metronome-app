import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { accentShortLabel, accentToNumeric } from '../lib/metronome/beatAccentLabels.js'
import { useMetronomeMidi } from '../hooks/useMetronomeMidi.js'
import { useMetronomePlayFab } from '../hooks/useMetronomePlayFab.js'
import { useMetronomeSystemStatus } from '../hooks/useMetronomeSystemStatus.js'
import { useMetronomeTapTempo } from '../hooks/useMetronomeTapTempo.js'
import { useAuth } from '../context/useAuth'
import { RotaryDial } from './metronome/RotaryDial.jsx'
import { MetronomeLayoutObsidian } from './metronome/layouts/MetronomeLayoutObsidian.jsx'
import { MetronomeLayoutLight } from './metronome/layouts/MetronomeLayoutLight.jsx'
import { MetronomeLayoutSynthwave } from './metronome/layouts/MetronomeLayoutSynthwave.jsx'
import SetlistManager from './SetlistManager.jsx'
import Stepper from './Stepper.jsx'
import './Metronome.css'
import { writeMetronomeVisualLayout } from '../lib/metronomeVisualLayout.js'

// Safari/older canvases may not have roundRect; provide a small fallback.
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const rr = Math.max(0, Math.min(Number(r) || 0, Math.min(w, h) / 2))
    this.moveTo(x + rr, y)
    this.arcTo(x + w, y, x + w, y + h, rr)
    this.arcTo(x + w, y + h, x, y + h, rr)
    this.arcTo(x, y + h, x, y, rr)
    this.arcTo(x, y, x + w, y, rr)
    return this
  }
}

function getModalContainer() {
  if (typeof document === 'undefined' || !document.body) return null
  // Append directly to body so a fixed full-screen layer is not trapped by #modal-root sizing
  // or `pointer-events` rules; also stacks above the bottom nav (z-index 50) reliably.
  return document.body
}

// Tempo name from BPM
function tempoName(bpm) {
  const b = Math.round(bpm)
  if (b >= 220) return 'PRESTISSIMO'
  if (b >= 200) return 'PRESTO'
  if (b >= 168) return 'VIVACE'
  if (b >= 132) return 'ALLEGRO'
  if (b >= 120) return 'ALLEGRETTO'
  if (b >= 108) return 'MODERATO'
  if (b >=  76) return 'ANDANTE'
  if (b >=  66) return 'ADAGIO'
  if (b >=  60) return 'LARGHETTO'
  if (b >=  40) return 'LARGO'
  if (b >=  20) return 'GRAVE'
  return 'LARGHISSIMO'
}

export default forwardRef(function Metronome({
  met,
  onStageModeChange,
  onEngageFromMainPage,
  minimal = false,
  synthBridge,
  visualLayout,
  setVisualLayout,
}, ref) {
  const auth = useAuth()

  const [stageMode, setStageMode] = useState(false)
  const [cloudModalOpen, setCloudModalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsDrawerBodyRef = useRef(null)

  useImperativeHandle(ref, () => ({ openSettings: () => setSettingsOpen(true) }), [])

  useEffect(() => {
    if (!settingsOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [settingsOpen])

  useLayoutEffect(() => {
    if (!settingsOpen) return
    const el = settingsDrawerBodyRef.current
    if (el) el.scrollTop = 0
  }, [settingsOpen])

  // Unlock AudioContext on first user gesture (avoids "no sound" until a tap).
  useEffect(() => {
    let done = false
    const unlock = async () => {
      if (done) return
      done = true
      try {
        // Don't await: keep within user gesture as much as possible.
        met.audio?.ensure?.()
      } catch {
        // ignore
      } finally {
        window.removeEventListener('pointerdown', unlock)
        window.removeEventListener('keydown', unlock)
      }
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [met])

  useMetronomeMidi(met)

  const [screenFlashEnabled, setScreenFlashEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.screenFlash')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return false
  })

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.haptics')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return true
  })

  const [countInEnabled, setCountInEnabled] = useState(() => {
    const saved = localStorage.getItem('metronome.countIn')
    if (saved === 'on') return true
    if (saved === 'off') return false
    return false
  })

  useEffect(() => {
    localStorage.setItem('metronome.haptics', hapticsEnabled ? 'on' : 'off')
  }, [hapticsEnabled])

  useLayoutEffect(() => {
    met.haptics?.setEnabled?.(hapticsEnabled)
  }, [hapticsEnabled, met.haptics])

  useEffect(() => {
    localStorage.setItem('metronome.countIn', countInEnabled ? 'on' : 'off')
    met.countIn?.setEnabled?.(countInEnabled)
  }, [countInEnabled, met.countIn])

  useEffect(() => {
    localStorage.setItem('metronome.screenFlash', screenFlashEnabled ? 'on' : 'off')
  }, [screenFlashEnabled])

  const flashElRef = useRef(null)
  const flashTimersRef = useRef(new Set())
  const isPlayingForFlashRef = useRef(met.isPlaying)
  isPlayingForFlashRef.current = met.isPlaying
  const getAudioTimeForFlashRef = useRef(met.audioClock.getAudioTime)
  getAudioTimeForFlashRef.current = met.audioClock.getAudioTime

  // Flash Mode: CSS overlay synced to AudioContext.currentTime (incl. subdivisions).
  // met.events is memoized in useMetronome so this does not re-subscribe every beat.
  useEffect(() => {
    if (!met?.events?.onScheduledPulse) return
    const unsubscribe = met.events.onScheduledPulse((evt) => {
      if (!screenFlashEnabled) return
      if (!isPlayingForFlashRef.current) return

      const el = flashElRef.current
      if (!el) return

      const nowAudio = getAudioTimeForFlashRef.current()
      if (nowAudio == null) return

      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)
      const level = evt.isMeasureDownbeat ? 1.0 : 0.5
      const color = evt.isMeasureDownbeat ? 'rgba(255, 255, 210, 1)' : 'rgba(255, 255, 255, 1)'

      const t1 = window.setTimeout(() => {
        try {
          el.style.background = color
          el.style.opacity = String(level)
        } catch {
          // ignore
        }
      }, delayMs)
      flashTimersRef.current.add(t1)

      const t2 = window.setTimeout(() => {
        try {
          el.style.opacity = '0'
        } catch {
          // ignore
        } finally {
          flashTimersRef.current.delete(t1)
          flashTimersRef.current.delete(t2)
        }
      }, delayMs + 50)
      flashTimersRef.current.add(t2)
    })

    return () => {
      unsubscribe?.()
      // Intentional: read latest timer Set on teardown (not a ref to a React node).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const s = flashTimersRef.current
      for (const id of s) window.clearTimeout(id)
      s.clear()
    }
  }, [met?.events, screenFlashEnabled])

  // Stage Mode flash: Beat 1 only, semi-transparent white, 50ms.
  useEffect(() => {
    if (!stageMode) return
    if (!met?.events?.onScheduledBeat) return

    const unsubscribe = met.events.onScheduledBeat((evt) => {
      if (!stageMode) return
      if (!isPlayingForFlashRef.current) return
      if (evt?.pulseIndex !== 0) return

      const el = flashElRef.current
      if (!el) return

      const nowAudio = getAudioTimeForFlashRef.current()
      if (nowAudio == null) return

      const delayMs = Math.max(0, (evt.when - nowAudio) * 1000)
      const t1 = window.setTimeout(() => {
        try {
          el.style.background = 'rgba(255, 255, 255, 1)'
          el.style.opacity = '0.3'
        } catch {
          // ignore
        }
      }, delayMs)
      flashTimersRef.current.add(t1)

      const t2 = window.setTimeout(() => {
        try {
          el.style.opacity = '0'
        } catch {
          // ignore
        } finally {
          flashTimersRef.current.delete(t1)
          flashTimersRef.current.delete(t2)
        }
      }, delayMs + 50)
      flashTimersRef.current.add(t2)
    })

    return () => {
      unsubscribe?.()
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const s = flashTimersRef.current
      for (const id of s) window.clearTimeout(id)
      s.clear()
    }
  }, [met?.events, stageMode])

  const bpm = met.bpm

  useEffect(() => {
    onStageModeChange?.(stageMode)
  }, [onStageModeChange, stageMode])

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

  const stageIndex = useMemo(() => {
    if (!stageSongs.length) return -1
    const idx = stageSongs.findIndex((s) => s.id === met.presets.activeSongId)
    return idx >= 0 ? idx : 0
  }, [met.presets.activeSongId, stageSongs])

  const currentStageSong = stageIndex >= 0 ? stageSongs[stageIndex] : null

  useEffect(() => {
    if (!stageMode) return
    if (!stageSongs.length) return
    if (!currentStageSong) return
    // Ensure the active song is applied when entering stage mode.
    // This does not stop the audio engine; it only updates scheduling params.
    met.presets.applySong(currentStageSong)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageMode])

  const goNextSong = () => {
    if (!stageSongs.length) return
    const idx = stageIndex >= 0 ? stageIndex : 0
    const next = stageSongs[(idx + 1) % stageSongs.length]
    if (!next) return
    met.presets.applySong(next)
  }

  const { tapHint, handleTap } = useMetronomeTapTempo(met)
  const { systemStatus, systemStatusError } = useMetronomeSystemStatus()
  const { runPlayUserAction, handlePlayFabClick } = useMetronomePlayFab(met, {
    onAfterStartFromStopped: onEngageFromMainPage,
  })

  const handlePlayFabPointerUp = (e) => {
    runPlayUserAction(e)
  }

  const handlePlayFabTouchEnd = (e) => {
    runPlayUserAction(e)
  }

  // Settings opens from the shell header cog via imperative handle.

  const deviceCanVibrate =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

  const tempoLabel = tempoName(bpm)
  const layoutTransport = {
    met,
    bpm,
    tempoLabel,
    tapHint,
    handleTap,
    handlePlayFabClick,
    handlePlayFabPointerUp,
    handlePlayFabTouchEnd,
  }

  const settingsPortalTarget =
    settingsOpen && typeof document !== 'undefined' ? getModalContainer() : null
  const flashPortalTarget = typeof document !== 'undefined' ? getModalContainer() : null

  return (
    <>
    {flashPortalTarget
      ? createPortal(
          <div ref={flashElRef} className="metronome__flashOverlay" aria-hidden="true" />,
          flashPortalTarget,
        )
      : null}
    <div className="metronome">
      {/* Count-in overlay */}
      {met.countIn?.active ? (
        <div className="metronome__countIn" role="status" aria-live="polite">
          {met.countIn.beatsRemaining <= 3 && met.countIn.beatsRemaining > 0
            ? `${met.countIn.beatsRemaining}…`
            : 'GET READY'}
        </div>
      ) : null}

      {/* System status banners */}
      {systemStatus?.maintenance_mode ? (
        <div className="metronome__status metronome__status--warn" role="status">
          <strong>Maintenance mode</strong>
          <span>{systemStatus.banner_message || 'Some features may be unavailable.'}</span>
        </div>
      ) : systemStatus?.banner_message ? (
        <div className="metronome__status" role="status">
          <span>{systemStatus.banner_message}</span>
        </div>
      ) : null}
      {systemStatusError ? (
        <div className="metronome__status metronome__status--muted" role="status">
          Status unavailable: {systemStatusError}
        </div>
      ) : null}

      {(met.streak?.count > 0 || (met.auth?.isAnonymous && met.presets?.guestSyncPrompt)) ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-1 pb-2">
          {met.streak?.count > 0 ? (
            <div className="metronome__streak" title={`Daily streak: ${met.streak.count}`}>
              <span className="metronome__streakFlame" aria-hidden="true">
                🔥
              </span>
              <span className="metronome__streakNum" aria-label={`Streak ${met.streak.count}`}>
                {met.streak.count}
              </span>
            </div>
          ) : null}
          {met.auth?.isAnonymous && met.presets?.guestSyncPrompt ? (
            <button
              type="button"
              className="metronome__cloudBtn"
              title="Cloud sync"
              aria-label="Cloud sync"
              onClick={() => setCloudModalOpen(true)}
            >
              ☁
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Cloud modal */}
      {cloudModalOpen ? (
        <div className="metronome__modalBackdrop" role="dialog" aria-modal="true" aria-label="Cloud sync">
          <div className="metronome__modal">
            <div className="metronome__modalTitle">Save across devices</div>
            <div className="metronome__modalBody">
              {met.presets?.guestSyncPrompt || 'Create a permanent account to sync your data across devices.'}
            </div>
            <div className="metronome__modalActions">
              <button type="button" className="metronome__btn metronome__btn--primary" onClick={() => auth.linkOAuthIdentity?.({ provider: 'google' })}>Upgrade with Google</button>
              <button type="button" className="metronome__btn" onClick={() => auth.linkOAuthIdentity?.({ provider: 'apple' })}>Upgrade with Apple</button>
              <button type="button" className="metronome__btn" onClick={() => { setCloudModalOpen(false); met.presets?.clearGuestSyncPrompt?.() }}>Not now</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className={`metronome__panel metronome__panel--layout-${visualLayout} flex min-h-0 flex-1 flex-col`}>
        {stageMode ? (
          <div className="metronome__controls">
            <div className="metronome__performance" role="region" aria-label="Performance Mode">
              <div className="metronome__performanceTop">
                <button type="button" className="metronome__btn" onClick={() => setStageMode(false)}>
                  Exit
                </button>
                <div className="metronome__performanceDial">
                  <RotaryDial value={bpm} onChange={(v) => met.setBpm(v)} disabled onTap={handleTap} />
                </div>
              </div>
              <div className="metronome__performanceSongWrap">
                <div className="metronome__performanceLabel">Current song</div>
                <div className="metronome__performanceSong">{currentStageSong?.name || '—'}</div>
                <div className="metronome__performanceMeta">
                  {stageSongs.length ? `Song ${stageIndex + 1} / ${stageSongs.length}` : 'No songs in setlist'}
                </div>
              </div>
              <button type="button" className="metronome__nextSongZone" onClick={goNextSong} disabled={!stageSongs.length}>
                Next Song
              </button>
            </div>
          </div>
        ) : visualLayout === 'obsidian' ? (
          <MetronomeLayoutObsidian {...layoutTransport} />
        ) : visualLayout === 'light' ? (
          <MetronomeLayoutLight {...layoutTransport} />
        ) : (
          <MetronomeLayoutSynthwave {...layoutTransport} />
        )}

        {!stageMode && !minimal ? (
          <div className="metronome__row metronome__row--presets mt-4 shrink-0 border-t border-[var(--border)] pt-4">
            <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} synthBridge={synthBridge} />
          </div>
        ) : null}
      </section>
    </div>

    {settingsPortalTarget
          ? createPortal(
          <div className="metronome__drawerBackdrop" role="dialog" aria-modal="true" aria-label="Settings">
            <button
              type="button"
              className="metronome__drawerScrim"
              aria-label="Close settings"
              onClick={() => setSettingsOpen(false)}
            />
            <div className="metronome__drawer">
              <div className="metronome__drawerHandle" />
              <div className="metronome__drawerHeader">
                <div className="metronome__drawerTitle">Settings</div>
                <button type="button" className="metronome__btn" onClick={() => setSettingsOpen(false)}>
                  Close
                </button>
              </div>

              <div className="metronome__drawerBody" ref={settingsDrawerBodyRef}>
                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Appearance</div>
                  <label className="metronome__label">
                    Metronome layout
                    <select
                      className="metronome__select"
                      value={visualLayout}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v !== 'obsidian' && v !== 'light' && v !== 'synthwave') return
                        setVisualLayout(v)
                        writeMetronomeVisualLayout(v)
                      }}
                    >
                      <option value="obsidian">Obsidian (default)</option>
                      <option value="light">Light rack</option>
                      <option value="synthwave">Synthwave wheel</option>
                    </select>
                  </label>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Feedback</div>
                  <label className="metronome__toggle metronome__toggle--inline">
                    <input type="checkbox" checked={countInEnabled} onChange={(e) => setCountInEnabled(e.target.checked)} />
                    <span>COUNT-IN</span>
                  </label>
                  <label className="metronome__toggle metronome__toggle--inline">
                    <input type="checkbox" checked={screenFlashEnabled} onChange={(e) => setScreenFlashEnabled(e.target.checked)} />
                    <span>FLASH</span>
                  </label>
                  <label
                    className="metronome__toggle metronome__toggle--inline"
                    title={
                      deviceCanVibrate
                        ? 'Vibration on each beat (where supported)'
                        : 'Web vibration is not available in this browser (e.g. iOS Safari)'
                    }
                  >
                    <input type="checkbox" checked={hapticsEnabled} onChange={(e) => setHapticsEnabled(e.target.checked)} />
                    <span>HAPTICS{!deviceCanVibrate ? ' (N/A)' : ''}</span>
                  </label>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Subdivision settings</div>

                  <label className="metronome__label">
                    Rhythm
                    <select className="metronome__select" value={met.timeSignature} onChange={(e) => met.setTimeSignature(e.target.value)}>
                      <option value="2/4">2/4</option>
                      <option value="3/4">3/4</option>
                      <option value="4/4">4/4</option>
                      <option value="5/4">5/4 (3+2)</option>
                      <option value="3/8">3/8</option>
                      <option value="5/8">5/8 (2+3)</option>
                      <option value="6/8">6/8 (3+3)</option>
                      <option value="7/8">7/8 (2+2+3)</option>
                      <option value="9/8">9/8 (3+3+3)</option>
                      <option value="12/8">12/8 (3+3+3+3)</option>
                    </select>
                  </label>

                  <label className="metronome__label">
                    Subdivision
                    <select className="metronome__select" value={met.subdivision} onChange={(e) => met.setSubdivision(e.target.value)}>
                      <option value="quarter">Quarter</option>
                      <option value="eighth">Eighth</option>
                      <option value="triplet">Triplet</option>
                      <option value="sixteenth">Sixteenth</option>
                    </select>
                  </label>

                  <div className="metronome__label" style={{ marginTop: 10 }}>
                    Beat accents (tap to cycle)
                    <div className="metronome__accents" role="group" aria-label="Beat accents (tap to cycle)">
                      {(met.beatAccents || []).map((lvl, idx) => {
                        const numFilled = accentToNumeric(lvl)
                        const levelClass = `metronome__beat--${String(lvl || 'NORMAL').toLowerCase()}`
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`metronome__beat ${levelClass}`}
                            onClick={() => met.cycleBeatAccent(idx)}
                            title={`Beat ${idx + 1}: ${lvl}`}
                            aria-label={`Beat ${idx + 1} accent: ${lvl}`}
                          >
                            {[2, 1, 0].map((tier) => (
                              <div
                                key={tier}
                                className={`beat__block beat__block--b${tier} ${tier < numFilled ? 'beat__block--filled' : 'beat__block--empty'}`}
                              />
                            ))}
                            <div className="beat__label">{accentShortLabel(lvl)}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Rhythm trainer</div>

                  <label className="metronome__toggle metronome__toggle--inline">
                    <input
                      type="checkbox"
                      checked={met.rhythmTrainer?.enabled}
                      onChange={(e) => met.rhythmTrainer?.configure?.({ enabled: e.target.checked })}
                    />
                    <span>Enabled</span>
                  </label>

                  <label className="metronome__label">
                    Mode
                    <select
                      className="metronome__select"
                      value={met.rhythmTrainer?.mode}
                      onChange={(e) => met.rhythmTrainer?.configure?.({ mode: e.target.value })}
                    >
                      <option value="seconds">Seconds</option>
                      <option value="bars">Bars</option>
                    </select>
                  </label>

                  <label className="metronome__label metronome__label--mini">
                    Start BPM
                    <Stepper
                      value={met.rhythmTrainer?.startBpm}
                      min={1}
                      max={400}
                      step={1}
                      onChange={(v) => met.rhythmTrainer?.configure?.({ startBpm: v })}
                    />
                  </label>

                  <label className="metronome__toggle metronome__toggle--inline">
                    <input
                      type="checkbox"
                      checked={Boolean(met.rhythmTrainer?.targetEnabled)}
                      onChange={(e) => met.rhythmTrainer?.configure?.({ targetEnabled: e.target.checked })}
                    />
                    <span>Target BPM (stop when reached)</span>
                  </label>

                  {met.rhythmTrainer?.targetEnabled ? (
                    <label className="metronome__label metronome__label--mini">
                      Target BPM
                      <Stepper
                        value={met.rhythmTrainer?.targetBpm}
                        min={1}
                        max={400}
                        step={1}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ targetBpm: v })}
                      />
                    </label>
                  ) : null}

                  <label className="metronome__label">
                    Increment (BPM per step)
                    <Stepper
                      value={met.rhythmTrainer?.incrementBpm ?? 1}
                      min={0.5}
                      max={50}
                      step={0.5}
                      format={(v) => `${Number(v).toFixed(1)}`}
                      onChange={(v) => met.rhythmTrainer?.configure?.({ incrementBpm: v })}
                    />
                  </label>

                  {met.rhythmTrainer?.mode === 'seconds' ? (
                    <label className="metronome__label">
                      Every (seconds)
                      <Stepper
                        value={met.rhythmTrainer?.everySeconds ?? 5}
                        min={1}
                        max={600}
                        step={1}
                        format={(v) => `${Math.round(v)}s`}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ everySeconds: v })}
                      />
                    </label>
                  ) : (
                    <label className="metronome__label">
                      Every (bars)
                      <Stepper
                        value={met.rhythmTrainer?.everyBars ?? 1}
                        min={1}
                        max={64}
                        step={1}
                        onChange={(v) => met.rhythmTrainer?.configure?.({ everyBars: v })}
                      />
                    </label>
                  )}
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Power features</div>

                  <label className="metronome__label">
                    Gap Training
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.internalClock.enabled} onChange={(e) => met.internalClock.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Bars Audible
                        <input className="metronome__range" type="range" min={1} max={16} value={met.internalClock.playBars} onChange={(e) => met.internalClock.setPlayBars(e.target.value)} />
                        <div className="metronome__rangeValue">{met.internalClock.playBars}</div>
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Bars Silent
                        <input className="metronome__range" type="range" min={0} max={16} value={met.internalClock.muteBars} onChange={(e) => met.internalClock.setMuteBars(e.target.value)} />
                        <div className="metronome__rangeValue">{met.internalClock.muteBars}</div>
                      </label>
                    </div>
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.internalClock.introEnabled} onChange={(e) => met.internalClock.setIntroEnabled(e.target.checked)} />
                      <span>Intro count-in (2 bars)</span>
                    </label>
                  </label>

                  <label className="metronome__label">
                    Polyrhythm
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.polyrhythm.enabled} onChange={(e) => met.polyrhythm.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Main beats
                        <Stepper value={met.polyrhythm.mainBeats} min={1} max={32} step={1} onChange={(v) => met.polyrhythm.setMainBeats(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Poly beats
                        <Stepper value={met.polyrhythm.polyBeats} min={1} max={32} step={1} onChange={(v) => met.polyrhythm.setPolyBeats(v)} />
                      </label>
                    </div>
                  </label>

                  <label className="metronome__label">
                    Automator
                    <label className="metronome__toggle metronome__toggle--inline">
                      <input type="checkbox" checked={met.automator.enabled} onChange={(e) => met.automator.setEnabled(e.target.checked)} />
                      <span>Enabled</span>
                    </label>
                    <div className="metronome__gapGrid">
                      <label className="metronome__label metronome__label--mini">
                        Start BPM
                        <Stepper value={met.automator.startBpm} min={1} max={400} step={1} onChange={(v) => met.automator.setStartBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Target BPM
                        <Stepper value={met.automator.targetBpm} min={1} max={400} step={1} onChange={(v) => met.automator.setTargetBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Increment (BPM)
                        <Stepper value={met.automator.incrementBpm} min={0.5} max={50} step={0.5} format={(v) => `${Number(v).toFixed(1)}`} onChange={(v) => met.automator.setIncrementBpm(v)} />
                      </label>
                      <label className="metronome__label metronome__label--mini">
                        Change Every (Bars)
                        <Stepper value={met.automator.changeEveryBars} min={1} max={64} step={1} onChange={(v) => met.automator.setChangeEveryBars(v)} />
                      </label>
                    </div>
                  </label>
                </div>

                <div className="metronome__drawerSection">
                  <div className="metronome__drawerSectionTitle">Sound</div>

                  <label className="metronome__label">
                    Sound
                    <select className="metronome__select" value={met.sound} onChange={(e) => met.setSound(e.target.value)}>
                      <option value="beep">Beep</option>
                      <option value="voiceNumbers">Voice (numbers)</option>
                      <option value="voiceCount">Voice Counting (One–Four)</option>
                    </select>
                  </label>

                  <label className="metronome__label">
                    Pan
                    <input className="metronome__range" type="range" min={-1} max={1} step={0.01} value={met.pan} onChange={(e) => met.setPan(e.target.value)} />
                    <div className="metronome__rangeValue">{Number(met.pan).toFixed(2)}</div>
                  </label>
                </div>
              </div>
            </div>
          </div>,
          settingsPortalTarget,
            )
          : null}

    </>
  )
})
