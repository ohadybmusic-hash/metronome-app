/**
 * Shown when VITE_* Supabase client env is missing (e.g. not set in Vercel for production build).
 * Without this, supabaseClient.js throws before any UI renders = blank page.
 */
export default function ConfigMissing() {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-background p-6 font-inter text-on-background"
      role="status"
    >
      <h1 className="text-center text-lg font-semibold">App configuration</h1>
      <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-on-surface-variant">
        The browser build is missing Supabase settings. In{' '}
        <strong className="text-on-surface">Vercel → your project → Settings → Environment Variables</strong>,
        add <code className="text-primary">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-primary">VITE_SUPABASE_ANON_KEY</code> (from Supabase → Project Settings →
        API, use the <em>anon public</em> key). Apply to <strong>Production</strong> and{' '}
        <strong>Preview</strong>, then <strong>Redeploy</strong> — Vite bakes these in at build time.
      </p>
    </div>
  )
}
