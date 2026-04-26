import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/useAuth'
import './RecoveryPasswordOverlay.css'

const MIN_LEN = 6

export default function RecoveryPasswordOverlay() {
  const { passwordRecoveryPending, ackPasswordRecoveryComplete, signOut } = useAuth()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!passwordRecoveryPending) return null

  const onSubmit = async (e) => {
    e.preventDefault()
    setErr(null)
    const pw = String(password || '')
    const pw2 = String(passwordConfirm || '')
    if (pw.length < MIN_LEN) {
      setErr(`Use at least ${MIN_LEN} characters`)
      return
    }
    if (pw !== pw2) {
      setErr('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      ackPasswordRecoveryComplete()
      setPassword('')
      setPasswordConfirm('')
      try {
        const path = window.location.pathname || '/'
        window.history.replaceState({}, '', path)
      } catch {
        // ignore
      }
    } catch (c) {
      setErr(String(c?.message || c || 'Could not update password'))
    } finally {
      setBusy(false)
    }
  }

  const onCancel = async () => {
    setErr(null)
    try {
      await signOut()
    } catch {
      // ignore
    } finally {
      ackPasswordRecoveryComplete()
      try {
        const path = window.location.pathname || '/'
        window.history.replaceState({}, '', path)
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="recoveryPw" role="dialog" aria-modal="true" aria-labelledby="recoveryPw-title">
      <div className="recoveryPw__card">
        <h2 id="recoveryPw-title" className="recoveryPw__title">
          Set a new password
        </h2>
        <p className="recoveryPw__lead">
          You opened a password reset link. Choose a new password below to finish. This step is required
          for the reset to take effect.
        </p>
        <form onSubmit={onSubmit}>
          <div className="recoveryPw__field">
            <label className="recoveryPw__label" htmlFor="recoveryPw-password">
              New password
            </label>
            <input
              id="recoveryPw-password"
              className="recoveryPw__input"
              type="password"
              autoComplete="new-password"
              minLength={MIN_LEN}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={busy}
            />
          </div>
          <div className="recoveryPw__field">
            <label className="recoveryPw__label" htmlFor="recoveryPw-confirm">
              Confirm password
            </label>
            <input
              id="recoveryPw-confirm"
              className="recoveryPw__input"
              type="password"
              autoComplete="new-password"
              minLength={MIN_LEN}
              value={passwordConfirm}
              onChange={(ev) => setPasswordConfirm(ev.target.value)}
              disabled={busy}
            />
          </div>
          {err ? (
            <p className="recoveryPw__err" role="alert">
              {err}
            </p>
          ) : null}
          <div className="recoveryPw__actions">
            <button type="submit" className="recoveryPw__submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
            <button type="button" className="recoveryPw__secondary" disabled={busy} onClick={onCancel}>
              Cancel and sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
