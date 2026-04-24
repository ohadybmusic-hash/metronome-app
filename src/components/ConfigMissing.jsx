/**
 * Shown when VITE_* Supabase client env is missing (e.g. not set in Vercel for production build).
 * Without this, supabaseClient.js throws before any UI renders = blank page.
 */
export default function ConfigMissing() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#12110f] p-6 font-sans text-[#fafaf9]"
      role="status"
    >
      <h1 className="text-center text-lg font-semibold">App configuration</h1>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-[#a8a29e]">
        The browser build is missing Supabase settings. In{' '}
        <strong className="text-[#fafaf9]">Vercel → your project → Settings → Environment Variables</strong>,
        add <code className="text-[#c8440a]">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-[#c8440a]">VITE_SUPABASE_ANON_KEY</code> (from Supabase → Project Settings →
        API, use the <em>anon public</em> key). Apply to <strong>Production</strong> and{' '}
        <strong>Preview</strong>, then <strong>Redeploy</strong> — Vite bakes these in at build time.
      </p>
    </div>
  )
}
