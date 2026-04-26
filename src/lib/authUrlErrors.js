/**
 * Supabase redirects with errors in the hash or query, e.g.
 * #error=access_denied&error_code=otp_expired&error_description=...
 */

export function parseAuthUrlError() {
  if (typeof window === 'undefined') return null
  try {
    const hash = (window.location.hash || '').replace(/^#/, '')
    const search = (window.location.search || '').replace(/^\?/, '')
    for (const source of [hash, search]) {
      if (!source) continue
      const p = new URLSearchParams(source)
      const err = p.get('error')
      if (!err) continue
      return {
        error: err,
        errorCode: p.get('error_code') || '',
        errorDescription: (p.get('error_description') || '').replace(/\+/g, ' '),
      }
    }
  } catch {
    // ignore
  }
  return null
}

export function friendlyAuthLinkError(parsed) {
  if (!parsed) return ''
  const code = String(parsed.errorCode || '')
  let desc = String(parsed.errorDescription || '').trim()
  try {
    desc = decodeURIComponent(desc.replace(/\+/g, ' '))
  } catch {
    desc = desc.replace(/\+/g, ' ')
  }
  if (code === 'otp_expired' || /invalid or has expired|expired/i.test(desc)) {
    return 'That email link has expired or was already used. Use “Sign in with email & password” below, then “Send password reset link” on the Sign in tab.'
  }
  if (desc) return desc
  if (code === 'access_denied') {
    return 'Access was denied. Try a new reset or magic link from the account screen.'
  }
  return parsed.error || 'The email link could not be used.'
}

/** Remove error hash / error query params so refresh does not repeat the same message. */
export function stripAuthErrorFromUrl() {
  if (typeof window === 'undefined') return
  try {
    const u = new URL(window.location.href)
    u.hash = ''
    u.searchParams.delete('error')
    u.searchParams.delete('error_code')
    u.searchParams.delete('error_description')
    const q = u.searchParams.toString()
    const next = q ? `${u.pathname}?${q}` : u.pathname
    window.history.replaceState(null, document.title, next)
  } catch {
    try {
      window.history.replaceState(null, document.title, window.location.pathname)
    } catch {
      // ignore
    }
  }
}
