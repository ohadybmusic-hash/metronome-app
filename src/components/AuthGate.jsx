import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import './AuthGate.css'

export default function AuthGate({ onOpenEmailPassword } = {}) {
  const { signInWithMagicLink, signInWithOAuth, signInAnonymously, authLinkError, dismissAuthLinkError } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const continueAsGuest = async () => {
    setBusy(true)
    setStatus(null)
    try {
      await signInAnonymously()
    } catch (err) {
      setStatus(err?.message || 'Failed to continue as guest')
    } finally {
      setBusy(false)
    }
  }

  const signInProvider = async (provider) => {
    setBusy(true)
    setStatus(null)
    try {
      await signInWithOAuth({ provider })
      // Redirect happens automatically via Supabase OAuth flow.
    } catch (err) {
      setStatus(err?.message || `Failed to sign in with ${provider}`)
    } finally {
      setBusy(false)
    }
  }

  const sendLink = async () => {
    const e = String(email || '').trim()
    if (!e) return
    setBusy(true)
    setStatus(null)
    try {
      await signInWithMagicLink({ email: e })
      setStatus('Magic link sent. Check your email to sign in.')
      setEmail('')
    } catch (err) {
      setStatus(err?.message || 'Failed to send link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="authGate">
      <div className="authGate__card">
        <div className="authGate__title">Sign in required</div>
        <div className="authGate__subtitle">
          This app syncs your songs and setlists to Supabase. Please sign in to continue.
        </div>

        {authLinkError ? (
          <div className="authGate__linkErr" role="alert">
            <p className="authGate__linkErrText">{authLinkError}</p>
            <div className="authGate__linkErrActions">
              {typeof onOpenEmailPassword === 'function' ? (
                <button
                  type="button"
                  className="authGate__btn authGate__btn--primary authGate__linkErrCta"
                  onClick={() => {
                    onOpenEmailPassword()
                  }}
                  disabled={busy}
                >
                  Open email sign-in
                </button>
              ) : null}
              <button
                type="button"
                className="authGate__btn authGate__linkErrDismiss"
                onClick={dismissAuthLinkError}
                disabled={busy}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {typeof onOpenEmailPassword === 'function' ? (
          <button
            type="button"
            className="authGate__btn authGate__btn--neon"
            onClick={onOpenEmailPassword}
            disabled={busy}
          >
            Sign in with email & password
          </button>
        ) : null}

        <div className="authGate__form">
          <input
            className="authGate__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            inputMode="email"
            autoComplete="email"
            disabled={busy}
            aria-label="Email"
          />
          <button
            type="button"
            className="authGate__btn authGate__btn--primary"
            onClick={sendLink}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </div>

        <div className="authGate__oauth">
          <button
            type="button"
            className="authGate__btn authGate__btn--oauth authGate__btn--google"
            onClick={() => signInProvider('google')}
            disabled={busy}
          >
            Sign in with Google
          </button>
          <button
            type="button"
            className="authGate__btn authGate__btn--oauth authGate__btn--apple"
            onClick={() => signInProvider('apple')}
            disabled={busy}
          >
            Sign in with Apple
          </button>
        </div>

        <button type="button" className="authGate__btn authGate__btn--guest" onClick={continueAsGuest} disabled={busy}>
          Continue as Guest
        </button>

        {status ? (
          <div className="authGate__status" role="status" aria-live="polite">
            {status}
          </div>
        ) : null}

        <div className="authGate__hint">
          After clicking the link in your email, you’ll be redirected back here and automatically signed in.
        </div>
      </div>
    </div>
  )
}

