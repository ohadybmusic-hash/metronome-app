/**
 * One-off: bulk-upload PDFs from public/practice-pdfs/royzivgsb/ into the
 * private Supabase Storage bucket `practice-pdfs-private`.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment (do NOT commit it).
 * The service role is required to write to a private bucket on behalf of admins.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/upload-practice-pdfs.mjs
 *
 * Idempotent: existing files are upserted, so re-runs are safe.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  const env = {}
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      const k = t.slice(0, i).trim()
      let v = t.slice(i + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      env[k] = v
    }
  } catch {
    /* .env optional — values may come from process.env directly */
  }
  return env
}

const envFile = loadEnv()
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || envFile.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL (in .env or environment)')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Get it from Supabase → Settings → API.')
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/upload-practice-pdfs.mjs')
  process.exit(1)
}

const BUCKET = 'practice-pdfs-private'
const ROOT = join(__dirname, '..', 'public', 'practice-pdfs')

function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) out.push(...walk(full))
    else if (s.isFile() && name.toLowerCase().endsWith('.pdf')) out.push(full)
  }
  return out
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const files = walk(ROOT)
if (files.length === 0) {
  console.error(`No PDFs found under ${ROOT}`)
  process.exit(1)
}

console.log(`Uploading ${files.length} file(s) to bucket "${BUCKET}"...`)

let ok = 0
let failed = 0
for (const filePath of files) {
  const key = relative(ROOT, filePath).replaceAll('\\', '/')
  // Wrap as a Uint8Array-backed Blob. Passing a raw Node Buffer triggers a
  // UTF-8 → ByteString conversion inside @supabase/supabase-js, which crashes
  // on PDFs containing non-ASCII bytes (e.g. the U+2192 "→" arrow at offset 21
  // of certain PDF metadata streams).
  const buf = readFileSync(filePath)
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, blob, { contentType: 'application/pdf', upsert: true })
  if (error) {
    console.error(`  ✗ ${key}: ${error.message}`)
    failed += 1
  } else {
    console.log(`  ✓ ${key}`)
    ok += 1
  }
}

console.log(`\nDone. ${ok} uploaded, ${failed} failed.`)
if (failed > 0) process.exit(1)
