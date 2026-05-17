import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMetronomeSystemStatus } from '../hooks/useMetronomeSystemStatus.js'
import { useDocumentVisualLayout } from '../hooks/useDocumentVisualLayout.js'
import { useSynthwaveMetronomeSubView } from '../hooks/useSynthwaveMetronomeSubView.js'
import { APP_TAB_PATH } from '../lib/appRoutes.js'

/**
 * Signed-in top app bar — Stitch DS (`bg-app-bar`, hairline border, chrome typography).
 * Light: white bar, slate accents, timer brand icon, title left / account right (studio HTML mock).
 * Synthwave: cyan glass bar + magenta brand (Stitch HTML shell).
 * On Tuner tab, optional `tunerReferenceHz` shows Reference A4 line next to actions.
 */
export default function AppShellHeader({
  tab,
  met,
  tunerReferenceHz,
  onOpenAccount,
  onOpenMetronomeSettings,
}) {
  const navigate = useNavigate()
  const visualLayout = useDocumentVisualLayout()
  const sw = visualLayout === 'synthwave'
  const lm = visualLayout === 'light'
  const swMetFace = useSynthwaveMetronomeSubView()
  const { systemStatus, systemStatusError } = useMetronomeSystemStatus()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsWrapRef = useRef(null)

  useEffect(() => {
    if (!notificationsOpen) return
    const onDoc = (e) => {
      const el = notificationsWrapRef.current
      if (!el || el.contains(e.target)) return
      setNotificationsOpen(false)
    }
    document.addEventListener('pointerdown', onDoc, true)
    return () => document.removeEventListener('pointerdown', onDoc, true)
  }, [notificationsOpen])

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const title = 'Tempo Trainer Pro'
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch {
      /* user cancelled or unsupported */
    }
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }, [])

  const openTuner = () => navigate(APP_TAB_PATH.tuner)

  const iconRailBtn = sw
    ? 'flex h-10 w-10 items-center justify-center rounded-lg text-cyan-400/60 transition-colors hover:text-pink-400 hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]'
    : lm
      ? 'flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100 active:scale-95'
      : 'flex h-10 w-10 items-center justify-center rounded-lg text-chrome-muted transition-colors hover:bg-surface-container-low hover:text-chrome'

  const accountBtnClass = sw
    ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-cyan-400 transition-colors hover:text-pink-400 hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.6)] active:brightness-125 active:scale-95'
    : lm
      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 active:scale-95'
      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-container-low text-on-surface transition-colors hover:border-primary/40 hover:text-primary'

  const brandIcon = lm ? 'timer' : 'rocket_launch'

  const brandBlock = (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className={`material-symbols-outlined shrink-0 ${lm ? 'text-slate-700' : 'text-chrome'}`}
        aria-hidden
        style={lm ? undefined : { fontVariationSettings: "'FILL' 1" }}
      >
        {brandIcon}
      </span>
      <img
        className={lm ? 'hidden' : 'hidden h-8 w-8 shrink-0 rounded-md object-contain sm:block'}
        src="/favicon.svg"
        width={32}
        height={32}
        alt=""
        decoding="async"
        fetchPriority="low"
      />
      <h1 className={`truncate tracking-tighter ${lm ? 'font-inter text-lg font-black text-slate-900' : 'shell-title-drop text-xs font-bold uppercase text-chrome'}`}>
        Tempo Trainer Pro
      </h1>
    </div>
  )

  const synthwaveBrandBlock = (
    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <span className="truncate font-space-grotesk text-xl font-black uppercase tracking-[0.2em] text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">
        TEMPO TRAINER PRO
      </span>
    </div>
  )

  const accountButton = (
    <button type="button" className={accountBtnClass} onClick={onOpenAccount} aria-label="Account menu" title="Account">
      <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
        account_circle
      </span>
    </button>
  )

  const menuButtonSw = (
    <button
      type="button"
      className="flex h-10 w-10 shrink-0 items-center justify-center text-cyan-400 transition-colors hover:text-pink-400 hover:drop-shadow-[0_0_8px_rgba(236,72,153,0.6)] active:brightness-125 active:scale-95"
      onClick={onOpenAccount}
      aria-label="Menu"
      title="Account"
    >
      <span className="material-symbols-outlined text-[24px]">menu</span>
    </button>
  )

  const railClusterDefault = (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {tab === 'tuner' && typeof tunerReferenceHz === 'number' ? (
        <div className="mr-1 flex shrink-0 flex-col items-end leading-none">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${lm ? 'text-on-surface-variant' : 'text-outline'}`}>
            Reference
          </span>
          <span className={`font-display-numeral text-[11px] tracking-tight sm:text-xs ${lm ? 'text-primary' : 'text-chrome'}`}>
            A4={Math.round(tunerReferenceHz)}Hz
          </span>
        </div>
      ) : null}

      {tab === 'synth' && met ? (
        <span className="max-w-[4.5rem] truncate text-[10px] font-bold uppercase tracking-wide text-tertiary sm:max-w-none sm:text-[11px]">
          BPM: {Math.round(met.bpm)}
        </span>
      ) : null}

      {tab === 'synth' ? (
        <button type="button" className={iconRailBtn} aria-label="Open tuner" title="Tuner" onClick={openTuner}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            tune
          </span>
        </button>
      ) : null}

      <div className="relative" ref={notificationsWrapRef}>
        <button
          type="button"
          className={iconRailBtn}
          aria-expanded={notificationsOpen}
          aria-haspopup="dialog"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => setNotificationsOpen((v) => !v)}
        >
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </button>
        {notificationsOpen ? (
          <div
            className="absolute right-0 top-[calc(100%+8px)] z-[190] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-surface-container-low p-4 text-left shadow-xl"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Status</div>
            <div className="mt-2 text-sm leading-relaxed text-on-surface">
              {systemStatus?.maintenance_mode ? (
                <p>
                  <strong className="text-secondary">Maintenance mode.</strong>{' '}
                  {systemStatus.banner_message || 'Some features may be unavailable.'}
                </p>
              ) : systemStatus?.banner_message ? (
                <p>{systemStatus.banner_message}</p>
              ) : (
                <p className="text-on-surface-variant">No announcements right now.</p>
              )}
              {systemStatusError ? (
                <p className="mt-2 text-xs text-secondary">Could not refresh status: {systemStatusError}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <button type="button" className={iconRailBtn} aria-label="Share" title="Share" onClick={handleShare}>
        <span className="material-symbols-outlined text-[24px]">share</span>
      </button>

      <button type="button" className={iconRailBtn} aria-label="Metronome settings" title="Settings" onClick={onOpenMetronomeSettings}>
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          settings
        </span>
      </button>
    </div>
  )

  const railClusterSynthwave = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      {tab === 'tuner' && typeof tunerReferenceHz === 'number' ? (
        <div className="mr-1 hidden flex-col items-end leading-none sm:flex">
          <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/55">Reference</span>
          <span className="font-display-numeral text-[11px] tracking-tight text-secondary-fixed-dim">A4={Math.round(tunerReferenceHz)}Hz</span>
        </div>
      ) : null}
      {tab === 'synth' && met ? (
        <span className="max-w-[4.5rem] truncate text-[10px] font-bold uppercase tracking-wide text-secondary-fixed-dim sm:max-w-none sm:text-[11px]">
          BPM: {Math.round(met.bpm)}
        </span>
      ) : null}
      {tab === 'synth' ? (
        <button type="button" className={iconRailBtn} aria-label="Open tuner" title="Tuner" onClick={openTuner}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            tune
          </span>
        </button>
      ) : null}
      {tab === 'metronome' && swMetFace === 'grid' ? (
        <span className="hidden rounded border border-cyan-400/20 px-2 font-space-grotesk text-[12px] font-medium uppercase tracking-widest text-cyan-400 sm:inline">
          SYNC: ACTIVE
        </span>
      ) : null}
      <button type="button" className={iconRailBtn} aria-label="Metronome settings" title="Settings" onClick={onOpenMetronomeSettings}>
        <span className="material-symbols-outlined text-[24px]">settings</span>
      </button>
    </div>
  )

  return (
    <header
      data-app-shell-header
      className={`fixed left-0 right-0 top-0 z-[180] flex items-center px-4 pt-[env(safe-area-inset-top)] sm:px-6 ${
        lm ? 'h-auto min-h-14 border-b border-slate-300 bg-white px-6' : sw ? 'min-h-16' : 'min-h-16'
      } ${
        sw
          ? ''
          : lm
            ? 'border-b border-slate-300 bg-white shadow-sm'
            : 'border-b border-hairline bg-app-bar shadow-[0_4px_10px_rgba(0,0,0,0.8)]'
      }`}
    >
      <div
        className={`-mt-[env(safe-area-inset-top)] flex w-full items-center gap-3 ${lm ? 'min-h-16 py-1' : sw ? 'h-16 min-h-16' : 'h-16 min-h-16'}`}
      >
        {lm ? (
          <>
            {brandBlock}
            {railClusterDefault}
            {accountButton}
          </>
        ) : sw ? (
          <>
            {menuButtonSw}
            {synthwaveBrandBlock}
            {railClusterSynthwave}
          </>
        ) : (
          <>
            {accountButton}
            {brandBlock}
            {railClusterDefault}
          </>
        )}
      </div>
    </header>
  )
}
