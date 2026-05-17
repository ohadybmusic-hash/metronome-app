import { useEffect, useState } from 'react'
import { useAuth } from '../context/useAuth.js'
import { useDocumentVisualLayout } from '../hooks/useDocumentVisualLayout.js'
import Auth from './Auth.jsx'
import { STITCH_SYNTHWAVE_HERO_IMAGE_URL } from '../lib/metronomeSynthwaveView.js'

function AuthLinkErrorBannerSynthwave({ message, dismiss, busy }) {
  return (
    <div className="mb-6 border border-error/40 bg-error-container/15 px-4 py-3" role="alert">
      <p className="m-0 font-body-md text-body-md text-on-surface">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-none border border-cyan-500/40 px-3 py-2 font-label-sm font-bold uppercase tracking-wide text-secondary-fixed-dim transition-colors hover:border-secondary-container hover:text-secondary-container disabled:opacity-40"
          onClick={() => dismiss()}
          disabled={busy}
        >
          Dismiss
        </button>
      </div>
      <p className="mt-3 font-body-md text-[13px] text-on-surface-variant">Use the access form below with your email and key.</p>
    </div>
  )
}

function AuthLinkErrorBannerDefault({ message, dismiss, busy }) {
  return (
    <div className="border-b border-outline-variant bg-secondary/10 px-6 py-4" role="alert">
      <p className="font-body-md text-body-md text-on-surface">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg border border-outline-variant px-3 py-2 font-label-caps text-label-caps uppercase tracking-wide text-on-surface hover:border-primary hover:text-primary disabled:opacity-40"
          onClick={() => dismiss()}
          disabled={busy}
        >
          Dismiss
        </button>
      </div>
      <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
        Use the terminal form below with your email and access key.
      </p>
    </div>
  )
}

