import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMetronomeSystemStatus } from '../hooks/useMetronomeSystemStatus.js'
import { APP_TAB_PATH } from '../lib/appRoutes.js'

/**
 * Stitch-style fixed header: branding, notifications (system banner), share, settings cog, account.
 */
export default function AppShellHeader({
  tab,
  met,
  onOpenAccount,
  onOpenMetronomeSettings,
}) {
  const navigate = useNavigate()
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

  return (
    <header className="fixed top-0 left-0 right-0 z-[180] flex h-14 items-center border-b border-neutral-800/50 bg-neutral-950 px-4 pt-[env(safe-area-inset-top)] shadow-[inset_0_-1px_0_rgba(0,0,0,0.5)]">
      <div className="-mt-[env(safe-area-inset-top)] flex h-14 w-full items-center gap-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800/80 bg-neutral-900 text-neutral-200 transition-colors hover:border-[#4f98a3]/50 hover:text-[#4f98a3]"
          onClick={onOpenAccount}
          aria-label="Account menu"
          title="Account"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            account_circle
          </span>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            className="h-8 w-8 shrink-0 rounded-md object-contain"
            src="/tempo-trainer-logo.png"
            width={32}
            height={32}
            alt=""
          />
          <h1 className="truncate font-inter text-sm font-black uppercase tracking-widest text-[#4f98a3] drop-shadow-[0_0_8px_rgba(79,152,163,0.6)]">
            Tempo Trainer Pro
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {tab === 'synth' && met ? (
            <span className="max-w-[4.5rem] truncate font-inter text-[10px] font-bold uppercase tracking-wide text-[#76d5e0] sm:max-w-none sm:text-[11px]">
              BPM: {Math.round(met.bpm)}
            </span>
          ) : null}

          {tab === 'synth' ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4f98a3] transition-colors hover:bg-neutral-900"
              aria-label="Open tuner"
              title="Tuner"
              onClick={openTuner}
            >
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                tune
              </span>
            </button>
          ) : null}

          <div className="relative" ref={notificationsWrapRef}>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4f98a3] transition-colors hover:bg-neutral-900"
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
                className="absolute right-0 top-[calc(100%+8px)] z-[190] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-left shadow-xl"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="font-inter text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Status
                </div>
                <div className="mt-2 text-sm leading-relaxed text-neutral-200">
                  {systemStatus?.maintenance_mode ? (
                    <p>
                      <strong className="text-amber-400">Maintenance mode.</strong>{' '}
                      {systemStatus.banner_message || 'Some features may be unavailable.'}
                    </p>
                  ) : systemStatus?.banner_message ? (
                    <p>{systemStatus.banner_message}</p>
                  ) : (
                    <p className="text-neutral-500">No announcements right now.</p>
                  )}
                  {systemStatusError ? (
                    <p className="mt-2 text-xs text-amber-400/90">Could not refresh status: {systemStatusError}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-[#4f98a3]"
            aria-label="Share"
            title="Share"
            onClick={handleShare}
          >
            <span className="material-symbols-outlined text-[24px]">share</span>
          </button>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-[#4f98a3]"
            aria-label="Metronome settings"
            title="Settings"
            onClick={onOpenMetronomeSettings}
          >
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              settings
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
