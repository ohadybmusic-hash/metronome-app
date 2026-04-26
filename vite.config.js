import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
