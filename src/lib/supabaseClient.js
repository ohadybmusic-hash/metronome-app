import { createClient } from '@supabase/supabase-js'

// Trim so accidental whitespace in Vite/Vercel env does not break fetch (Safari is strict about URLs).
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail fast in dev if env vars are missing.
  throw new Error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env file.',
  )
}

const authOptions = {
  flowType: 'pkce',
  autoRefreshToken: true,
  detectSessionInUrl: true,
  persistSession: true,
}

// Authenticated client (persists session, used for user-specific tables).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions })

// Public client (no persisted session) to avoid auth-token storage locks for anon queries.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...authOptions,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

