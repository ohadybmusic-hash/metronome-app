import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const hasClientEnv =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!hasClientEnv) {
  const { default: ConfigMissing } = await import('./components/ConfigMissing.jsx')
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ConfigMissing />
    </StrictMode>,
  )
} else {
  const [{ default: App }, { AuthProvider }] = await Promise.all([import('./App.jsx'), import('./context/AuthProvider.jsx')])
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
}
