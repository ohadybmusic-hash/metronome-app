import { useEffect, useState } from 'react'
import { withTimeout } from '../lib/async.js'
import { useAuth } from '../context/useAuth'
import './Auth.css'

const NEON = '#39ff14'

const REQUEST_MS = 28000

const REMEMBER_EMAIL_KEY = 'metronome-auth-remember-email'

/**
 * Email + password sign-in / sign-up. Drawer (neon or studio-light) or fullscreen gate chassis; uses Supabase password auth.
 * @param {object} [props]
 * @param {() => void} [props.onSuccess]  Called after successful session (e.g. close drawer)
 * @param {'drawer' | 'gate'} [props.appearance='drawer']  Drawer list UI vs fullscreen gate shell card body
 * @param {boolean} [props.studioLight]  When `appearance` is drawer + Light Studio layout: recessed fields + gradient primary CTA (no neon).
 * @param {boolean} [props.synthwave=false] Gate: neon “Tempo Trainer Pro” form chrome (AuthGate shell coordinates header/footer).
 * @param {'signin'|'signup'} [props.gateAuthMode] Controlled gate tab (synthwave header + bottom nav).
 * @param {(mode: 'signin'|'signup') => void} [props.onGateAuthModeChange]
 * @param {(email: string) => Promise<void>} [props.onSynthwaveMagicLinkRequest] Terminal icon → magic link with typed email.
 */
