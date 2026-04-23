import { useMemo, useState } from 'react'
import { useAuth } from '../context/useAuth'
import './AuthBar.css'

export default function AuthBar() {
  const { user, loading, signOut, signInWithMagicLink, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  const label = useMemo(() => {
    if (loading) return 'Auth…'
    if (!user) return 'Sign in'
    return user.email || 'Signed in'
  }, [loading, user])

  const sendLink = async () => {
    const e = String(email || '').trim()
    if (!e) return
    setBusy(true)
    setStatus(null)
    try {
      await signInWithMagicLink({ email: e })
      setStatus('Magic link sent. Check your email.')
      setEmail('')
    } catch (err) {
      setStatus(err?.message || 'Failed to send link')
    } finally {
      setBusy(false)
    }
  }

  const doSignOut = async () => {
    setBusy(true)
    setStatus(null)
    try {
      await signOut()
    } catch (err) {
      setStatus(err?.message || 'Failed to sign out')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="authBar" aria-label="Authentication">
      <div className="authBar__pill" title={user?.id || ''}>
        {label}
        {isAdmin ? <span className="authBar__admin">Admin</span> : null}
      </div>

      {!user ? (
        <div className="authBar__form">
          <input
            className="authBar__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            inputMode="email"
            autoComplete="email"
            disabled={busy}
            aria-label="Email"
          />
          <button type="button" className="authBar__btn authBar__btn--primary" onClick={sendLink} disabled={busy}>
            Send link
          </button>
        </div>
      ) : (
        <button type="button" className="authBar__btn" onClick={doSignOut} disabled={busy}>
          Sign out
        </button>
      )}

      {status ? (
        <div className="authBar__status" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}
    </div>
  )
}

