import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import './AuthGate.css'

export default function AuthGate() {
  const { loading, signInWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

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

        <div className="authGate__form">
          <input
            className="authGate__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ohadybmusic@gmail.com"
            inputMode="email"
            autoComplete="email"
            disabled={busy || loading}
            aria-label="Email"
          />
          <button
            type="button"
            className="authGate__btn authGate__btn--primary"
            onClick={sendLink}
            disabled={busy || loading}
          >
            {loading ? 'Loading…' : busy ? 'Sending…' : 'Send magic link'}
          </button>
        </div>

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