export default function Auth({
  onSuccess,
  appearance = 'drawer',
  studioLight = false,
  synthwave = false,
  gateAuthMode,
  onGateAuthModeChange,
  onSynthwaveMagicLinkRequest,
} = {}) {
  const { signIn, signUp, resendSignUp, resetPasswordForEmail, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [info, setInfo] = useState(null)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState(null)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendErr, setResendErr] = useState(null)
  const [resendOk, setResendOk] = useState(false)
  /** Set when signUp repeated for an email that already exists (GoTrue: identities: []; no new email is sent). */
  const [repeatedAccountEmail, setRepeatedAccountEmail] = useState(null)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetInfo, setResetInfo] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [oauthBusy, setOauthBusy] = useState(false)

  const isGate = appearance === 'gate'
  const gateModeControlled =
    synthwave &&
    isGate &&
    (gateAuthMode === 'signin' || gateAuthMode === 'signup') &&
    typeof onGateAuthModeChange === 'function'

  const [modeInternal, setModeInternal] = useState('signin') // 'signin' | 'signup'
  const mode = gateModeControlled ? gateAuthMode : modeInternal
  const setMode = (next) => {
    if (gateModeControlled) onGateAuthModeChange(next)
    else setModeInternal(next)
  }
  const gateInputClass =
    'font-body-md text-body-md h-12 w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 text-on-surface shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.06)] outline-none transition-all placeholder:text-on-surface-variant/55 hover:border-outline focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-45'

  useEffect(() => {
    if (!synthwave || !isGate) return
    try {
      const s = localStorage.getItem(REMEMBER_EMAIL_KEY)
      if (s) {
        setEmail(s)
        setRememberDevice(true)
      }
    } catch {
      /* ignore */
    }
  }, [synthwave, isGate])

  const onSubmit = async (e) => {
    e.preventDefault()
    const em = String(email || '').trim()
    const pw = String(password || '')
    const pw2 = String(passwordConfirm || '')
    setErr(null)
    setInfo(null)
    setPendingConfirmationEmail(null)
    setRepeatedAccountEmail(null)
    setResendErr(null)
    setResendOk(false)
    setResetInfo(null)
    if (!em) {
      setErr('Enter your email')
      return
    }
    if (pw.length < 6) {
      setErr('Use at least 6 characters for the password')
      return
    }
    if (mode === 'signup') {
      if (pw2.length < 6) {
        setErr('Enter the password again in “Confirm password”')
        return
      }
      if (pw !== pw2) {
        setErr('Passwords do not match')
        return
      }
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const data = await withTimeout(
          signIn({ email: em, password: pw }),
          REQUEST_MS,
          'Sign-in timed out. Check your connection and try again.',
        )
        if (data?.session) {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(50)
            } catch {
              // ignore
            }
          }
          try {
            if (synthwave && rememberDevice && em) localStorage.setItem(REMEMBER_EMAIL_KEY, em)
            else if (synthwave) localStorage.removeItem(REMEMBER_EMAIL_KEY)
          } catch {
            /* ignore */
          }
          onSuccess?.()
        }
        return
      }
      const data = await withTimeout(
        signUp({ email: em, password: pw }),
        REQUEST_MS,
        'Sign-up timed out. Check your connection and try again.',
      )
      if (data?.session) {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try {
            navigator.vibrate(50)
          } catch {
            // ignore
          }
        }
        try {
          if (synthwave && rememberDevice && em) localStorage.setItem(REMEMBER_EMAIL_KEY, em)
          else if (synthwave) localStorage.removeItem(REMEMBER_EMAIL_KEY)
        } catch {
          /* ignore */
        }
        onSuccess?.()
      } else if (data?.user) {
        // Duplicate email sign-up: API returns 200 with user + empty identities; no email is sent.
        const isRepeated =
          !data.session &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        if (isRepeated) {
          setRepeatedAccountEmail(em)
        } else {
          setPendingConfirmationEmail(em)
        }
      } else {
        setInfo('Account request received. Check your email for next steps.')
      }
    } catch (caught) {
      const msg = String(caught?.message || caught || 'Something went wrong')
      if (/timeout/i.test(msg)) {
        setErr(msg)
      } else if (/already registered|already been registered|User already exists/i.test(msg)) {
        setErr(
          'This email already has an account. Use Sign in, or your host’s password reset if you forgot it.',
        )
      } else if (/Invalid login credentials|invalid.*credential/i.test(msg)) {
        setErr(
          'That email and password did not work. The password may be wrong, the email not confirmed, or the account is only set up for another sign-in method. Use “Send password reset” under Sign in, or confirm your inbox first. Creating the account again does not resend a confirmation email if the address is already registered.',
        )
      } else {
        setErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const onForgotPassword = async () => {
    const e = String(email || '').trim()
    if (!e) {
      setErr('Enter your email in the field above, then try again')
      return
    }
    setErr(null)
    setResetInfo(null)
    setResetBusy(true)
    try {
      await withTimeout(
        resetPasswordForEmail({ email: e }),
        REQUEST_MS,
        'Request timed out. Check your connection and try again.',
      )
      setResetInfo('If that address has an account, a reset link is on its way. Check spam.')
    } catch (c) {
      setErr(String(c?.message || c || 'Could not send reset email'))
    } finally {
      setResetBusy(false)
    }
  }

  if (isGate) {
    const pwdType = showPassword ? 'text' : 'password'
    const gateStudioLight = studioLight && !synthwave
    const swFieldOuter =
      'relative rounded-sm border border-outline-variant/50 bg-surface-container-high transition-all focus-within:border-secondary-container'
    const swLabelLift =
      'pointer-events-none absolute -top-2.5 left-4 z-[1] bg-[#0e0e1e] px-2 font-label-sm font-bold uppercase tracking-widest text-secondary-fixed-dim'

    return (
      <div
        className={['flex w-full flex-col', synthwave ? 'relative pt-px' : ''].filter(Boolean).join(' ')}
        data-auth-gate-variant={gateStudioLight ? 'studio-light' : synthwave ? 'synthwave' : 'obsidian'}
      >
        {synthwave ? (
          <>
            <div className="mb-gutter text-center">
              <div className="mb-4 inline-block border border-secondary-container/50 bg-secondary-container/10 px-3 py-1">
                <span className="font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.05em] text-secondary-container">
                  System Status: Online
                </span>
              </div>
              <h2 className="font-space-grotesk text-[32px] font-bold leading-10 tracking-tight text-secondary">
                {mode === 'signin' ? 'Initialize Session' : 'Request Access'}
              </h2>
              <p className="mt-2 font-space-grotesk text-[16px] font-normal leading-6 tracking-[0.01em] text-outline">
                Synchronize with your digital training environment.
              </p>
            </div>
          </>
        ) : (
          <div className="mb-10 text-center">
            <h2 className="font-headline-md mb-2 text-[18px] font-semibold leading-6 tracking-tight text-on-surface">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {mode === 'signin'
                ? 'Precision tempo management for audio professionals.'
                : 'Register to sync setlists and patches across devices.'}
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={onSubmit} noValidate>
          {synthwave ? (
            <>
              <div className="relative">
                <div className={swFieldOuter}>
                  <label className={swLabelLift} htmlFor="auth-gate-email">
                    Musician_ID
                  </label>
                  <div className="group flex items-center px-4 pb-3 pt-5">
                    <span
                      className="material-symbols-outlined mr-3 shrink-0 text-outline text-[22px] group-focus-within:text-secondary-container"
                      aria-hidden
                    >
                      account_circle
                    </span>
                    <input
                      id="auth-gate-email"
                      className="w-full border-0 bg-transparent font-mono tracking-widest text-secondary placeholder:text-outline/30 focus:outline-none focus:ring-0 disabled:opacity-45"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(x) => {
                        const v = x.target.value
                        setEmail(v)
                        if (rememberDevice) {
                          try {
                            const t = String(v || '').trim()
                            if (t) localStorage.setItem(REMEMBER_EMAIL_KEY, t)
                            else localStorage.removeItem(REMEMBER_EMAIL_KEY)
                          } catch {
                            /* */
                          }
                        }
                      }}
                      placeholder="ENTER USERNAME"
                      autoComplete="email"
                      inputMode="email"
                      autoCapitalize="off"
                      spellCheck={false}
                      disabled={busy}
                      aria-invalid={err ? 'true' : 'false'}
                    />
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className={swFieldOuter}>
                  <label className={swLabelLift} htmlFor="auth-gate-password">
                    Access_Code
                  </label>
                  <div className="group flex items-center px-4 pb-3 pt-5">
                    <span
                      className="material-symbols-outlined mr-3 shrink-0 text-outline text-[22px] group-focus-within:text-secondary-container"
                      aria-hidden
                    >
                      lock
                    </span>
                    <input
                      id="auth-gate-password"
                      className="min-w-0 flex-1 border-0 bg-transparent font-mono tracking-widest text-secondary placeholder:text-outline/30 focus:outline-none focus:ring-0 disabled:opacity-45"
                      name="password"
                      type={pwdType}
                      value={password}
                      onChange={(x) => setPassword(x.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      minLength={6}
                      disabled={busy}
                      aria-describedby={err ? 'auth-err' : undefined}
                    />
                    <button
                      type="button"
                      className="shrink-0 text-secondary-fixed-dim/40 transition-colors hover:text-secondary-fixed-dim disabled:opacity-40"
                      disabled={busy}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {mode === 'signup' ? (
                <div className="relative">
                  <div className={swFieldOuter}>
                    <label className={swLabelLift} htmlFor="auth-gate-password-confirm">
                      Confirm Access Key
                    </label>
                    <div className="flex items-center px-4 pb-3 pt-5">
                      <span className="material-symbols-outlined mr-3 shrink-0 text-secondary-fixed-dim/50 text-[22px]" aria-hidden>
                        lock_clock
                      </span>
                      <input
                        id="auth-gate-password-confirm"
                        className="w-full border-0 bg-transparent font-space-grotesk tracking-widest text-secondary-container placeholder:text-secondary-fixed-dim/25 focus:outline-none focus:ring-0 disabled:opacity-45"
                        name="password-confirm"
                        type={pwdType}
                        value={passwordConfirm}
                        onChange={(x) => setPasswordConfirm(x.target.value)}
                        autoComplete="new-password"
                        minLength={6}
                        disabled={busy}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {mode === 'signin' ? (
                <div className="flex flex-wrap items-center justify-between gap-y-2">
                  <label className="group flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-none border border-cyan-500/40 bg-[#0d0d1c] text-primary-container focus:ring-primary-container focus:ring-offset-2 focus:ring-offset-[#0e0e1e]"
                      checked={rememberDevice}
                      onChange={(e) => {
                        const on = e.target.checked
                        setRememberDevice(on)
                        try {
                          const em = String(email || '').trim()
                          if (!on) localStorage.removeItem(REMEMBER_EMAIL_KEY)
                          else if (em) localStorage.setItem(REMEMBER_EMAIL_KEY, em)
                        } catch {
                          /* */
                        }
                      }}
                      disabled={busy}
                    />
                    <span className="font-space-grotesk text-[12px] font-medium uppercase leading-4 tracking-[0.05em] text-outline transition-colors group-hover:text-secondary-container">
                      Stay Synced
                    </span>
                  </label>
                  <button
                    type="button"
                    className="font-label-sm uppercase tracking-tight text-secondary-fixed-dim underline decoration-cyan-500/30 underline-offset-4 transition-colors hover:text-secondary-fixed disabled:opacity-40"
                    disabled={resetBusy}
                    onClick={onForgotPassword}
                  >
                    {resetBusy ? 'Sending…' : 'Reset Code?'}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label
                  className="flex items-center justify-between font-label-caps text-label-caps uppercase text-on-surface-variant"
                  htmlFor="auth-gate-email"
                >
                  Email Address
                  <span className="text-[10px] font-normal normal-case tracking-normal text-outline">CH_01</span>
                </label>
                <input
                  id="auth-gate-email"
                  className={gateInputClass}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(x) => setEmail(x.target.value)}
                  placeholder="engineer@studio.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={err ? 'true' : 'false'}
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-label-caps text-label-caps uppercase text-on-surface-variant" htmlFor="auth-gate-password">
                    Password
                  </label>
                  {mode === 'signin' ? (
                    <button
                      type="button"
                      className="shrink-0 font-label-caps text-label-caps text-secondary transition-colors hover:text-primary disabled:opacity-40"
                      disabled={resetBusy}
                      onClick={onForgotPassword}
                    >
                      {resetBusy ? 'Sending…' : 'Forgot Password?'}
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    id="auth-gate-password"
                    className={`${gateInputClass} pr-11`}
                    name="password"
                    type={pwdType}
                    value={password}
                    onChange={(x) => setPassword(x.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    minLength={6}
                    disabled={busy}
                    aria-describedby={err ? 'auth-err' : undefined}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-outline transition-colors hover:text-primary disabled:opacity-40"
                    disabled={busy}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined text-[22px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'signin' && resetInfo ? (
            <p
              className={
                synthwave ? 'font-body-md text-body-md text-secondary-fixed-dim' : 'font-body-md text-body-md text-secondary'
              }
            >
              {resetInfo}
            </p>
          ) : null}

          {!synthwave && mode === 'signup' ? (
            <div className="flex flex-col gap-1">
              <label className="font-label-caps text-label-caps uppercase text-on-surface-variant" htmlFor="auth-gate-password-confirm">
                Confirm Password
              </label>
              <input
                id="auth-gate-password-confirm"
                className={gateInputClass}
                name="password-confirm"
                type={pwdType}
                value={passwordConfirm}
                onChange={(x) => setPasswordConfirm(x.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={busy}
                placeholder="••••••••"
              />
            </div>
          ) : null}

          {err ? (
            <p id="auth-err" className="font-body-md text-body-md text-error" role="alert">
              {err}
            </p>
          ) : null}
          {repeatedAccountEmail ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-md text-on-surface-variant" role="status">
              <div className="flex flex-col gap-2">
                <p className="m-0 text-on-surface">
                  <strong>{repeatedAccountEmail}</strong> is already registered. Using <strong>Create account</strong>{' '}
                  again does not send a new confirmation message. Sign in with your password, or get a new confirmation or
                  reset link below.
                </p>
                <p className="m-0">
                  <button
                    type="button"
                    className="text-primary underline decoration-primary/60 underline-offset-2"
                    onClick={() => {
                      setMode('signin')
                      setRepeatedAccountEmail(null)
                      setResendErr(null)
                      setResendOk(false)
                      setErr(null)
                    }}
                  >
                    Open Sign in
                  </button>
                </p>
                <p className="m-0">
                  <button
                    type="button"
                    className="text-primary underline decoration-primary/60 underline-offset-2 disabled:opacity-40"
                    disabled={resendBusy}
                    onClick={async () => {
                      setResendErr(null)
                      setResendOk(false)
                      setResendBusy(true)
                      try {
                        await withTimeout(
                          resendSignUp({ email: repeatedAccountEmail }),
                          REQUEST_MS,
                          'Resend timed out. Check your connection and try again.',
                        )
                        setResendOk(true)
                      } catch (c) {
                        setResendErr(String(c?.message || c || 'Could not resend email'))
                      } finally {
                        setResendBusy(false)
                      }
                    }}
                  >
                    {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                  </button>
                </p>
                <p className="m-0">
                  <button
                    type="button"
                    className="text-primary underline decoration-primary/60 underline-offset-2 disabled:opacity-40"
                    disabled={resetBusy}
                    onClick={async () => {
                      setResendErr(null)
                      setResendOk(false)
                      setErr(null)
                      setResetBusy(true)
                      try {
                        await withTimeout(
                          resetPasswordForEmail({ email: repeatedAccountEmail }),
                          REQUEST_MS,
                          'Request timed out. Check your connection and try again.',
                        )
                        setResendOk(true)
                      } catch (c) {
                        setResendErr(String(c?.message || c || 'Could not send reset email'))
                      } finally {
                        setResetBusy(false)
                      }
                    }}
                  >
                    {resetBusy ? 'Sending…' : 'Send password reset link'}
                  </button>
                </p>
                {resendErr ? <p className="m-0 text-error">{resendErr}</p> : null}
                {resendOk && !resendErr ? (
                  <p className="m-0 text-secondary">Check that inbox (and spam) for the message you asked for.</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {pendingConfirmationEmail ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-md text-on-surface-variant" role="status">
              <div className="flex flex-col gap-2">
                <p className="m-0 text-on-surface">
                  We sent a confirmation link to <strong>{pendingConfirmationEmail}</strong>. Open that message, tap the
                  link, then come back here and use <strong>Sign in</strong> with the password you chose.
                </p>
                <p className="m-0 text-on-surface-variant">Nothing in your inbox? Look in spam or promotions.</p>
                <p className="m-0">
                  <button
                    type="button"
                    className="text-primary underline decoration-primary/60 underline-offset-2 disabled:opacity-40"
                    disabled={resendBusy}
                    onClick={async () => {
                      setResendErr(null)
                      setResendOk(false)
                      setResendBusy(true)
                      try {
                        await withTimeout(
                          resendSignUp({ email: pendingConfirmationEmail }),
                          REQUEST_MS,
                          'Resend timed out. Check your connection and try again.',
                        )
                        setResendOk(true)
                      } catch (c) {
                        setResendErr(String(c?.message || c || 'Could not resend email'))
                      } finally {
                        setResendBusy(false)
                      }
                    }}
                  >
                    {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                  </button>
                </p>
                {resendErr ? <p className="m-0 text-error">{resendErr}</p> : null}
                {resendOk ? <p className="m-0 text-secondary">If your email is right, a new message should arrive soon.</p> : null}
                <details className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md [&_summary]:cursor-pointer [&_summary]:list-none [&_summary::-webkit-details-marker]:hidden">
                  <summary className="text-secondary">Still no email (app owner)?</summary>
                  <p className="mt-2 text-on-surface-variant">
                    In the Supabase dashboard: open Authentication, then Users, find this email, and check whether the
                    account is already confirmed. In URL Configuration, Site URL and Redirect URLs must include this app’s
                    URL.
                  </p>
                </details>
              </div>
            </div>
          ) : null}
          {info && !pendingConfirmationEmail && !repeatedAccountEmail ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 text-body-md text-on-surface-variant" role="status">
              {info}
            </div>
          ) : null}

          <button
            type="submit"
            className={
              synthwave
                ? 'sw-stitch-neon-glow-pink w-full rounded-sm bg-primary py-4 font-space-grotesk text-[24px] font-semibold uppercase leading-8 tracking-[0.15em] text-on-primary transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45'
                : gateStudioLight
                  ? 'flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-label-caps text-label-caps uppercase tracking-widest text-on-primary shadow-md transition-all hover:brightness-[1.04] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45'
                  : 'flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#2E4057] to-[#172a40] font-label-caps text-label-caps uppercase tracking-widest text-white shadow-sm transition-all hover:brightness-[1.03] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45'
            }
            disabled={busy}
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'INITIALIZE SESSION' : 'REQUEST ACCESS'}
            {!busy && !synthwave ? (
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                login
              </span>
            ) : null}
          </button>

          {synthwave && mode === 'signin' && gateModeControlled ? (
            <div className="mt-10 flex flex-col items-center gap-4 border-t border-outline-variant/20 pt-6">
              <p className="font-space-grotesk text-[12px] font-medium uppercase tracking-wide text-outline">New Candidate?</p>
              <button
                type="button"
                className="group flex items-center gap-2 font-space-grotesk text-[14px] font-semibold uppercase tracking-widest text-secondary-container underline decoration-secondary-container/30 underline-offset-4 transition-colors hover:text-primary"
                onClick={() => setMode('signup')}
              >
                REQUEST ACCESS
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>
            </div>
          ) : null}

          {synthwave ? (
            <details className="mt-6 rounded-sm border border-cyan-400/20 bg-surface-container-lowest/40 px-3 py-2">
              <summary className="cursor-pointer font-space-grotesk text-[12px] font-medium uppercase tracking-wide text-on-surface-variant marker:content-none [&::-webkit-details-marker]:hidden">
                Alternate providers
              </summary>
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-cyan-500/20" aria-hidden />
                  <span className="font-space-grotesk text-[12px] font-medium uppercase tracking-wide text-on-surface-variant/40">OAuth</span>
                  <div className="h-px flex-1 bg-cyan-500/20" aria-hidden />
                </div>
                <div className="flex justify-center gap-6">
                <button
                  type="button"
                  className="group border border-cyan-500/20 p-3 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 disabled:opacity-45"
                  disabled={busy || oauthBusy}
                  title="Continue with Google"
                  aria-label="Continue with Google"
                  onClick={async () => {
                    setErr(null)
                    setOauthBusy(true)
                    try {
                      await signInWithOAuth({ provider: 'google' })
                    } catch (c) {
                      setErr(String(c?.message || c || 'Google sign-in failed'))
                    } finally {
                      setOauthBusy(false)
                    }
                  }}
                >
                  <svg className="h-5 w-5 grayscale transition-all group-hover:grayscale-0" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </button>
                {typeof onSynthwaveMagicLinkRequest === 'function' ? (
                  <button
                    type="button"
                    className="group border border-cyan-500/20 p-3 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 disabled:opacity-45"
                    disabled={busy || oauthBusy}
                    title="Send magic link to the email above"
                    aria-label="Send magic link to email"
                    onClick={async () => {
                      const em = String(email || '').trim()
                      if (!em) {
                        setErr('Enter your email for a magic link')
                        return
                      }
                      setErr(null)
                      setOauthBusy(true)
                      try {
                        await onSynthwaveMagicLinkRequest(em)
                      } catch (c) {
                        setErr(String(c?.message || c || 'Could not send magic link'))
                      } finally {
                        setOauthBusy(false)
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-secondary-fixed-dim/50 transition-colors group-hover:text-secondary-fixed-dim">
                      terminal
                    </span>
                  </button>
                ) : null}
                </div>
              </div>
            </details>
          ) : null}
        </form>

        {!synthwave ? (
          <div
            className={`mt-10 border-t pt-6 text-center [-webkit-tap-highlight-color:transparent] ${gateStudioLight ? 'border-outline-variant' : 'border-slate-200'}`}
          >
            <p className="font-body-md text-body-md text-on-surface-variant">
              {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
              <button
                type="button"
                className="ml-1 font-mono text-[14px] font-semibold tracking-wide text-primary transition-all hover:underline"
                disabled={busy}
                onClick={() => {
                  if (mode === 'signin') {
                    setMode('signup')
                  } else {
                    setMode('signin')
                  }
                  setErr(null)
                  setInfo(null)
                  setPendingConfirmationEmail(null)
                  setRepeatedAccountEmail(null)
                  setResendErr(null)
                  setResendOk(false)
                  setResetInfo(null)
                  setPasswordConfirm('')
                }}
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={['auth', studioLight ? 'auth--studio-light' : null].filter(Boolean).join(' ')}
      style={studioLight ? undefined : { '--auth-neon': NEON }}
    >
      <div className="auth__header">Account</div>
      <div className="auth__toggleRow" role="tablist" aria-label="Sign in or create account">
        <button
          type="button"
          className={`auth__modeBtn ${mode === 'signin' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('signin')
            setErr(null)
            setInfo(null)
            setPendingConfirmationEmail(null)
            setRepeatedAccountEmail(null)
            setResendErr(null)
            setResendOk(false)
            setResetInfo(null)
            setPasswordConfirm('')
          }}
        >
          Sign in
        </button>
        <span aria-hidden="true" style={{ opacity: 0.3 }}>
          ·
        </span>
        <button
          type="button"
          className={`auth__modeBtn ${mode === 'signup' ? 'is-on' : ''}`}
          onClick={() => {
            setMode('signup')
            setErr(null)
            setInfo(null)
            setPendingConfirmationEmail(null)
            setRepeatedAccountEmail(null)
            setResendErr(null)
            setResendOk(false)
            setResetInfo(null)
            setPasswordConfirm('')
          }}
        >
          Create account
        </button>
      </div>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        <div className="auth__field">
          <label className="auth__label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="auth__input"
            name="email"
            type="email"
            value={email}
            onChange={(x) => setEmail(x.target.value)}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            spellCheck={false}
            disabled={busy}
            aria-invalid={err ? 'true' : 'false'}
          />
        </div>
        <div className="auth__field">
          <label className="auth__label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            className="auth__input"
            name="password"
            type="password"
            value={password}
            onChange={(x) => setPassword(x.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={6}
            disabled={busy}
            aria-describedby={err ? 'auth-err' : undefined}
          />
        </div>
        {mode === 'signin' ? (
          <>
            <p className="auth__resendRow">
              <button
                type="button"
                className="auth__resendBtn"
                disabled={resetBusy}
                onClick={async () => {
                  const e = String(email || '').trim()
                  if (!e) {
                    setErr('Enter your email in the field above, then try again')
                    return
                  }
                  setErr(null)
                  setResetInfo(null)
                  setResetBusy(true)
                  try {
                    await withTimeout(
                      resetPasswordForEmail({ email: e }),
                      REQUEST_MS,
                      'Request timed out. Check your connection and try again.',
                    )
                    setResetInfo('If that address has an account, a reset link is on its way. Check spam.')
                  } catch (c) {
                    setErr(String(c?.message || c || 'Could not send reset email'))
                  } finally {
                    setResetBusy(false)
                  }
                }}
              >
                {resetBusy ? 'Sending…' : 'Send password reset link'}
              </button>
            </p>
            {resetInfo ? <p className="auth__resendOk">{resetInfo}</p> : null}
          </>
        ) : null}

        {mode === 'signup' ? (
          <div className="auth__field">
            <label className="auth__label" htmlFor="auth-password-confirm">
              Confirm password
            </label>
            <input
              id="auth-password-confirm"
              className="auth__input"
              name="password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(x) => setPasswordConfirm(x.target.value)}
              autoComplete="new-password"
              minLength={6}
              disabled={busy}
            />
          </div>
        ) : null}

        {err ? (
          <p id="auth-err" className="auth__err" role="alert">
            {err}
          </p>
        ) : null}
        {repeatedAccountEmail ? (
          <div className="auth__info" role="status">
            <div className="auth__infoBlock">
              <p className="auth__infoLead">
                <strong>{repeatedAccountEmail}</strong> is already registered. Using{' '}
                <strong>Create account</strong> again does not send a new confirmation message.
                Sign in with your password, or get a new confirmation or reset link below.
              </p>
              <p className="auth__repeatedStack">
                <button
                  type="button"
                  className="auth__resendBtn"
                  onClick={() => {
                    setMode('signin')
                    setRepeatedAccountEmail(null)
                    setResendErr(null)
                    setResendOk(false)
                    setErr(null)
                  }}
                >
                  Open Sign in
                </button>
              </p>
              <p className="auth__repeatedStack">
                <button
                  type="button"
                  className="auth__resendBtn"
                  disabled={resendBusy}
                  onClick={async () => {
                    setResendErr(null)
                    setResendOk(false)
                    setResendBusy(true)
                    try {
                      await withTimeout(
                        resendSignUp({ email: repeatedAccountEmail }),
                        REQUEST_MS,
                        'Resend timed out. Check your connection and try again.',
                      )
                      setResendOk(true)
                    } catch (c) {
                      setResendErr(String(c?.message || c || 'Could not resend email'))
                    } finally {
                      setResendBusy(false)
                    }
                  }}
                >
                  {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                </button>
              </p>
              <p className="auth__repeatedStack">
                <button
                  type="button"
                  className="auth__resendBtn"
                  disabled={resetBusy}
                  onClick={async () => {
                    setResendErr(null)
                    setResendOk(false)
                    setErr(null)
                    setResetBusy(true)
                    try {
                      await withTimeout(
                        resetPasswordForEmail({ email: repeatedAccountEmail }),
                        REQUEST_MS,
                        'Request timed out. Check your connection and try again.',
                      )
                      setResendOk(true)
                    } catch (c) {
                      setResendErr(String(c?.message || c || 'Could not send reset email'))
                    } finally {
                      setResetBusy(false)
                    }
                  }}
                >
                  {resetBusy ? 'Sending…' : 'Send password reset link'}
                </button>
              </p>
              {resendErr ? <p className="auth__resendErr">{resendErr}</p> : null}
              {resendOk && !resendErr ? (
                <p className="auth__resendOk">Check that inbox (and spam) for the message you asked for.</p>
              ) : null}
            </div>
          </div>
        ) : null}
        {pendingConfirmationEmail ? (
          <div className="auth__info" role="status">
            <div className="auth__infoBlock">
              <p className="auth__infoLead">
                We sent a confirmation link to <strong>{pendingConfirmationEmail}</strong>. Open
                that message, tap the link, then come back here and use <strong>Sign in</strong> with
                the password you chose.
              </p>
              <p className="auth__infoSub">
                Nothing in your inbox? Look in spam or promotions. It can take a minute or two.
              </p>
              <p className="auth__resendRow">
                <button
                  type="button"
                  className="auth__resendBtn"
                  disabled={resendBusy}
                  onClick={async () => {
                    setResendErr(null)
                    setResendOk(false)
                    setResendBusy(true)
                    try {
                      await withTimeout(
                        resendSignUp({ email: pendingConfirmationEmail }),
                        REQUEST_MS,
                        'Resend timed out. Check your connection and try again.',
                      )
                      setResendOk(true)
                    } catch (c) {
                      setResendErr(String(c?.message || c || 'Could not resend email'))
                    } finally {
                      setResendBusy(false)
                    }
                  }}
                >
                  {resendBusy ? 'Sending…' : 'Resend confirmation email'}
                </button>
              </p>
              {resendErr ? <p className="auth__resendErr">{resendErr}</p> : null}
              {resendOk ? <p className="auth__resendOk">If your email is right, a new message should arrive soon.</p> : null}
              <details className="auth__details">
                <summary>Still no email (app owner)?</summary>
                <p>
                  In the Supabase dashboard: open Authentication, then Users, find this email, and
                  check whether the account is already confirmed. You can resend or confirm from
                  there. In URL Configuration, Site URL and Redirect URLs must include this app’s
                  URL. In Authentication logs, look for email send errors and rate limits. Under
                  Project Settings, a custom SMTP is often required for reliable delivery in
                  production.
                </p>
              </details>
            </div>
          </div>
        ) : null}
        {info && !pendingConfirmationEmail && !repeatedAccountEmail ? (
          <div className="auth__info" role="status">
            {info}
          </div>
        ) : null}

        <button type="submit" className="auth__submit" disabled={busy} style={{ borderColor: NEON, color: NEON }}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
