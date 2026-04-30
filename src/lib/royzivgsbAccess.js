/** Lowercased emails allowed to see the ROYZIVGSB sheet library in Practice. */
const ROYZIVGSB_ALLOWED_EMAILS = new Set(
  ['ohadybmusic@gmail.com', 'baston123@gmail.com'].map((e) => e.trim().toLowerCase()),
)

/**
 * Gate for bundled course PDFs and the private practice log (session entries sync in user_data).
 * UI only for PDFs — files under /practice-pdfs/royzivgsb/ remain reachable by direct URL
 * unless you move them to private storage + signed URLs.
 */
export function canAccessRoyzivGsbSheetLibrary(email) {
  if (!email) return false
  return ROYZIVGSB_ALLOWED_EMAILS.has(String(email).trim().toLowerCase())
}
