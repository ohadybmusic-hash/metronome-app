/**
 * One-off: send Supabase password recovery email (uses anon key + Auth API).
 * Usage: node scripts/send-password-reset.mjs you@email.com [redirectOrigin]
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = join(__dirname, '..', '.env')
  const env = {}
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
  return env
}

const email = String(process.argv[2] || '').trim()
if (!email) {
  console.error('Usage: node scripts/send-password-reset.mjs <email> [redirectOrigin]')
  process.exit(1)
}

const redirectOrigin = String(process.argv[3] || 'https://metronome-app-rho.vercel.app').replace(/\/$/, '')
const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, anon)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${redirectOrigin}/`,
})

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

console.log('Password reset email sent (if the account exists). Check inbox and spam.')
console.log('Redirect URL used:', `${redirectOrigin}/`)