export default function AuthGate() {
  const visualLayout = useDocumentVisualLayout()
  const synthwave = visualLayout === 'synthwave'
  /** Gate chrome follows `data-visual-layout` (default Obsidian; studio when user chose Light in settings). */
  const studioLight = visualLayout === 'light'
  const [gateTab, setGateTab] = useState('signin')

  const { signInWithMagicLink, signInAnonymously, authLinkError, dismissAuthLinkError } = useAuth()
  const [magicEmail, setMagicEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [magicStatus, setMagicStatus] = useState(null)

  useEffect(() => {
    if (!synthwave) return
    document.title = gateTab === 'signin' ? 'TEMPO TRAINER PRO - INITIALIZE' : 'TEMPO TRAINER PRO - REQUEST ACCESS'
    return () => {
      document.title = 'Metronome'
    }
  }, [synthwave, gateTab])

  const continueAsGuest = async () => {
    setBusy(true)
    setMagicStatus(null)
    try {
      await signInAnonymously()
    } catch (err) {
      setMagicStatus(err?.message || 'Failed to continue as guest')
    } finally {
      setBusy(false)
    }
  }

  const sendMagicLink = async (emailOverride) => {
    const e = String(emailOverride ?? magicEmail ?? '').trim()
    if (!e) return
    setBusy(true)
    setMagicStatus(null)
    try {
      await signInWithMagicLink({ email: e })
      setMagicStatus('Magic link sent. Check your email to sign in.')
      if (emailOverride == null) setMagicEmail('')
    } catch (err) {
      setMagicStatus(err?.message || 'Failed to send link')
    } finally {
      setBusy(false)
    }
  }

  const headerTabClass = (active) =>
    active
      ? 'font-bold uppercase tracking-widest text-fuchsia-400 drop-shadow-[0_0_5px_rgba(255,0,255,0.45)] transition-all'
      : 'font-bold uppercase tracking-widest text-cyan-500/70 transition-all hover:text-fuchsia-400 hover:drop-shadow-[0_0_8px_rgba(255,0,255,0.55)]'

  const footerTabClass = (active) =>
    active
      ? 'flex flex-col items-center justify-center border-t-2 border-pink-500 pt-1 text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] transition-all duration-150 active:scale-90'
      : 'flex flex-col items-center justify-center pt-1 text-cyan-400/50 transition-all duration-150 hover:text-cyan-400 active:scale-90'

  if (synthwave) {
    return (
      <div className="relative flex min-h-[max(884px,100dvh)] flex-col overflow-hidden bg-[#0e0e1e] font-space-grotesk text-on-background antialiased selection:bg-primary selection:text-on-primary [-webkit-tap-highlight-color:transparent]">
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[length:32px_32px]"
          aria-hidden
        />
        <div className="pointer-events-none fixed inset-0 z-[5] h-[100px] opacity-10" aria-hidden>
          <div className="h-full w-full bg-[linear-gradient(0deg,rgba(0,0,0,0)_0%,rgba(255,255,255,0.02)_50%,rgba(0,0,0,0)_100%)]" />
        </div>

        <header className="fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="sw-neon-border-cyan flex h-10 w-10 items-center justify-center rounded-sm border border-secondary-container/30 bg-surface-container">
              <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
                timer
              </span>
            </div>
            <h1 className="truncate font-space-grotesk text-2xl font-semibold uppercase leading-8 tracking-[0.2em] text-primary drop-shadow-[0_0_8px_rgba(255,171,243,0.6)]">
              TEMPO TRAINER PRO
            </h1>
          </div>
          <div className="hidden gap-8 md:flex">
            <button type="button" className={headerTabClass(gateTab === 'signin')} onClick={() => setGateTab('signin')}>
              Sign In
            </button>
            <button type="button" className={headerTabClass(gateTab === 'signup')} onClick={() => setGateTab('signup')}>
              Sign Up
            </button>
          </div>
        </header>

        <main className="relative z-20 flex flex-grow flex-col items-center justify-center p-6">
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-10">
            <img className="h-full w-full object-cover" src={STITCH_SYNTHWAVE_HERO_IMAGE_URL} alt="" />
          </div>

          <div className="relative z-20 w-full max-w-md">
            <div className="rounded-lg border border-secondary-container/20 bg-surface-container-lowest/80 p-gutter shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {authLinkError ? (
                <AuthLinkErrorBannerSynthwave message={authLinkError} dismiss={dismissAuthLinkError} busy={busy} />
              ) : null}
              <Auth
                appearance="gate"
                synthwave
                gateAuthMode={gateTab}
                onGateAuthModeChange={setGateTab}
                onSynthwaveMagicLinkRequest={(em) => sendMagicLink(em)}
              />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                { k: 'LATENCY', v: '2.4MS' },
                { k: 'USERS', v: '12.8K' },
                { k: 'VER', v: 'X-900' },
              ].map(({ k, v }) => (
                <div key={k} className="rounded-sm border border-outline-variant/20 bg-surface-container/40 p-2 text-center">
                  <p className="mb-1 block font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.05em] text-outline">{k}</p>
                  <p className="font-mono text-sm text-secondary-container">{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-20 mt-8 w-full max-w-md rounded-none border border-cyan-500/25 bg-[#0d0d1c]/80 p-5 backdrop-blur-md">
            <p className="mb-3 text-center font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-widest text-secondary-fixed-dim/80">
              Alternative uplink (magic link)
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="min-h-[48px] flex-1 rounded-sm border border-outline-variant/50 bg-surface-container-high px-4 py-3 font-mono tracking-widest text-secondary outline-none placeholder:text-outline/30 focus:border-secondary-container focus:ring-0"
                value={magicEmail}
                onChange={(ev) => setMagicEmail(ev.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
                disabled={busy}
                aria-label="Email for magic link"
              />
              <button
                type="button"
                className="min-h-[48px] shrink-0 rounded-sm border border-secondary-container/40 px-4 font-space-grotesk text-[12px] font-semibold uppercase leading-4 tracking-wide text-secondary-fixed-dim transition-colors hover:border-secondary-container hover:bg-secondary-container/10 hover:text-secondary-container disabled:opacity-40"
                onClick={() => sendMagicLink()}
                disabled={busy}
              >
                {busy ? 'Sending…' : 'Send link'}
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-sm border border-dashed border-outline-variant py-3 font-space-grotesk text-[16px] font-normal leading-6 text-on-surface-variant transition-colors hover:border-primary-fixed-dim/50 hover:text-primary-fixed-dim disabled:opacity-40"
              onClick={continueAsGuest}
              disabled={busy}
            >
              Continue as Guest
            </button>
            {magicStatus ? (
              <p className="mt-3 text-center font-space-grotesk text-sm text-secondary-fixed-dim" role="status" aria-live="polite">
                {magicStatus}
              </p>
            ) : null}
            <p className=" mt-3 text-center font-space-grotesk text-[12px] leading-relaxed text-on-surface-variant/75">
              After tapping the email link you’ll return here signed in automatically.
            </p>
          </div>
        </main>

        <footer className="relative z-50 flex flex-col items-center pb-8 pt-4">
          <div className="sw-stitch-horizon-line mb-6 w-full opacity-50" />
          <p className="font-space-grotesk text-[9px] font-medium uppercase tracking-[0.3em] text-outline/40">© 198X-20XX CYBERNETIC RHYTHM CORP</p>
        </footer>

        <nav className="fixed bottom-0 z-50 flex h-20 w-full items-center justify-around border-t border-pink-500/30 bg-[#0e0e1e]/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(236,72,153,0.2)] backdrop-blur-xl md:hidden">
          <button
            type="button"
            className={footerTabClass(gateTab === 'signin')}
            onClick={() => setGateTab('signin')}
            aria-pressed={gateTab === 'signin'}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              login
            </span>
            <span className="font-space-grotesk text-[10px] font-bold tracking-tighter">SIGN IN</span>
          </button>
          <button
            type="button"
            className={footerTabClass(gateTab === 'signup')}
            onClick={() => setGateTab('signup')}
            aria-pressed={gateTab === 'signup'}
          >
            <span className="material-symbols-outlined">person_add</span>
            <span className="font-space-grotesk text-[10px] font-bold tracking-tighter">SIGN UP</span>
          </button>
        </nav>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[max(884px,100dvh)] flex-col items-center justify-center overflow-hidden bg-background p-6 font-body-md text-on-background [-webkit-tap-highlight-color:transparent]">
      <div
        className={`pointer-events-none fixed inset-0 ${studioLight ? 'opacity-[0.45]' : 'opacity-10'}`}
        aria-hidden
        style={{
          backgroundImage: studioLight
            ? 'radial-gradient(circle, rgb(148 163 184 / 0.4) 1px, transparent 1px)'
            : 'radial-gradient(circle, #1e2126 1px, transparent 1px)',
          backgroundSize: '4px 4px',
        }}
      />

      <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-[var(--ds-shadow)]">
        <div className="pointer-events-none absolute right-0 top-0 p-2 opacity-20" aria-hidden>
          <div className="h-4 w-4 border-r border-t border-outline-variant" />
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 p-2 opacity-20" aria-hidden>
          <div className="h-4 w-4 border-l border-b border-outline-variant" />
        </div>

        <header
          className={
            studioLight
              ? 'flex h-16 w-full items-center justify-center border-b border-outline-variant bg-app-bar px-6 shadow-[inset_0_-1px_0_rgb(var(--ds-hairline-rgb)_/_0.35)]'
              : 'flex h-16 w-full items-center justify-center border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-6'
          }
        >
          <div className="flex items-center gap-3">
            <span
              className={
                studioLight
                  ? 'material-symbols-outlined text-2xl text-primary-container'
                  : 'material-symbols-outlined text-2xl text-primary drop-shadow-[0_0_8px_rgba(138,210,222,0.5)]'
              }
            >
              speed
            </span>
            <span
              className={
                studioLight
                  ? 'font-inter text-lg font-black uppercase tracking-[0.2em] text-primary-container'
                  : 'font-inter text-lg font-black uppercase tracking-[0.2em] text-primary drop-shadow-[0_0_8px_rgba(138,210,222,0.5)]'
              }
            >
              Tempo Trainer Pro
            </span>
          </div>
        </header>

        {authLinkError ? <AuthLinkErrorBannerDefault message={authLinkError} dismiss={dismissAuthLinkError} busy={busy} /> : null}

        <div className="px-8 pt-8">
          <Auth appearance="gate" studioLight={studioLight} />
        </div>
      </div>

      <div className="relative z-[1] mt-6 w-full max-w-md rounded-xl border border-outline-variant/70 bg-surface-container-low px-5 py-4">
        <p className="mb-3 text-center font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
          Alternative uplink (magic link)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="min-h-[48px] flex-1 rounded border border-outline-variant bg-surface-container-lowest px-4 py-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            value={magicEmail}
            onChange={(ev) => setMagicEmail(ev.target.value)}
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
            disabled={busy}
            aria-label="Email for magic link"
          />
          <button
            type="button"
            className="min-h-[48px] shrink-0 rounded-lg border border-primary/40 px-4 font-label-caps text-label-caps uppercase tracking-wide text-primary transition-colors hover:bg-primary/15 disabled:opacity-40"
            onClick={() => sendMagicLink()}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send link'}
          </button>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-dashed border-outline-variant py-3 font-body-md text-body-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
          onClick={continueAsGuest}
          disabled={busy}
        >
          Continue as Guest
        </button>
        {magicStatus ? (
          <p className="mt-3 text-center font-body-md text-body-md text-primary-fixed-dim" role="status" aria-live="polite">
            {magicStatus}
          </p>
        ) : null}
        <p className="mt-3 text-center font-body-md text-[12px] leading-relaxed text-on-surface-variant/80">
          After tapping the email link you’ll return here signed in automatically.
        </p>
      </div>

      <div className="pointer-events-none fixed -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" aria-hidden />
      <div className="pointer-events-none fixed -top-20 -left-20 h-96 w-96 rounded-full bg-secondary/5 blur-[100px]" aria-hidden />

      <div className="relative z-[1] mt-8 opacity-40 grayscale transition-all duration-700 hover:opacity-75 hover:grayscale-0">
        <img
          alt="Studio rack hardware motif"
          className="h-12 w-auto rounded object-contain"
          decoding="async"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5q6TOhOeCqOj-QQVow7kDiKYBaHcYtRxlWiLV-uE7kcDIMkuCIwROV9YdtAumi9D8j1m4D1VC308tg04q-ZLE3Tf_n48Q07Mqava0MbKfHGTHeHNcVMHk2TTbWRL6amN_FFdTuaIW6mVp4Nog3fyTHTRRsXaqlj4fYLkdpEtzniE1D_9nQ5jVGo0jhLJKXNvNYm1YXrC5XKC-12ZivHld63qRGHka13cbPKWNBr3QYlBSCF_vkBcrH006MhtINzBC-kcVIvDTjxTQ"
          width={120}
          height={48}
        />
      </div>
    </div>
  )
}
