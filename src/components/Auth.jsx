import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import './Auth.css'

const NEON = '#39ff14'

const REQUEST_MS = 28000

function withTimeout(promise, ms, message) {
  let t
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      t = window.setTimeout(() => reject(new Error(message)), ms)
    }),
  ]).finally(() => {
    if (t) window.clearTimeout(t)
  })
}

/**
 * Email + password sign-in / sign-up. Neon on black; uses Supabase password auth.
 * @param {object} [props]
 * @param {() => void} [props.onSuccess]  Called after successful session (e.g. close drawer)
 */
export default function Auth({ onSuccess } = {}) {
  const { signIn, signUp, resendSignUp, resetPasswordForEmail } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
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

  return (
    <div
      className="auth"
      style={{ '--auth-neon': NEON }}
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
