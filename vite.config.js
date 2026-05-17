import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
      VitePWA({
        // App already ships its own /manifest.webmanifest — don't double-emit.
        manifest: false,
        injectRegister: 'auto',
        registerType: 'autoUpdate',
        workbox: {
          // Cap precache file size — large pdf.worker chunks blow past the default 2MB.
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,woff2,wav,mp3}'],
          // Don't take over routes Supabase or external fonts handle.
          navigateFallbackDenylist: [/^\/api\//, /supabase\.co/],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'gfonts-stylesheets' },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'gfonts-files',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase API: prefer network, fall back to cache when offline.
              urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Practice PDFs served from same origin under /practice-pdfs/.
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith('/practice-pdfs/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'practice-pdfs',
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        // Must live under this app directory so Vercel (root = metronome-app) ships the sources.
        '@synth': path.join(__dirname, 'synth-app', 'src'),
      },
    },
    server: {
      host: true,
      fs: {
        allow: [__dirname],
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('@supabase')) return 'supabase'
          },
        },
      },
    },
  }
})
