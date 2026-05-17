import './App.css'
import Metronome from './components/Metronome.jsx'
import { Suspense, lazy, startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import AuthGate from './components/AuthGate.jsx'
import UserAccountDrawer from './components/UserAccountDrawer.jsx'
import { useAuth } from './context/useAuth'
import { useMetronome } from './hooks/useMetronome'
import AudioSessionPrimer from './components/AudioSessionPrimer.jsx'
import SynthAppBoundary from './components/SynthAppBoundary.jsx'
import MetronomeFloatingHud from './components/MetronomeFloatingHud.jsx'
import AppShellHeader from './components/AppShellHeader.jsx'
import { IosPdfReaderProvider } from './context/IosPdfReaderContext.jsx'
import TabPanelFallback from './components/TabPanelFallback.jsx'
import { useSharedAudioContext } from './hooks/useSharedAudioContext'
import { useSynthMetronomeBridge } from './hooks/useSynthMetronomeBridge'
import { useBottomNavInsetCssVar } from './hooks/useBottomNavInsetCssVar'
import { useExerciseProgressRemote } from './hooks/useExerciseProgressRemote'
import { useFirstPointerAudioUnlock } from './hooks/useFirstPointerAudioUnlock'
import { APP_TAB_PATH, getTabFromPathname, isShellForeignPath } from './lib/appRoutes.js'
import { applyDocumentThemeForVisualLayout, readMetronomeVisualLayout } from './lib/metronomeVisualLayout.js'
import { scheduleIdleTask } from './lib/scheduleIdle.js'
import { hasSeenWalkthrough } from './lib/walkthrough.js'

/** Match embedded Synth lab header state to the synth-app tab’s persisted layout. */
function readEmbeddedSynthPlayLayout() {
  try {
    const s = typeof localStorage !== 'undefined' ? localStorage.getItem('synth-app-play-layout') : null
    if (s === 'piano' || s === 'drum' || s === 'both') return s
  } catch {
    /* */
  }
  return /** @type {'piano' | 'drum' | 'both'} */ ('both')
}

const Tuner = lazy(() => import('./components/Tuner.jsx'))
const SetlistManager = lazy(() => import('./components/SetlistManager.jsx'))
const ExerciseProgress = lazy(() => import('./components/ExerciseProgress.jsx'))
const SynthApp = lazy(() => import('@synth/App.jsx'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard.jsx'))
const Walkthrough = lazy(() => import('./components/Walkthrough.jsx'))
const SynthLabShell = lazy(() => import('./components/SynthLabShell.jsx'))
const SettingsPage = lazy(() => import('./components/SettingsPage.jsx'))

function PhonePreviewFrame() {
  const location = useLocation()
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // Only expose this helper in local preview.
  if (!isLocalhost) return <Navigate to={APP_TAB_PATH.metronome} replace />

  const innerPath = location.pathname.replace(/^\/__phone/, '') || '/'
  const src = `${innerPath}${location.search || ''}${location.hash || ''}`

  return (
    <div className="min-h-[100dvh] bg-[#0b0b12] px-4 py-6 text-on-background">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-chrome/70">
            Phone preview (local)
          </div>
          <a
            className="text-xs font-semibold tracking-wider text-primary hover:underline"
            href={src}
            target="_blank"
            rel="noreferrer"
          >
            Open without frame →
          </a>
        </div>

        <div className="flex justify-center">
          <div
            className="relative w-[390px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[44px] border border-white/10 bg-black shadow-[0_30px_120px_rgba(0,0,0,0.75)]"
            style={{ height: '844px' }}
          >
            <div className="pointer-events-none absolute left-1/2 top-3 h-7 w-40 -translate-x-1/2 rounded-full bg-black/90" />
            <iframe
              title="Phone preview"
              src={src}
              className="h-full w-full border-0"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminGate() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <TabPanelFallback />
  if (!user || !isAdmin) return <Navigate to={APP_TAB_PATH.metronome} replace />
  return (
    <Suspense fallback={<TabPanelFallback />}>
      <AdminDashboard />
    </Suspense>
  )
}

/** Bottom nav — Stitch synthwave 05/06/07; light studio pills; obsidian chrome line. */
function BottomNavLink({ to, end, icon, label, onClick, visualLayout }) {
  const sw = visualLayout === 'synthwave'
  const lm = visualLayout === 'light'
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      data-bottom-nav-link
      className={({ isActive }) =>
        [
          'relative flex min-w-0 max-w-[5.5rem] flex-1 flex-col items-center justify-center outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary/40',
          lm && !sw
            ? 'rounded-sm px-2 py-1 transition-transform duration-200 active:scale-95'
            : !sw
              ? 'gap-0.5 rounded-ds-lg px-2 py-2 transition-colors duration-200 ease-in-out active:scale-[0.97]'
              : 'px-2 py-2 transition-colors duration-150',
          sw && isActive
            ? 'border-t-2 border-pink-500 pt-1 font-space-grotesk text-[10px] font-bold uppercase tracking-tighter text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]'
            : sw && !isActive
              ? 'pt-1 font-space-grotesk text-[10px] font-bold uppercase tracking-tighter text-cyan-400/50 hover:text-cyan-400'
              : lm && isActive
                ? 'bg-slate-50 font-bold text-primary-container'
                : lm && !isActive
                  ? 'text-slate-400 hover:text-primary-container'
                  : isActive
                    ? 'chrome-text-glow-strong font-bold text-chrome'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-chrome-hover',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !sw && !lm ? (
            <span className="chrome-active-line-shadow absolute top-0 left-1/2 h-0.5 w-8 max-w-[70%] -translate-x-1/2 rounded-full bg-chrome" aria-hidden />
          ) : null}
          <span
            className={`material-symbols-outlined text-[22px] ${lm && !sw ? '' : !sw ? 'mb-px' : ''} ${sw && isActive ? 'text-pink-500' : ''}`}
            style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            aria-hidden
          >
            {icon}
          </span>
          <span
            className={`text-[10px] font-bold uppercase ${lm && !sw ? 'mt-1 font-inter tracking-widest' : sw ? 'font-space-grotesk tracking-tighter' : !sw ? 'tracking-widest' : ''}`}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

function MetronomeAppShell() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { getSharedAudioContext } = useSharedAudioContext()
  const { exerciseProgressRef, exerciseRemote, onExerciseProgressLoaded } = useExerciseProgressRemote(user?.id)

  const isLocalhostPreview =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const shellEnabled = Boolean(user) || isLocalhostPreview

  const [stageMode, setStageMode] = useState(false)
  const [floatHud, setFloatHud] = useState(() => ({ userId: null, engaged: false }))

  const tab = getTabFromPathname(location.pathname) ?? 'metronome'

  useEffect(() => {
    if (!shellEnabled) return
    const p = location.pathname.replace(/\/+$/, '') || '/'
    if (p === '/') startTransition(() => navigate(APP_TAB_PATH.metronome, { replace: true }))
  }, [shellEnabled, location.pathname, navigate])

  useEffect(() => {
    if (!shellEnabled) return
    const cancel = scheduleIdleTask(
      () => {
        void import('./components/Tuner.jsx')
        void import('./components/SetlistManager.jsx')
        void import('./components/ExerciseProgress.jsx')
        void import('./components/SynthLabShell.jsx')
        void import('./components/SettingsPage.jsx')
        void import('@synth/App.jsx')
        void import('./components/AdminDashboard.jsx')
        void import('./components/Walkthrough.jsx')
      },
      { timeout: 6000 },
    )
    return cancel
  }, [shellEnabled])

  const {
    synthRef,
    runSynthFromSongRef,
    lastSynthSnapshot,
    setLastSynthSnapshot,
    setStagedSynthImport,
  } = useSynthMetronomeBridge(tab)

  const met = useMetronome({
    initialBpm: 120,
    initialTimeSignature: '4/4',
    initialSubdivision: 'quarter',
    getAudioContext: getSharedAudioContext,
    synthApplierRef: runSynthFromSongRef,
    exerciseProgressRef,
    onExerciseProgressLoaded,
  })
  const metRef = useRef(met)
  useLayoutEffect(() => {
    metRef.current = met
  }, [met])
  const onPdfReaderClosed = useCallback(() => {
    metRef.current?.syncAudioAfterInterruption?.()
  }, [])

  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false)
  const [visualLayout, setVisualLayout] = useState(() => readMetronomeVisualLayout())
  const [synthRecording, setSynthRecording] = useState(false)
  const [embeddedSynthPlayLayout, setEmbeddedSynthPlayLayout] = useState(readEmbeddedSynthPlayLayout)
  const metronomeRef = useRef(null)
  const [pendingOpenMetronomeSettings, setPendingOpenMetronomeSettings] = useState(false)
  const [tunerReferencePitch, setTunerReferencePitch] = useState(440)
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)
  const walkthroughAutoCheckedRef = useRef(false)

  useLayoutEffect(() => {
    applyDocumentThemeForVisualLayout(visualLayout)
  }, [visualLayout])

  useEffect(() => {
    if (!user) return
    if (walkthroughAutoCheckedRef.current) return
    walkthroughAutoCheckedRef.current = true
    if (!hasSeenWalkthrough()) {
      setWalkthroughOpen(true)
    }
  }, [user])

  useEffect(() => {
    if (tab !== 'metronome' || !pendingOpenMetronomeSettings) return
    const id = requestAnimationFrame(() => {
      metronomeRef.current?.openSettings?.()
      setPendingOpenMetronomeSettings(false)
    })
    return () => cancelAnimationFrame(id)
  }, [tab, pendingOpenMetronomeSettings])

  const openMetronomeSettingsFromShell = useCallback(() => {
    startTransition(() => navigate(APP_TAB_PATH.settings))
  }, [navigate])

  const openAdvancedMetronomeFromSettings = useCallback(() => {
    startTransition(() => {
      navigate(APP_TAB_PATH.metronome)
      setPendingOpenMetronomeSettings(true)
    })
  }, [navigate])

  const floatHudActive =
    Boolean(user) &&
    floatHud.engaged &&
    floatHud.userId === user?.id &&
    tab !== 'metronome' &&
    tab !== 'settings'

  const ensureAudio = met.audio?.ensure
  useFirstPointerAudioUnlock(ensureAudio)

  const showBottomNav = shellEnabled
  const bottomNavRef = useRef(null)
  useBottomNavInsetCssVar({ showBottomNav, bottomNavRef, tab, user })

  if (shellEnabled) {
    const tabCheck = getTabFromPathname(location.pathname)
    if (tabCheck === null && !isShellForeignPath(location.pathname)) {
      return <Navigate to={APP_TAB_PATH.metronome} replace />
    }
  }

  const shellSurfaceCard =
    'rounded-ds-xl border border-hairline bg-surface-container-low text-on-background shadow-[var(--ds-shadow)]'

  return (
    <IosPdfReaderProvider onAfterClose={onPdfReaderClosed}>
      <div
        className={`min-h-[100dvh] bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container ${
          visualLayout === 'synthwave' ? 'font-space-grotesk' : 'font-body-md'
        }`}
      >
        {shellEnabled && tab !== 'settings' ? (
          <AppShellHeader
            tab={tab}
            met={met}
            tunerReferenceHz={tab === 'tuner' ? tunerReferencePitch : undefined}
            onOpenAccount={() => setAccountDrawerOpen(true)}
            onOpenMetronomeSettings={openMetronomeSettingsFromShell}
          />
        ) : null}

        <UserAccountDrawer open={accountDrawerOpen} onClose={() => setAccountDrawerOpen(false)} />

        {user ? <MetronomeFloatingHud met={met} active={floatHudActive} /> : null}

        <div
          className={`mx-auto flex w-full min-w-0 max-w-6xl flex-col items-stretch overflow-x-hidden ${
            shellEnabled
              ? tab === 'settings'
                ? 'px-0 pb-28 pt-0'
                : tab === 'metronome'
                  ? 'px-3 pt-[calc(env(safe-area-inset-top,0px)+var(--ds-shell-header-stack)+0.75rem)] pb-28 sm:px-8 sm:pt-[calc(env(safe-area-inset-top,0px)+var(--ds-shell-header-stack)+1.25rem)]'
                  : 'px-3 pt-[calc(env(safe-area-inset-top,0px)+var(--ds-shell-header-stack)+1.5rem)] pb-28 sm:px-8 sm:pt-[calc(env(safe-area-inset-top,0px)+var(--ds-shell-header-stack)+2rem)]'
              : 'min-h-[100dvh] max-w-none p-0'
          }`}
        >
          {!shellEnabled ? (
            <AuthGate />
          ) : (
            <>
              {tab === 'metronome' ? (
                <Metronome
                  ref={metronomeRef}
                  met={met}
                  visualLayout={visualLayout}
                  setVisualLayout={setVisualLayout}
                  onStageModeChange={setStageMode}
                  onEngageFromMainPage={() => setFloatHud({ userId: user?.id ?? null, engaged: true })}
                  synthBridge={{
                    synthRef,
                    lastSynthSnapshot,
                    setLastSynthSnapshot,
                    setStagedSynthImport,
                  }}
                />
              ) : null}

              {tab === 'tuner' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <Tuner getAudioContext={getSharedAudioContext} onReportReferencePitch={setTunerReferencePitch} />
                </Suspense>
              ) : null}

              {tab === 'setlists' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  {visualLayout === 'obsidian' ? (
                    <div className="mx-auto flex w-full max-w-md flex-col gap-4 text-left">
                      <section className="rounded-ds-lg border-t border-hairline bg-surface-container-low p-4 shadow-[var(--ds-shadow)]">
                        <p className="font-label-caps text-[10px] tracking-[0.2em] text-chrome/85">Setlists</p>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          Save songs and organize performance setlists.
                        </p>
                      </section>
                      <section className="rounded-ds-lg border border-hairline bg-surface-container-lowest p-4 shadow-[var(--ds-shadow)]">
                        <SetlistManager
                          met={met}
                          stageMode={stageMode}
                          setStageMode={setStageMode}
                          visualLayout={visualLayout}
                        />
                      </section>
                    </div>
                  ) : visualLayout === 'synthwave' ? (
                    <div className="mx-auto w-full max-w-md space-y-4 border border-cyan-400/20 bg-surface-container-lowest/90 p-4 text-left font-space-grotesk shadow-[0_0_24px_rgb(236_72_153_/_0.06)]">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/90">Setlists</div>
                        <div className="mt-1 text-sm text-on-surface-variant">
                          Save songs and organize performance setlists.
                        </div>
                      </div>
                      <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} visualLayout={visualLayout} />
                    </div>
                  ) : (
                    <div className={`${shellSurfaceCard} p-8 text-left`}>
                      <div className="mb-6 flex items-center justify-between gap-6">
                        <div>
                          <div className="font-headline-md text-on-surface">Setlists</div>
                          <div className="mt-1 font-body-md text-on-surface-variant">
                            Save songs and organize performance setlists.
                          </div>
                        </div>
                      </div>
                      <SetlistManager met={met} stageMode={stageMode} setStageMode={setStageMode} visualLayout={visualLayout} />
                    </div>
                  )}
                </Suspense>
              ) : null}

              {tab === 'practice' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  {visualLayout === 'obsidian' ? (
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 text-left">
                      <section className="rounded-ds-lg border-t border-hairline bg-surface-container-low p-4 shadow-[var(--ds-shadow)]">
                        <p className="font-label-caps text-[10px] tracking-[0.2em] text-chrome/85">Practice</p>
                        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                          Log sessions against your sheet library, attach PDF links, and review your history. Open the
                          sheet library to browse course PDFs and custom exercises.
                        </p>
                      </section>
                      <ExerciseProgress
                        met={met}
                        userId={user?.id ?? null}
                        exerciseRemote={exerciseRemote}
                        exerciseProgressRef={exerciseProgressRef}
                        visualLayout={visualLayout}
                      />
                    </div>
                  ) : visualLayout === 'synthwave' ? (
                    <div
                      className={`mx-auto w-full max-w-3xl border border-cyan-400/20 bg-surface-container-lowest/90 p-4 text-left shadow-[0_0_24px_rgb(236_72_153_/_0.06)] sm:p-6 font-space-grotesk`}
                    >
                      <ExerciseProgress
                        met={met}
                        userId={user?.id ?? null}
                        exerciseRemote={exerciseRemote}
                        exerciseProgressRef={exerciseProgressRef}
                        visualLayout={visualLayout}
                      />
                    </div>
                  ) : (
                    <div className={`${shellSurfaceCard} p-6 text-left sm:p-8`}>
                      <ExerciseProgress
                        met={met}
                        userId={user?.id ?? null}
                        exerciseRemote={exerciseRemote}
                        exerciseProgressRef={exerciseProgressRef}
                        visualLayout={visualLayout}
                      />
                    </div>
                  )}
                </Suspense>
              ) : null}

              {tab === 'synth' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <div
                    className={`flex min-h-[min(calc(100dvh-7.5rem),880px)] w-full min-w-0 flex-col overflow-hidden ${
                      visualLayout === 'obsidian'
                        ? 'rounded-lg border border-hairline bg-background'
                        : visualLayout === 'synthwave'
                          ? 'rounded-sm border border-cyan-400/25 bg-background shadow-[0_0_24px_rgb(236_72_153_/_0.06)]'
                          : 'studio-panel-border rounded-lg bg-surface-container-lowest shadow-[var(--ds-shadow)]'
                    }`}
                  >
                    <SynthLabShell
                      met={met}
                      synthRef={synthRef}
                      recordingActive={synthRecording}
                      visualLayout={visualLayout}
                      lightLabPlayLayout={embeddedSynthPlayLayout}
                      onOpenMetronomeSettings={() => metronomeRef.current?.openSettings?.()}
                    >
                      <SynthAppBoundary>
                        <SynthApp
                          ref={synthRef}
                          embedded
                          hideTopBar
                          stitchObsidianChrome={visualLayout === 'obsidian'}
                          stitchSynthwaveChrome={visualLayout === 'synthwave'}
                          stitchLightLabChrome={visualLayout === 'light'}
                          onEmbeddedPlayLayoutChange={setEmbeddedSynthPlayLayout}
                          onRecordingChange={setSynthRecording}
                          onSnapshotForMetronome={setLastSynthSnapshot}
                        />
                      </SynthAppBoundary>
                    </SynthLabShell>
                  </div>
                </Suspense>
              ) : null}

              {tab === 'settings' ? (
                <Suspense fallback={<TabPanelFallback />}>
                  <SettingsPage
                    visualLayout={visualLayout}
                    setVisualLayout={setVisualLayout}
                    getSharedAudioContext={getSharedAudioContext}
                    onOpenAccount={() => setAccountDrawerOpen(true)}
                    onOpenAdvancedMetronome={openAdvancedMetronomeFromSettings}
                    onOpenWalkthrough={() => setWalkthroughOpen(true)}
                  />
                </Suspense>
              ) : null}
            </>
          )}
        </div>

        {showBottomNav ? (
          <nav
            ref={bottomNavRef}
            className={`app-bottom-nav fixed bottom-0 left-0 right-0 z-[60] flex min-h-16 items-stretch justify-evenly px-4 [-webkit-tap-highlight-color:transparent] ${
              visualLayout === 'light' ? '' : 'px-1 pb-[env(safe-area-inset-bottom)] pt-1'
            }`}
            role="navigation"
            aria-label="Bottom navigation"
          >
            <BottomNavLink
              to={APP_TAB_PATH.metronome}
              end
              icon={visualLayout === 'light' ? 'timer' : 'speed'}
              label={visualLayout === 'light' || visualLayout === 'synthwave' ? 'Metronome' : 'Tempo'}
              visualLayout={visualLayout}
              onClick={() => setFloatHud((g) => ({ ...g, engaged: false }))}
            />
            <BottomNavLink
              to={APP_TAB_PATH.tuner}
              icon={visualLayout === 'light' ? 'graphic_eq' : visualLayout === 'synthwave' ? 'music_note' : 'tune'}
              label="Tuner"
              visualLayout={visualLayout}
            />
            <BottomNavLink to={APP_TAB_PATH.setlists} icon="queue_music" label="Setlists" visualLayout={visualLayout} />
            <BottomNavLink
              to={APP_TAB_PATH.practice}
              icon={
                visualLayout === 'light' ? 'fitness_center' : visualLayout === 'synthwave' ? 'exercise' : 'analytics'
              }
              label="Practice"
              visualLayout={visualLayout}
            />
            <BottomNavLink
              to={APP_TAB_PATH.synth}
              icon={visualLayout === 'synthwave' ? 'keyboard' : 'piano'}
              label={visualLayout === 'light' || visualLayout === 'synthwave' ? 'Synth Lab' : 'Synth'}
              visualLayout={visualLayout}
            />
          </nav>
        ) : null}

        {shellEnabled ? (
          <AudioSessionPrimer
            getAudioContext={getSharedAudioContext}
            onEnsureWebAudio={ensureAudio}
            bottomOffsetPx={showBottomNav ? 88 : 0}
          />
        ) : null}

        {user && walkthroughOpen ? (
          <Suspense fallback={null}>
            <Walkthrough onClose={() => setWalkthroughOpen(false)} />
          </Suspense>
        ) : null}
      </div>
    </IosPdfReaderProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminGate />} />
      <Route path="/__phone/*" element={<PhonePreviewFrame />} />
      <Route path="/*" element={<MetronomeAppShell />} />
    </Routes>
  )
}
