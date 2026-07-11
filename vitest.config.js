import { defineConfig } from 'vitest/config'

// Standalone config so unit tests don't load the app's build/PWA plugins.
// Tests target pure logic (no DOM), so the fast Node environment is enough.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    globals: false,
  },
})
