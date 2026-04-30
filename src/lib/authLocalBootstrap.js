import { getSupabaseAuthStorageKey } from './supabaseClient.js'

function isValidSessionShape(s) {
  return (
    s &&
    typeof s === 'object' &&
    'access_token' in s &&
    'refresh_token' in s &&
    'expires_at' in s &&
    typeof s.expires_at === 'number'
  )
}

/**
 * Read the persisted Supabase session from localStorage synchronously (same key GoTrueClient uses)
 * so the first paint can treat the user as signed in while `initialize` / token refresh run.
 *
 * If the access token is past `expires_at`, we do not return a fast path (init will refresh or clear).
 */
export function getAuthLocalBootstrap() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return { user: null, session: null, hasFastPath: false }
  }
  const key = getSupabaseAuthStorageKey()
  if (!key) return { user: null, session: null, hasFastPath: false }
  let raw
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    return { user: null, session: null, hasFastPath: false }
  }
  if (!raw) return { user: null, session: null, hasFastPath: false }
  let session
  try {
    session = JSON.parse(raw)
  } catch {
    return { user: null, session: null, hasFastPath: false }
  }
  if (!isValidSessionShape(session)) {
    return { user: null, session: null, hasFastPath: false }
  }
  const expMs = session.expires_at * 1000
  if (!Number.isFinite(expMs) || expMs <= Date.now()) {
    return { user: null, session: null, hasFastPath: false }
  }
  let user = session.user ?? null
  if (!user?.id) {
    try {
      const userRaw = window.localStorage.getItem(`${key}-user`)
      if (userRaw) {
        const parsed = JSON.parse(userRaw)
        user = parsed?.user ?? null
      }
    } catch {
      // ignore
    }
  }
  if (!user?.id) {
    return { user: null, session: null, hasFastPath: false }
  }
  return { user, session, hasFastPath: true }
}
