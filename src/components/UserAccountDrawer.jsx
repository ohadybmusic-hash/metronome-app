import { useEffect, useId, useState } from 'react'
import { useAuth } from '../context/useAuth'
import { useDocumentVisualLayout } from '../hooks/useDocumentVisualLayout.js'
import Auth from './Auth.jsx'
import './UserAccountDrawer.css'

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export default function UserAccountDrawer({ open, onClose }) {
  const { user, loading, signOut } = useAuth()
  const visualLayout = useDocumentVisualLayout()
  const studioLight = visualLayout === 'light'
  const synthwave = visualLayout === 'synthwave'
  const obsidian = !studioLight && !synthwave
  const [busy, setBusy] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const isAnon = Boolean(user?.is_anonymous)
  const email = user?.email
  const label = isAnon ? 'Guest session' : 'Signed in'

  const onSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
      onClose()
    } catch {
      // error surfaced in UI if we add state; keep silent
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`userDrawer__backdrop${studioLight ? ' userDrawer__backdropLight' : ''}${synthwave ? ' userDrawer__backdropSynthwave' : ''}${obsidian ? ' userDrawer__backdropObsidian' : ''}`}
        aria-label="Close account"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className={`userDrawer__panel${studioLight ? ' userDrawer__panel--light' : ''}${synthwave ? ' userDrawer__panel--synthwave' : ''}${obsidian ? ' userDrawer__panel--obsidian' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="userDrawer__head">
          <h2 className="userDrawer__title" id={titleId}>
            {loading ? '…' : 'Account'}
          </h2>
          <button
            type="button"
            className="userDrawer__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="userDrawer__body">
          {loading ? (
            <p className="userDrawer__meta">Loading…</p>
          ) : user ? (
            <>
              {isAnon ? (
                <>
                  <p className="userDrawer__guest">
                    You’re on a guest device session. Setlists and songs are saved locally. Create
                    a password or use magic link in Settings to sync in the cloud.
                  </p>
                </>
              ) : (
                <>
                  <p className="userDrawer__meta">{label}</p>
                  <p className="userDrawer__email">{email || user.id}</p>
                </>
              )}
              <button
                type="button"
                className="userDrawer__signOut"
                onClick={onSignOut}
                disabled={busy}
              >
                {busy ? 'Signing out…' : 'Log out'}
              </button>
            </>
          ) : (
            <Auth
              studioLight={studioLight}
              onSuccess={() => {
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </>
  )
}
