import { supabase } from './supabaseClient.js'

/**
 * Private practice-PDF storage bucket. Files are organized as `<libraryId>/<filename.pdf>`.
 * RLS gates access via the public.allowed_pdf_users table (see supabase/practice_pdfs_private_bucket.sql).
 */
const PRIVATE_BUCKET = 'practice-pdfs-private'

/**
 * Resolve a static `/practice-pdfs/.../foo.pdf` path to a short-lived signed URL
 * from the private bucket. Falls back to the original public path on any error
 * (e.g. bucket not yet populated, network failure) so the app keeps working
 * during the transition.
 *
 * @param {string} publicPath  e.g. "/practice-pdfs/royzivgsb/lick-1-tabs.pdf"
 * @param {number} [expiresIn] seconds; default 1 hour
 * @returns {Promise<string>} a URL the browser can open
 */
export async function resolvePracticePdfUrl(publicPath, expiresIn = 60 * 60) {
  if (!publicPath || typeof publicPath !== 'string') return publicPath
  if (!publicPath.startsWith('/practice-pdfs/')) return publicPath

  // Strip the leading "/practice-pdfs/" — the rest is the storage key.
  const key = publicPath.replace(/^\/practice-pdfs\//, '')

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(key, expiresIn)
    if (error || !data?.signedUrl) {
      return publicPath
    }
    return data.signedUrl
  } catch {
    return publicPath
  }
}
