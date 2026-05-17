import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/space-grotesk/index.css'
import './index.css'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

const rootEl = document.getElementById('root')

function showFatal(message) {
  if (!rootEl) return
  const esc = String(message ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  rootEl.innerHTML = `<div style="box-sizing:border-box;padding:max(24px,env(safe-area-inset-top));font-family:system-ui,Segoe UI,sans-serif;background:#0b0c0e;color:#e3e2e5;min-height:100vh;line-height:1.5"><h1 style="margin:0 0 12px;font-size:18px;font-weight:600">Can't start app</h1><p style="margin:0 0 12px;font-size:14px;opacity:.92">${esc}</p><p style="margin:0;font-size:12px;opacity:.65">Try a hard refresh (clear cache). If this persists, open the browser console and report this error.</p></div>`
}

async function boot() {
  if (!rootEl) {
    console.error('Metronome: missing #root')
    return
  }

  const hasClientEnv =
    Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)

  try {
    if (!hasClientEnv) {
      const { default: ConfigMissing } = await import('./components/ConfigMissing.jsx')
      createRoot(rootEl).render(
        <StrictMode>
          <ConfigMissing />
        </StrictMode>,
      )
      return
    }

    const [{ default: App }, { AuthProvider }] = await Promise.all([
      import('./App.jsx'),
      import('./context/AuthProvider.jsx'),
    ])

    createRoot(rootEl).render(
      <StrictMode>
        <AppErrorBoundary>
          <AuthProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </AppErrorBoundary>
      </StrictMode>,
    )
  } catch (e) {
    console.error('Metronome bootstrap failed:', e)
    showFatal(e?.message || e || 'Unknown error')
  }
}

void boot()
