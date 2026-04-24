/**
 * iPhone / iPad (incl. desktop UA) or PWA "Add to Home Screen" on iOS.
 * Used to show one-time audio / mic handoff for WebKit’s stricter media stack.
 */
export function isIOSOrIPadOS() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iP(hone|ad|od)/.test(ua)) return true
  if (ua.includes('Mac') && 'ontouchend' in document) return true
  return false
}

export function isIOSAddToHomeScreenPWA() {
  if (typeof navigator === 'undefined') return false
  return 'standalone' in navigator && Boolean(navigator.standalone)
}

/** When we should offer the “mic one‑time handoff” prompt for more reliable metronome audio. */
export function shouldOfferAudioHandoff() {
  if (typeof window === 'undefined' || !window.isSecureContext) return false
  if (!navigator?.mediaDevices?.getUserMedia) return false
  return isIOSOrIPadOS() || isIOSAddToHomeScreenPWA()
}
