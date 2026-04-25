import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

function isLockError(err) {
  const msg = String(err?.message || err || '')
  return msg.includes('lock:') || msg.toLowerCase().includes('stole it') || msg.toLowerCase().includes('failed to fetch')
}

async function sleep(ms) {
  await new Promise((r) => window.setTimeout(r, ms))
}

async function withTimeout(promise, ms) {
  let t
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        t = window.setTimeout(() => reject(new Error('timeout')), ms)
      }),
    ])
  } finally {
    if (t) window.clearTimeout(t)
  }
}

/** Same origin Supabase is allowed to redirect to (Site URL + Redirect URLs in dashboard). */
function authAppOrigin() {
  return window.location.origin
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Serialize auth/bootstrap operations to avoid storage lock contention.
  const opRef = useRef(Promise.resolve())
  const enqueue = useCallback((fn) => {
    opRef.current = opRef.current.then(fn, fn)
    return opRef.current
  }, [])

  const refreshProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(null)
      return
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', nextUser.id)
        .maybeSingle()

      if (error) throw error
      const p = data
      setProfile(p)
    } catch (e) {
      // Retry once on transient auth/storage/network issues.
      if (isLockError(e)) {
        try {
          await sleep(250)
          const { data, error } = await supabase
            .from('profiles')
            .select('id, is_admin')
            .eq('id', nextUser.id)
            .maybeSingle()
          if (!error) {
            setProfile(data)
            return
          }
        } catch {
          // fallthrough to null profile
        }
      }
      // If the row doesn't exist yet (common right after sign-up), treat as non-admin.
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      await enqueue(async () => {
        if (cancelled) return
        setLoading(true)
        try {
          let res
          try {
            res = await withTimeout(supabase.auth.getSession(), 3000)
          } catch (e) {
            if (isLockError(e)) {
              await sleep(200)
              res = await withTimeout(supabase.auth.getSession(), 3000)
            } else {
              throw e
            }
          }
          const { data, error } = res || {}
          if (error) return

          const nextSession = data?.session ?? null
          const nextUser = nextSession?.user ?? null

          if (!cancelled) {
            setSession(nextSession)
            setUser(nextUser)
          }
          if (!cancelled) refreshProfile(nextUser)
        } catch {
          // Swallow init errors; the UI should still be usable (AuthGate can retry).
        } finally {
          if (!cancelled) setLoading(false)
        }
      })
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await enqueue(async () => {
        const nextUser = nextSession?.user ?? null
        setSession(nextSession ?? null)
        setUser(nextUser)
        setLoading(true)
        try {
          refreshProfile(nextUser)
        } finally {
          setLoading(false)
        }
      })
    })

    init()

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [enqueue, refreshProfile])

  const signUp = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signInWithMagicLink = useCallback(async ({ email }) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authAppOrigin(),
      },
    })
    if (error) throw error
    return data
  }, [])

  const signInAnonymously = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data
  }, [])

  const signInWithOAuth = useCallback(async ({ provider }) => {
    const p = String(provider || '').trim()
    if (!p) throw new Error('Missing OAuth provider')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: p,
      options: {
        redirectTo: authAppOrigin(),
      },
    })
    if (error) throw error
    return data
  }, [])

  const linkOAuthIdentity = useCallback(async ({ provider }) => {
    const p = String(provider || '').trim()
    if (!p) throw new Error('Missing OAuth provider')
    const { data, error } = await supabase.auth.linkIdentity({
      provider: p,
      options: {
        redirectTo: authAppOrigin(),
      },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const isAdmin = Boolean(profile?.is_admin)

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isAdmin,
      loading,
      signUp,
      signIn,
      signInWithMagicLink,
      signInAnonymously,
      signInWithOAuth,
      linkOAuthIdentity,
      signOut,
      refreshProfile: () => refreshProfile(user),
    }),
    [
      isAdmin,
      loading,
      profile,
      refreshProfile,
      session,
      signIn,
      signInWithMagicLink,
      signInAnonymously,
      signInWithOAuth,
      linkOAuthIdentity,
      signOut,
      signUp,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }

