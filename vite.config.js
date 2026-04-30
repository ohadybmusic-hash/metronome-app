import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const preconnect = (() => {
    const u = String(env.VITE_SUPABASE_URL || '').trim()
    if (!u) return ''
    try {
      const origin = new URL(u).origin
      if (!origin.startsWith('http')) return ''
      return `\n    <link rel="preconnect" href="${origin}" />\n    <link rel="dns-prefetch" href="${origin}" />`
    } catch {
      return ''
    }
  })()
  return {
    plugins: [
      react(),
      {
        name: 'inject-supabase-preconnect',
        transformIndexHtml(html) {
          if (!preconnect) return html
          return html.replace('<head>', `<head>${preconnect}`)
        },
      },
    ],
    resolve: {
      alias: {
        // Must live under this app directory so Vercel (root = metronome-app) ships the sources.
        '@synth': path.join(__dirname, 'synth-app', 'src'),
      },
    },
    server: {
      fs: {
        allow: [__dirname],
      },
    },
  }
})
