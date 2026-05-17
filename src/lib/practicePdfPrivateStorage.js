import { supabase } from './supabaseClient.js'

/**
 * Private practice-PDF storage bucket.
 *
 * Two layouts coexist inside the bucket:
 *   - `royzivgsb/<filename>`    curated, admin-uploaded, read-gated by `allowed_pdf_users`
 *   - `<auth.uid()>/<filename>` per-user uploads, full CRUD for the owner
 *
 * RLS is defined in supabase/practice_pdfs_private_bucket.sql + per_user_pdf_uploads.sql.
 */
const PRIVATE_BUCKET = 'practice-pdfs-private'

/**
 * Resolve a public `/practice-pdfs/.../foo.pdf` path OR a bare storage key
 * (`<uid>/foo.pdf`) to a short-lived signed URL. Falls back to the input value
 * on any error so existing public-path fallbacks keep working during transition.
 *
 * @param {string} pathOrKey   "/practice-pdfs/royzivgsb/..." OR "<uid>/foo.pdf"
 * @param {number} [expiresIn] seconds; default 1 hour
 * @returns {Promise<string>} a URL the browser can open
 */
export async function resolvePracticePdfUrl(pathOrKey, expiresIn = 60 * 60) {
  if (!pathOrKey || typeof pathOrKey !== 'string') return pathOrKey
  // If it's already an absolute URL, pass through.
  if (/^https?:\/\//i.test(pathOrKey)) return pathOrKey

  // Convert legacy public path → storage key.
  const key = pathOrKey.startsWith('/practice-pdfs/')
    ? pathOrKey.replace(/^\/practice-pdfs\//, '')
    : pathOrKey.replace(/^\/+/, '')

  try {
    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(key, expiresIn)
    if (error || !data?.signedUrl) {
      return pathOrKey
    }
    return data.signedUrl
  } catch {
    return pathOrKey
  }
}

/**
 * Build the per-user folder prefix in the bucket. Returns null if not signed in.
 * @param {object | null | undefined} user  the Supabase auth user
 */
export function userPdfFolder(user) {
  const id = user?.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

/**
 * List the current user's uploaded PDFs.
 * @param {object} user  the Supabase auth user
 * @returns {Promise<Array<{ name: string, key: string, size: number, updatedAt: string }>>}
 */
export async function listUserPracticePdfs(user) {
  const folder = userPdfFolder(user)
  if (!folder) return []
  const { data, error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .list(folder, { limit: 500, sortBy: { column: 'updated_at', order: 'desc' } })
  if (error || !Array.isArray(data)) return []
  return data
    .filter((f) => f?.name && !f.name.endsWith('/'))
    .map((f) => ({
      name: f.name,
      key: `${folder}/${f.name}`,
      size: f.metadata?.size ?? 0,
      updatedAt: f.updated_at ?? f.created_at ?? '',
    }))
}

/**
 * Upload a PDF File/Blob to the current user's folder.
 * @param {object} user
 * @param {File | Blob} file  must be a PDF
 * @param {string} [filename] override the storage filename (defaults to file.name)
 * @returns {Promise<{ key: string, error: string | null }>}
 */
export async function uploadUserPracticePdf(user, file, filename) {
  const folder = userPdfFolder(user)
  if (!folder) return { key: '', error: 'Not signed in' }
  if (!file) return { key: '', error: 'No file provided' }
  const type = (file.type || '').toLowerCase()
  if (type && type !== 'application/pdf') {
    return { key: '', error: 'Only PDF files are allowed' }
  }
  const rawName = filename || file.name || 'sheet.pdf'
  const safeName = rawName
    .replace(/[^\w.\-+()\s]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const key = `${folder}/${safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`}`
  const { error } = await supabase.storage
    .from(PRIVATE_BUCKET)
    .upload(key, file, { contentType: 'application/pdf', upsert: true })
  if (error) return { key, error: error.message || 'Upload failed' }
  return { key, error: null }
}

/**
 * Delete one of the current user's uploaded PDFs.
 * @param {object} user
 * @param {string} key  e.g. "<uid>/sheet.pdf"
 */
export async function deleteUserPracticePdf(user, key) {
  const folder = userPdfFolder(user)
  if (!folder) return { error: 'Not signed in' }
  if (!key || !key.startsWith(`${folder}/`)) return { error: 'Forbidden' }
  const { error } = await supabase.storage.from(PRIVATE_BUCKET).remove([key])
  return { error: error?.message || null }
}
